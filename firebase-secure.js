const runtimeConfig = window.__GVCN_RUNTIME_CONFIG__ || {};
const firebaseConfig = runtimeConfig.firebase;
const appId = runtimeConfig.appId || 'so-tay-gvcn-7n';
const classId = runtimeConfig.classId || '7n';

window.cloudAppId = appId;
window.cloudClassId = classId;
window.simpleLoginEnabled = runtimeConfig.simpleLogin === true;
window.secureMode = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId && firebaseConfig?.appId);
window.cloudReady = false;
window.cloudUser = null;
window.cloudMembership = null;

if (!window.secureMode) {
  window.useCloud = false;
  window.cloudReady = true;
  window.startApp?.();
} else {
  try {
    const [firebaseApp, firebaseAuth, firebaseFirestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'),
    ]);

    const { initializeApp } = firebaseApp;
    const {
      getAuth,
      onAuthStateChanged,
      sendPasswordResetEmail,
      signInWithEmailAndPassword,
      signInWithCustomToken,
      setPersistence,
      browserSessionPersistence,
      browserLocalPersistence,
      signOut,
    } = firebaseAuth;
    const {
      addDoc,
      collection,
      doc,
      getDoc,
      getDocFromServer,
      getDocs,
      getFirestore,
      limit,
      onSnapshot,
      orderBy,
      query,
      runTransaction,
      serverTimestamp,
      setDoc,
      writeBatch,
    } = firebaseFirestore;

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const memberRef = uid => doc(db, 'artifacts', appId, 'members', uid);
    const permissionSignalRef = doc(db, 'artifacts', appId, 'classes', classId, 'permissionSignals', 'current');
    const stateRef = doc(db, 'artifacts', appId, 'classes', classId, 'state', 'main');
    const backupsRef = collection(db, 'artifacts', appId, 'classes', classId, 'backups');
    const auditRef = collection(db, 'artifacts', appId, 'classes', classId, 'auditLogs');
    const studentViewRef = studentId => doc(db, 'artifacts', appId, 'classes', classId, 'studentViews', String(studentId));

    // Giới hạn toàn bộ bước đọc membership và kiểm tra token; không bỏ qua xác thực.
    const getMembership = async (uid, forceServer = false) => {
      let timer;
      try {
        return await Promise.race([
          readMembership(uid, forceServer),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              const error = new Error('Quá thời gian kiểm tra quyền tài khoản. Hãy kiểm tra kết nối và đăng nhập lại.');
              error.code = 'auth/membership-timeout';
              reject(error);
            }, 15000);
          }),
        ]);
      } finally { clearTimeout(timer); }
    };
    const readMembership = async (uid, forceServer = false) => {
      const snapshot = await (forceServer ? getDocFromServer : getDoc)(memberRef(uid));
      if (!snapshot.exists()) return null;
      const data = { id: snapshot.id, ...snapshot.data() };
      if (data.authMode === 'simple') {
        const token = await auth.currentUser?.getIdTokenResult();
        if (auth.currentUser?.uid !== uid || token?.claims.accessVersion !== data.accessVersion) return null;
      }
      return data;
    };

    const apiPost = async (endpoint, body, token) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch(`/.netlify/functions/${endpoint}`, {
          method: 'POST', signal: controller.signal, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        if (!response.headers.get('content-type')?.includes('application/json')) {
          const error = new Error('Máy chủ trả về dữ liệu không hợp lệ. GVCN cần kiểm tra đã triển khai đầy đủ Netlify Functions cùng website.');
          error.status = response.status;
          throw error;
        }
        const result = await response.json();
        if (!response.ok) {
          const wait = Number(response.headers.get('retry-after'));
          const error = new Error((result.error || 'Không thể xử lý yêu cầu.') + (wait > 0 ? ` Thử lại sau khoảng ${Math.ceil(wait / 60)} phút.` : ''));
          error.status = response.status;
          error.code = result.code || '';
          throw error;
        }
        return result;
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('Kết nối mất quá nhiều thời gian. Hãy thử lại.');
        if (error instanceof TypeError) throw new Error('Chưa kết nối được máy chủ. Kiểm tra mạng rồi bấm Thử lại để tải danh sách.');
        throw error;
      } finally { clearTimeout(timer); }
    };

    const authorizedPost = async (endpoint, body) => {
      const user = auth.currentUser;
      if (!user) throw new Error('Hãy đăng nhập trước.');
      let timer, expired = false;
      try {
        return await Promise.race([
          (async () => {
            const token = await user.getIdToken();
            if (expired || auth.currentUser?.uid !== user.uid) throw new Error('Phiên đăng nhập đã thay đổi.');
            return apiPost(endpoint,body,token);
          })(),
          new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error('Kết nối quá lâu. Bấm Thử lại để tải dữ liệu; nếu vừa lưu, hãy tải lại danh sách để kiểm tra kết quả.'));},30000);})
        ]);
      } catch(error) {
        if(error.code === 'auth/network-request-failed') throw new Error('Chưa xác thực được kết nối. Kiểm tra mạng rồi Thử lại.');
        throw error;
      } finally {clearTimeout(timer);}
    };

    // A normal Firebase refresh cannot grant a newer custom accessVersion.
    // If the teacher revoked/changed that version, require a fresh credential login.
    const refreshSession = async () => {
      const user = auth.currentUser;
      const sessionError = () => Object.assign(new Error('Phiên đăng nhập hoặc quyền đã thay đổi. Hãy đăng nhập lại.'), {status:401, code:'SESSION_CHANGED'});
      if (!user) throw sessionError();
      let timer;
      const fresh = await Promise.race([
        (async () => {
          await user.getIdToken(true);
          if (auth.currentUser?.uid !== user.uid) throw sessionError();
          const membership = await getMembership(user.uid, true);
          if (!membership?.active) throw sessionError();
          return membership;
        })(),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('Chưa làm mới được phiên đăng nhập. Kiểm tra mạng rồi thử lại.'), {code:'SESSION_REFRESH_TIMEOUT'})),25000);})
      ]).finally(()=>clearTimeout(timer));
      if (auth.currentUser?.uid !== user.uid) throw sessionError();
      window.cloudMembership = fresh;
      return fresh;
    };

    const subscribePermissionChanges = (onChange, onError) => {
      const uid = auth.currentUser?.uid;
      if (!uid) return () => {};
      let closed = false;
      const seen = new Map();
      const watch = (key, ref) => onSnapshot(ref, snapshot => {
        if (closed || auth.currentUser?.uid !== uid || snapshot.metadata?.hasPendingWrites) return;
        const signature = JSON.stringify(snapshot.data() || null);
        if (seen.get(key) === signature) return;
        seen.set(key, signature); onChange();
      }, error => { if (!closed) onError?.(error); });
      const memberStop = watch('member', memberRef(uid));
      const signalStop = watch('permission', permissionSignalRef);
      return () => { closed = true; memberStop(); signalStop(); };
    };

    window.cloudServices = {
      subscribePermissionChanges,
      refreshSession,
      signIn: async (email, password) => {
        await setPersistence(auth, browserLocalPersistence);
        return signInWithEmailAndPassword(auth, email, password);
      },
      signInSimple: async (kind, credential) => {
        if (!window.simpleLoginEnabled) throw new Error('Đăng nhập đơn giản chưa được bật.');
        const { token } = await apiPost('simple-login', { kind, credential });
        await setPersistence(auth, browserSessionPersistence);
        return signInWithCustomToken(auth, token);
      },
      accessAdmin: body => authorizedPost('access-admin',body),
      deputy: body => authorizedPost('deputy',body),
      signOut: () => signOut(auth),
      resetPassword: email => sendPasswordResetEmail(auth, email),
      getMembership,
      subscribeState: (onData, onError) => onSnapshot(stateRef, onData, onError),
      subscribeStudentView: (studentId, onData, onError) => onSnapshot(studentViewRef(studentId), onData, onError),
      saveState: state => {
        const expectedRevision = Number(window.cloudStateScoreRevision) || 0;
        return runTransaction(db, async transaction => {
          const current = await transaction.get(stateRef);
          const scoreRevision = Number(current.data()?.scoreRevision) || 0;
          // A retry after a lost response is already successful when the complete
          // server state matches. Preserve array order, but ignore object key order.
          const canonical = value => Array.isArray(value) ? value.map(canonical)
            : value && typeof value === 'object'
              ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
          if (current.data()?.state && JSON.stringify(canonical(current.data().state)) === JSON.stringify(canonical(state))) {
            return { scoreRevision, alreadyCommitted: true };
          }
          if (scoreRevision !== expectedRevision) {
            window.scoreSyncConflict = { state: current.data().state, revision: scoreRevision };
            const error = new Error('Điểm vừa được cập nhật từ thiết bị khác. Bản nhập được giữ lại; hãy tải dữ liệu mới trước khi lưu để tránh ghi đè điểm.');
            error.code = 'cloud/revision-conflict';
            throw error;
          }
          transaction.set(stateRef, { state, scoreRevision: scoreRevision + 1, updatedAt: new Date().toISOString(), updatedBy: auth.currentUser?.uid || '' });
          if (window.cloudMembership?.role === 'gvcn') {
            transaction.set(permissionSignalRef, {revision:scoreRevision + 1,updatedAt:new Date().toISOString()});
          }
          return { scoreRevision: scoreRevision + 1 };
        });
      },
      saveStudentViews: async views => {
        // A delayed publisher must not replace the fresh score just written by the deputy API.
        return runTransaction(db, async transaction => {
          const current = await transaction.get(stateRef);
          views.slice(0, 450).forEach(view => {
            const latest = current.data()?.state?.students?.find(s => String(s.id) === String(view.studentId));
            const projected = view.state?.students?.find(s => String(s.id) === String(view.studentId));
            if (!latest || !projected || latest.points !== projected.points || JSON.stringify(latest.history || []) !== JSON.stringify(projected.history || [])) return;
            transaction.set(studentViewRef(view.studentId), {
            state: view.state,
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser?.uid || '',
            });
          });
        });
      },
      createBackup: payload => addDoc(backupsRef, {
        ...payload,
        actorUid: auth.currentUser?.uid || '',
        serverCreatedAt: serverTimestamp(),
      }),
      listBackups: async (maxItems = 30) => {
        const snapshot = await getDocs(query(backupsRef, orderBy('createdAt', 'desc'), limit(maxItems)));
        return snapshot.docs.map(item => ({ id: item.id, source: 'cloud', ...item.data() }));
      },
      getBackup: async backupId => {
        const snapshot = await getDoc(doc(backupsRef, backupId));
        return snapshot.exists() ? { id: snapshot.id, source: 'cloud', ...snapshot.data() } : null;
      },
      addAudit: entry => addDoc(auditRef, {
        ...entry,
        actorUid: auth.currentUser?.uid || '',
        serverCreatedAt: serverTimestamp(),
      }),
      listAudit: async (maxItems = 100) => {
        const snapshot = await getDocs(query(auditRef, orderBy('createdAt', 'desc'), limit(maxItems)));
        return snapshot.docs.map(item => ({ id: item.id, source: 'cloud', ...item.data() }));
      },
    };

    window.useCloud = true;
    window.cloudDb = db;

    let authGeneration = 0;
    onAuthStateChanged(auth, async user => {
      const generation = ++authGeneration;
      window.cloudReady = false;
      let authErrorCode = '';
      let membership = null;
      let authError = '';

      if (user) {
        try {
          membership = await getMembership(user.uid);
          if (!membership?.active) authError = 'Tài khoản chưa được cấp quyền hoặc đã bị khóa.';
        } catch (error) {
          console.error('Membership lookup failed:', error);
          authError = error?.code === 'auth/membership-timeout' ? error.message : 'Không thể kiểm tra quyền tài khoản.';
          authErrorCode = error?.code || 'auth/membership-failed';
        }
      }

      // Kết quả chậm của phiên cũ không được ghi đè phiên vừa đổi/đăng xuất.
      if (generation !== authGeneration || auth.currentUser?.uid !== user?.uid) return;
      window.cloudAuthErrorCode = authErrorCode;
      window.cloudUser = user || null;
      window.cloudMembership = membership?.active ? membership : null;
      window.cloudReady = true;

      if (typeof window.handleCloudAuthState === 'function') {
        window.handleCloudAuthState(window.cloudUser, window.cloudMembership, authError);
      } else {
        window.startApp?.();
      }
    });
  } catch (error) {
    console.error('Secure Firebase initialization failed:', error);
    window.useCloud = false;
    // Giữ chế độ khóa an toàn: lỗi tải Firebase không được phép rơi về
    // cơ chế dữ liệu/mật khẩu cục bộ cũ.
    window.secureMode = true;
    window.cloudReady = true;
    window.cloudInitError = error?.message || 'Không thể khởi tạo Firebase.';
    window.startApp?.();
  }
}
