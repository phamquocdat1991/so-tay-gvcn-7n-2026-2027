import { AccessError, LOGIN_ERROR, digest, managedUid, validateCredential, readRoster, officerFor,
  newOfficerPassword, validateOfficerPassword, newStudentCode, ipBucket, nextLimit, studentView } from './access-model.mjs';
import { createDeputyService } from './deputy-service.mjs';

// All credentials and limit counters are server-only. No plaintext password is stored.
export function createAccessService({ db, auth, secret, appId, classId, clock = Date.now }) {
  const root = db.collection('artifacts').doc(appId);
  const classes = root.collection('classes').doc(classId);
  const stateRef = classes.collection('state').doc('main');
  const accounts = root.collection('_accessAccounts');
  const lookups = root.collection('_accessLookups');
  const limits = root.collection('_accessLimits');
  const members = root.collection('members');
  const uidFor = (kind, studentId) => managedUid(appId, classId, kind, studentId);
  const hashFor = (kind, credential) => `${classId}_${kind}_${digest(secret, kind, credential)}`;
  const stamp = () => new Date(clock()).toISOString();
  function member(account) {
    return { active: account.active, role: account.kind, studentId: account.studentId,
      displayName: account.displayName, authMode: 'simple', classId, accessVersion: account.version,
      permissionRevision:Number(account.permissionRevision)||0,
      ...(account.kind === 'to_pho' ? { groupId: account.groupId } : {}) };
  }
  function assignmentSnapshot(state, entries) {
    return entries.filter(a=>a.kind==='to_pho' && a.active===true && (state.students||[]).some(s=>String(s.id)===a.studentId && String(s.group)===a.groupId))
      .map(a=>({studentId:a.studentId,groupId:a.groupId,role:'to_pho',active:true}));
  }
  function saveAssignments(tx,state,snapshot,entries,actorUid) {
    const next=assignmentSnapshot(state,entries);
    if(JSON.stringify(state.deputyAssignments)!==JSON.stringify(next)) {
      state.deputyAssignments=next;
      tx.update(stateRef,{state,scoreRevision:(Number(snapshot.data().scoreRevision)||0)+1,updatedAt:stamp(),updatedBy:actorUid});
      tx.set(classes.collection('permissionSignals').doc('current'),{revision:(Number(snapshot.data().scoreRevision)||0)+1,updatedAt:stamp()});
    }
  }
  function audit(tx, actorUid, action, studentId = '') {
    tx.set(classes.collection('auditLogs').doc(), { actorUid, action, studentId, createdAt: stamp(),
      actorRole: 'gvcn', summary: action, level: 'info' });
  }
  async function requireAdmin(token) {
    if (!token) throw new AccessError(401, 'Hãy đăng nhập bằng tài khoản GVCN.');
    let user;
    try { user = await auth.verifyIdToken(token, true); } catch { throw new AccessError(401, 'Phiên đăng nhập đã hết hạn.'); }
    const snapshot = await members.doc(user.uid).get();
    const data = snapshot.data();
    if (!snapshot.exists || data?.active !== true || data.role !== 'gvcn' || data.authMode === 'simple' || (data.classId && data.classId !== classId)) throw new AccessError(403, 'Chỉ GVCN được quản lý quyền truy cập.');
    return user.uid;
  }
  async function consumeLimit(ip) {
    const now = clock();
    const refs = [limits.doc(`${classId}_ip_${digest(secret, 'ip', ipBucket(ip))}`), limits.doc(`${classId}_global`)];
    await db.runTransaction(async tx => {
      const old = await Promise.all(refs.map(ref => tx.get(ref)));
      // Limits include successful attempts. Shared school networks share the IP budget.
      const values = old.map((snap, i) => nextLimit(snap.data(), now, i === 0 ? 30 : 120, 5 * 60 * 1000));
      refs.forEach((ref, i) => tx.set(ref, { ...values[i], expiresAt: new Date(values[i].resetAt + 86400000) }));
    });
  }
  async function login({ kind, credential }, ip) {
    await consumeLimit(ip); // Even malformed guesses consume the server-side budget.
    validateCredential(kind, credential);
    let hash = hashFor(kind, credential);
    let lookup = await lookups.doc(hash).get();
    if (kind === 'bcs') {
      const deputyHash = hashFor('to_pho', credential);
      const deputyLookup = await lookups.doc(deputyHash).get();
      if (lookup.exists && deputyLookup.exists) throw new AccessError(401, LOGIN_ERROR);
      if (!lookup.exists && deputyLookup.exists) { kind = 'to_pho'; hash = deputyHash; lookup = deputyLookup; }
    }
    if (!lookup.exists || lookup.data().kind !== kind) throw new AccessError(401, LOGIN_ERROR);
    const uid = lookup.data().uid;
    const [accountSnap, memberSnap, stateSnap] = await Promise.all([accounts.doc(uid).get(), members.doc(uid).get(), stateRef.get()]);
    const account = accountSnap.data(), membership = memberSnap.data(), state = stateSnap.data()?.state;
    const student = state?.students?.find(s => String(s.id) === account?.studentId);
    if (!account || account.classId !== classId || account.kind !== kind || account.digest !== hash || !student ||
        account.active !== true || membership?.active !== true || membership.role !== kind || membership.authMode !== 'simple' ||
        membership.accessVersion !== account.version || membership.studentId !== account.studentId ||
        (kind === 'bcs' && !officerFor(state, account.studentId))) throw new AccessError(401, LOGIN_ERROR);
    // A removed or edited school code stops working immediately, even before GVCN syncs.
    if (kind === 'phhs' && hashFor(kind, String(student.code)) !== hash) throw new AccessError(401, LOGIN_ERROR);
    if (kind === 'to_pho' && (!account.groupId || account.groupId !== String(student.group) || membership.groupId !== account.groupId)) throw new AccessError(401, LOGIN_ERROR);
    const token = await auth.createCustomToken(uid, { accessVersion: account.version });
    return { token };
  }
  async function list(actorUid) {
    // Reconcile legacy assignments during the normal teacher account-list load.
    await db.runTransaction(async tx=>{
      const [snapshot,saved]=await Promise.all([tx.get(stateRef),tx.get(accounts.where('classId','==',classId))]);
      const state=snapshot.data()?.state;
      if(state) saveAssignments(tx,state,snapshot,saved.docs.map(d=>d.data()),actorUid);
    });
    const [stateSnap, saved] = await Promise.all([stateRef.get(), accounts.where('classId', '==', classId).get()]);
    const state = stateSnap.data()?.state || {};
    const entries = new Map(saved.docs.map(doc => [doc.id, doc.data()]));
    return { features: { compactDeputyAssignment: true, deputyAssignments: true, customOfficerPasswords: true, teacherPasswordAction: 'set-officer-password' }, students: (state.students || []).map(s => {
      const portal = entries.get(uidFor('phhs', s.id)), officer = entries.get(uidFor('bcs', s.id)), deputy = entries.get(uidFor('to_pho', s.id));
      const isDeputy = deputy && deputy.groupId === String(s.group) && (!officer?.active || deputy.active);
      return { officerKind: isDeputy ? 'to_pho' : 'bcs', id: String(s.id), name: s.name || '', code: String(s.code ?? ''),
        group: String(s.group || ''), deputyAccess: deputy ? (deputy.active ? 'active' : 'blocked') : 'missing',
        portal: portal ? (portal.active ? 'active' : 'blocked') : 'missing',
        officer: isDeputy ? `Tổ phó ${s.group}` : officerFor(state, s.id)?.title || '',
        officerAccess: isDeputy ? (deputy.active ? 'active' : 'blocked') : officer ? (officer.active ? 'active' : 'blocked') : 'missing' };
    }) };
  }
  async function sync(actorUid) {
    return db.runTransaction(async tx => {
      const [stateSnap, existing] = await Promise.all([tx.get(stateRef), tx.get(accounts.where('classId', '==', classId))]);
      const state = stateSnap.data()?.state;
      const students = readRoster(state);
      const old = new Map(existing.docs.map(d => [d.id, d.data()]));
      const activeIds = new Set(students.map(s => String(s.id)));
      const deletes = new Map(), writes = [];
      const set = (ref, value) => writes.push([ref, value]);
      for (const [uid, entry] of old) {
        const stillAssigned = entry.kind === 'to_pho'
          ? students.some(s => String(s.id) === entry.studentId && String(s.group) === entry.groupId)
          : entry.kind !== 'bcs' || Boolean(officerFor(state, entry.studentId));
        const pupil = students.find(s => String(s.id) === entry.studentId);
        if (pupil && entry.displayName !== pupil.name && stillAssigned && entry.kind !== 'phhs') {
          const refreshed = {...entry, displayName:pupil.name || '', updatedAt:stamp()};
          set(accounts.doc(uid), refreshed); set(members.doc(uid), member(refreshed));
          old.set(uid, refreshed);
        }
        if ((!activeIds.has(entry.studentId) || (entry.kind !== 'bcs' && !stillAssigned)) && entry.active) {
          const updated = { ...entry, active: false, version: entry.version + 1, updatedAt: stamp() };
          set(accounts.doc(uid), updated); set(members.doc(uid), member(updated));
          old.set(uid,updated);
        }
      }
      for (const student of students) {
        const studentId = String(student.id), uid = uidFor('phhs', studentId), previous = old.get(uid);
        const hash = hashFor('phhs', String(student.code));
        const changed = previous && previous.digest !== hash;
        const entry = { classId, kind: 'phhs', studentId, displayName: student.name || '', digest: hash,
          active: previous ? previous.active === true : true,
          version: previous ? previous.version + (changed ? 1 : 0) : 1, updatedAt: stamp() };
        if (changed) deletes.set(previous.digest, lookups.doc(previous.digest));
        set(accounts.doc(uid), entry); set(members.doc(uid), member(entry));
        set(lookups.doc(hash), { uid, kind: 'phhs' });
        set(classes.collection('studentViews').doc(studentId), { state: studentView(state, student), updatedAt: stamp(), updatedBy: actorUid });
      }
      if (writes.length + deletes.size + 1 > 450) throw new AccessError(409, 'Đợt đồng bộ quá lớn. Hãy liên hệ quản trị kỹ thuật.');
      // Delete old lookup keys first: this also handles swaps of two student codes atomically.
      for (const ref of deletes.values()) tx.delete(ref);
      for (const [ref, value] of writes) tx.set(ref, value);
      saveAssignments(tx,state,stateSnap,[...old.values()],actorUid);
      audit(tx, actorUid, 'access.sync');
      return { count: students.length };
    });
  }
  async function assignOfficer(actorUid, input) {
    if (typeof input.roleKey !== 'string' || typeof input.studentId !== 'string' || typeof input.expectedStudentId !== 'string') throw new AccessError(400, 'Thông tin phân công không hợp lệ.');
    return db.runTransaction(async tx => {
      const [snapshot, saved] = await Promise.all([tx.get(stateRef), tx.get(accounts.where('classId', '==', classId))]);
      const state = snapshot.data()?.state;
      const role = state?.officerRoles?.find(r => r.key === input.roleKey);
      const student = state?.students?.find(s => String(s.id) === input.studentId);
      if (!role || (input.studentId && !student)) throw new AccessError(400, 'Không tìm thấy chức vụ hoặc học sinh.');
      const previousId = String(role.assignedStudentId || '');
      if (previousId !== input.expectedStudentId) throw new AccessError(409, 'Phân công đã thay đổi trên thiết bị khác. Hãy tải lại và kiểm tra.');
      if (role.scope === 'group' && student && String(student.group) !== String(role.groupName)) throw new AccessError(400, 'Học sinh phải thuộc đúng tổ được phân công.');
      role.assignedStudentId = input.studentId;
      const normalizedTitle = String(role.title).trim().toLowerCase();
      for (const pupil of state.students) {
        const tags = String(pupil.role || '').split(/[,;\n]+/).map(t=>t.trim()).filter(t=>t && !/^(học sinh|thành viên)$/i.test(t) && t.toLowerCase() !== normalizedTitle);
        if (String(pupil.id) === input.studentId) tags.push(role.title);
        pupil.role = tags.join(', ') || 'Học sinh';
      }
      for (const record of saved.docs) {
        const entry = record.data();
        if (entry.kind !== 'bcs' || ![previousId,input.studentId].includes(entry.studentId)) continue;
        const pupil = state.students.find(s=>String(s.id)===entry.studentId);
        const changed = {...entry, displayName:pupil?.name || '', active:entry.active, version:entry.version, permissionRevision:(Number(entry.permissionRevision)||0)+1, updatedAt:stamp()};
        tx.set(accounts.doc(record.id),changed);tx.set(members.doc(record.id),member(changed));
      }
      tx.update(stateRef,{state,scoreRevision:(Number(snapshot.data().scoreRevision)||0)+1,updatedAt:stamp(),updatedBy:actorUid});
      tx.set(classes.collection('permissionSignals').doc('current'),{revision:(Number(snapshot.data().scoreRevision)||0)+1,updatedAt:stamp()});
      audit(tx,actorUid,'officer.assign.'+role.key,input.studentId);
      return {assigned:true,studentId:input.studentId,studentName:student?.name || '',title:role.title};
    });
  }
  async function mutate(actorUid, input) {
    if (input.action === 'assign-officer') return assignOfficer(actorUid,input);
    const { kind, studentId } = input;
    // A separate action fails closed on old deployments instead of being
    // interpreted as the legacy request that generates a random password.
    const teacherSet = input.action === 'set-officer-password';
    const action = teacherSet ? 'password' : input.action;
    if (typeof studentId !== 'string' || !studentId || studentId.length > 100 || !['phhs', 'bcs', 'to_pho'].includes(kind)) throw new AccessError(400, 'Thông tin học sinh không hợp lệ.');
    if (!['password', 'rotate-code', 'toggle'].includes(action) || (action === 'password' && !['bcs', 'to_pho'].includes(kind)) ||
        (action === 'rotate-code' && kind !== 'phhs') || (action === 'toggle' && typeof input.active !== 'boolean')) throw new AccessError(400, 'Thao tác không hợp lệ.');
    // Omitted password supports older deployed clients. An explicitly supplied
    // invalid/empty value must never silently create a random password instead.
    const customPassword = Object.hasOwn(input, 'password');
    if (teacherSet && !customPassword) throw new AccessError(400, 'Giáo viên cần nhập mật khẩu mới cho cán bộ lớp.');
    const password = action === 'password'
      ? (customPassword ? validateOfficerPassword(input.password) : newOfficerPassword())
      : null;
    return db.runTransaction(async tx => {
      const uid = uidFor(kind, studentId);
      const [stateSnap, accountSnap] = await Promise.all([tx.get(stateRef), tx.get(accounts.doc(uid))]);
      const state = stateSnap.data()?.state;
      const students = readRoster(state);
      const student = students.find(s => String(s.id) === studentId);
      if (!student) throw new AccessError(404, 'Không tìm thấy học sinh trong lớp.');
      const revokingOfficer = action === 'toggle' && input.active === false;
      if (kind === 'bcs' && !officerFor(state, studentId) && !revokingOfficer) throw new AccessError(409, 'Hãy phân công cán bộ lớp trước khi cấp hoặc mở quyền.');
      const previous = accountSnap.data();
      const groupId = String(student.group || '');
      if (kind === 'to_pho' && !groupId && !revokingOfficer) throw new AccessError(409, 'Hãy phân tổ học sinh trước khi cấp quyền Tổ phó.');
      // A deputy cannot retain a second full-class BCS credential.
      const counterpart = kind === 'to_pho' ? await tx.get(accounts.doc(uidFor('bcs', studentId)))
        : kind === 'bcs' ? await tx.get(accounts.doc(uidFor('to_pho', studentId))) : null;
      const memberships = kind === 'to_pho' ? await tx.get(members) : null;
      const replacingDeputy = kind === 'to_pho' && input.replaceGroupDeputy === true && !revokingOfficer;
      if (replacingDeputy && input.expectedGroup !== groupId) throw new AccessError(409, 'Tổ của học sinh đã thay đổi. Hãy tải lại danh sách trước khi phân công.');
      const groupAccounts = kind === 'to_pho' ? await tx.get(accounts.where('classId', '==', classId)) : null;
      const updatedAccounts = new Map((groupAccounts?.docs || []).map(d=>[d.id,d.data()]));
      if (kind === 'bcs' && counterpart?.data()?.active && !revokingOfficer) throw new AccessError(409, 'Hãy thu hồi quyền Tổ phó trước khi cấp quyền cán bộ toàn lớp.');
      if (action === 'toggle' && !previous) throw new AccessError(409, 'Tài khoản chưa được cấp quyền.');
      const code = action === 'rotate-code' ? newStudentCode(students) : String(student.code);
      const hash = action === 'password' ? hashFor(kind, password) : action === 'rotate-code' ? hashFor(kind, code) : previous.digest;
      if (action === 'password' && previous?.digest === hash) throw new AccessError(409, 'Mật khẩu mới trùng với mật khẩu hiện tại. Hãy chọn mật khẩu khác.');
      const collision = await tx.get(lookups.doc(hash));
      const otherOfficer = action === 'password' ? await tx.get(lookups.doc(hashFor(kind === 'bcs' ? 'to_pho' : 'bcs', password))) : null;
      if (otherOfficer?.exists) throw new AccessError(409, 'Mật khẩu này đã được dùng cho cán bộ khác. Hãy chọn mật khẩu riêng.');
      if (collision.exists && collision.data().uid !== uid) throw new AccessError(409,
        action === 'password' ? 'Mật khẩu này đã được dùng cho cán bộ khác. Hãy chọn mật khẩu riêng.' : 'Thông tin truy cập trùng. Hãy thử lại.');
      const entry = { classId, kind, studentId, displayName: student.name || '', digest: hash,
        ...(kind === 'to_pho' ? { groupId } : {}),
        active: action === 'toggle' ? input.active : action === 'password' ? true : previous ? previous.active : true,
        version: (previous?.version || 0) + 1, updatedAt: stamp() };
      if (previous?.digest && previous.digest !== hash) tx.delete(lookups.doc(previous.digest));
      tx.set(accounts.doc(uid), entry); tx.set(members.doc(uid), member(entry));
      updatedAccounts.set(uid,entry);
      tx.set(lookups.doc(hash), { uid, kind });
      if (replacingDeputy) for (const snapshot of groupAccounts.docs) {
        const old = snapshot.data();
        if (snapshot.id !== uid && old.kind === 'to_pho' && old.groupId === groupId && old.active) {
          const revoked = { ...old, active: false, version: old.version + 1, updatedAt: stamp() };
          updatedAccounts.set(snapshot.id,revoked);
          tx.set(accounts.doc(snapshot.id), revoked);
          tx.set(members.doc(snapshot.id), member(revoked));
          audit(tx, actorUid, 'access.replace.to_pho', old.studentId);
        }
      }
      if (kind === 'to_pho' && entry.active && counterpart?.data()?.active) {
        const oldOfficer = counterpart.data();
        const revoked = { ...oldOfficer, active: false, version: oldOfficer.version + 1, updatedAt: stamp() };
        tx.set(accounts.doc(uidFor('bcs', studentId)), revoked);
        tx.set(members.doc(uidFor('bcs', studentId)), member(revoked));
      }
      if (kind === 'to_pho' && entry.active) for (const snapshot of memberships.docs) {
        const oldMember = snapshot.data();
        if (snapshot.id !== uidFor('bcs', studentId) && oldMember.role === 'bcs' && String(oldMember.studentId) === studentId && (!oldMember.classId || oldMember.classId === classId)) {
          tx.set(members.doc(snapshot.id), { ...oldMember, active: false, accessVersion: (Number(oldMember.accessVersion) || 0) + 1 });
        }
      }
      if (kind === 'to_pho') saveAssignments(tx,state,stateSnap,[...updatedAccounts.values()],actorUid);
      if (action === 'rotate-code') {
        const nextState = { ...state, students: students.map(s => String(s.id) === studentId ? { ...s, code } : s) };
        tx.update(stateRef, { state: nextState, scoreRevision:(Number(stateSnap.data().scoreRevision)||0)+1, updatedAt: stamp(), updatedBy: actorUid });
        tx.set(classes.collection('studentViews').doc(studentId), { state: studentView(nextState, { ...student, code }), updatedAt: stamp(), updatedBy: actorUid });
      }
      audit(tx, actorUid, `access.${action}.${kind}`, studentId);
      // The new UI already knows the chosen password; do not echo it back.
      return password ? (customPassword ? { passwordSet: true } : { password }) : action === 'rotate-code' ? { code } : { active: entry.active };
    });
  }
  return { login, requireAdmin, list, sync, mutate,
    deputy: createDeputyService({ db, auth, appId, classId, clock }) };
}
