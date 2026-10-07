window.openDeputyWorkspace = async function() {
  'use strict';
  window.closeDeputyWorkspace?.();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const safeUuid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try { return crypto.randomUUID(); } catch (_) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };
  const app = document.getElementById('app');
  const member = window.cloudMembership;
  if (!app || !window.cloudUser || !['to_pho','bcs'].includes(member?.role)) return;
  app.innerHTML = '<main id="deputy-workspace" style="width:100%;height:100%;overflow:auto"><div class="deputy-inner"><header class="class-dashboard-header bcs-topbar"><div class="bcs-brand"><span class="bcs-brand-mark">7N</span><span>SỔ TAY GVCN<br><small>KHÔNG GIAN BAN CÁN SỰ</small></span></div><nav><button id="back" type="button">Về phân quyền</button><div class="bcs-profile"><span id="bcs-avatar" class="bcs-avatar" aria-hidden="true">BC</span><div><h1>Ban cán sự lớp</h1><small>TÀI KHOẢN HỌC SINH</small></div></div><button id="logout" type="button" aria-label="Đăng xuất tài khoản">Đăng xuất</button></nav></header><section class="page-banner bcs-hero" data-page-banner="overview" data-tone="sky" aria-labelledby="bcs-welcome"><div class="page-banner-body"><div class="overview-hero-card"><div id="bcs-hero-content"></div></div></div></section><p id="message" role="status" aria-live="polite">Đang tải dữ liệu được phân quyền…</p><div id="recovery" hidden></div><div id="content"></div></div></main>';

  const root = document.getElementById('deputy-workspace');
  root.querySelector('#bcs-hero-content').innerHTML = window.ClassDashboard.heroContent({title:'Chào mừng Ban cán sự lớp 7N!',kicker:'TRẠM HỌC TẬP 7N',subtitle:'KHÔNG GIAN BAN CÁN SỰ',description:'Đoàn kết – Tự tin – Tỏa sáng',student:true});
  const el = id => root.querySelector('#' + id);
  if (!document.getElementById('deputy-workspace-style')) {
    const style = document.createElement('style'); style.id = 'deputy-workspace-style';
    style.textContent = `
      #deputy-workspace{color:#183047;font:14px/1.5 system-ui,sans-serif}
      #deputy-workspace *{box-sizing:border-box}
      #deputy-workspace [hidden]{display:none!important}
      #deputy-workspace .recovery-card{max-width:640px;margin:24px auto;padding:24px;background:white;border:1px solid #f3cbd0;border-radius:16px}
      #deputy-workspace .recovery-card h2{margin:0 0 10px;color:#8a2638}
      #deputy-workspace .recovery-card p{overflow-wrap:anywhere}
      #deputy-workspace .recovery-card .actions{margin-top:18px}
      #deputy-workspace button:focus-visible{outline:3px solid #155d82;outline-offset:3px}
      @media(max-width:520px){#deputy-workspace .recovery-card{padding:18px}#deputy-workspace .recovery-card button{width:100%}}
      #deputy-workspace .deputy-inner{max-width:1100px;margin:24px auto;padding:0 16px}
      #deputy-workspace header,#deputy-workspace nav{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #deputy-workspace h1{font-size:26px;font-weight:800}#deputy-workspace h2{font-size:19px;font-weight:700}
      #deputy-workspace section,#deputy-workspace article{background:white;border:1px solid #dce5ee;border-radius:14px;padding:18px;margin:16px 0}
      #deputy-workspace label{display:block;margin:12px 0}
      #deputy-workspace input,#deputy-workspace select,#deputy-workspace textarea,#deputy-workspace button{font:inherit;border:1px solid #bacbd9;border-radius:8px;padding:10px;max-width:100%}
      #deputy-workspace input,#deputy-workspace select,#deputy-workspace textarea{width:100%;background:white}
      #deputy-workspace button{cursor:pointer;min-height:42px;background:#eef4fb;color:#164f7b}
      #deputy-workspace button.primary{background:#155d82;color:white}
      #deputy-workspace button:disabled{opacity:.5;cursor:wait}
      #deputy-workspace .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
      #deputy-workspace .actions{display:flex;gap:8px;flex-wrap:wrap}
      #deputy-workspace #message{position:sticky;top:8px;z-index:20;padding:12px;background:#eaf3ff;border-radius:10px}
      #deputy-workspace #message:empty{display:none}#deputy-workspace .error{color:#9b2424}
      #deputy-workspace details{margin:10px 0}#deputy-workspace summary{cursor:pointer;font-weight:600}
      #deputy-workspace .score{font-size:22px;font-weight:700;color:#155d82}
    `; document.head.appendChild(style);
  }
  if (!document.getElementById('deputy-dashboard-theme')) {
    const theme = document.createElement('link'); theme.id = 'deputy-dashboard-theme'; theme.rel = 'stylesheet'; theme.href = '/deputy-dashboard.css?v=direct-v1'; document.head.appendChild(theme);
  }
  el('back').remove();
  const ratings = { good:'Tốt (+5)', done:'Đạt (0)', incomplete:'Chưa đạt (-3)', absent:'Nghỉ trực (-5)' };
  const days = { mon:'Thứ Hai', tue:'Thứ Ba', wed:'Thứ Tư', thu:'Thứ Năm', fri:'Thứ Sáu', sat:'Thứ Bảy' };
  let data, rows = [], working = false, dirty = false, recoveryActive = false, sessionBlocked = false, leaving = false, selectedRoleKey = '', selectedPanel = '', permissionRefreshQueued = false, permissionRefreshTimer = null;
  root.addEventListener('input', () => { dirty = true; });
  root.addEventListener('change', () => { dirty = true; });
  const message = (text = '', error = false) => { el('message').textContent = text; el('message').classList.toggle('error', error); };
  const api = body => window.cloudServices.deputy({ ...body, ...(selectedRoleKey ? {roleKey:selectedRoleKey} : {}) });
  function showRecovery(error, savedMessage = '') {
    if (!root.isConnected || leaving) return;
    recoveryActive = true;
    const code = error.code || '';
    const session = ['SESSION_CHANGED','SESSION_EXPIRED','auth/user-token-expired','auth/invalid-user-token','auth/user-disabled'].includes(code) || error.status === 401;
    sessionBlocked = session;
    const assignment = ['ASSIGNMENT_CHANGED','ROLE_UNAVAILABLE'].includes(code) || /Phân công tổ/i.test(error.message || '');
    if ([401,403].includes(error.status)) {
      data = null; rows = []; dirty = false; el('content').innerHTML = '';
      root.querySelector('h1').textContent = 'Ban cán sự lớp';
      el('bcs-avatar').textContent = 'BC'; el('bcs-welcome').textContent = 'Chào mừng Ban cán sự lớp 7N!';
      el('bcs-scope').textContent = 'Đang chờ phân công hợp lệ';
    }
    message(savedMessage);
    el('recovery').hidden = false;
    el('recovery').innerHTML = `<section class="recovery-card" role="alert" aria-labelledby="recovery-title">
      <h2 id="recovery-title">${session ? 'Cần đăng nhập lại' : assignment ? 'Đang cập nhật phân công của bạn' : savedMessage ? 'Điểm đã lưu, chưa tải lại được dữ liệu' : 'Chưa tải được dữ liệu'}</h2>
      <p>${assignment ? 'Chức vụ của bạn đang được cập nhật. Trang sẽ tự chuyển khi nhận được phân công hợp lệ từ GVCN.' : esc(error.message || 'Kết nối tạm gián đoạn. Bạn có thể làm mới dữ liệu hoặc về màn hình đăng nhập.')}</p>
      <p>${savedMessage ? 'Máy chủ đã xác nhận lưu điểm. Không nhập lại bản ghi này; bấm Làm mới dữ liệu để xem điểm và lịch sử mới nhất.' : session ? 'Phiên đăng nhập đã hết hiệu lực hoặc tài khoản đã được khóa/đổi mật khẩu. Hãy đăng nhập lại bằng tài khoản riêng.' : assignment ? 'Bạn có thể ở lại trang này để nhận quyền mới tự động, làm mới dữ liệu hoặc thoát về trang đăng nhập.' : 'Nếu vừa bấm lưu, hãy kiểm tra dữ liệu sau khi kết nối lại trước khi gửi lần nữa.'}</p>
      <div class="bcs-cards"><button class="bcs-card bcs-mint" data-action="refresh">${icon('attendance')}<strong>Làm mới dữ liệu</strong><b>↻</b><small>Đọc lại phiên và phân công mới</small></button><button class="bcs-card bcs-lavender" data-action="login">${icon('roster')}<strong>Đăng nhập lại</strong><b>→</b><small>Dùng tài khoản riêng của bạn</small></button><button class="bcs-card bcs-pink" data-action="home">${icon('grades')}<strong>Về trang đăng nhập</strong><b>⌂</b><small>Thoát an toàn khỏi phiên hiện tại</small></button></div>
    </section>`;
  }
  async function leaveWorkspace() {
    if (leaving) return;
    if (dirty && !confirm('Nội dung chưa gửi trong biểu mẫu sẽ mất khi đăng xuất. Bạn muốn tiếp tục?')) return;
    leaving = true;
    try {
      await window.cloudServices.signOut();
      window.closeDeputyWorkspace?.();
      window.handleCloudAuthState?.(null, null);
    } catch (error) { leaving = false; showRecovery(error); }
  }
  async function run(fn) {
    if (working || leaving) return;
    working = true;
    const controls = [...root.querySelectorAll('#content button,#content input,#content select,#content textarea,#recovery button[data-action="refresh"]')].map(control=>[control,control.disabled]);
    controls.forEach(([control])=>{control.disabled=true;});
    try { await fn(); } catch (error) { showRecovery(error); }
    finally {
      working = false;
      if (permissionRefreshQueued && root.isConnected && !leaving) requestPermissionRefresh();
      if (root.isConnected) controls.forEach(([control,disabled])=>{if(root.contains(control)) control.disabled=disabled;});
    }
  }
  async function refresh() {
    if (dirty && !confirm('Nạp dữ liệu mới sẽ xóa nội dung chưa gửi. Tiếp tục?')) return;
    if (typeof window.cloudServices.refreshSession !== 'function') throw new Error('Website chưa được cập nhật đồng bộ. Hãy tải lại trang hoặc đăng nhập lại.');
    const fresh = await window.cloudServices.refreshSession();
    if (!root.isConnected || leaving) return;
    if (fresh.role !== member.role) { window.startApp(); return; }
    selectedRoleKey = '';
    await load();
    if (root.isConnected) message('Đã làm mới phiên đăng nhập và dữ liệu.');
  }
  const icon = window.ClassDashboard.icon;
  function scoreHistory() {
    const entries=(data.students || []).flatMap(student=>(student.history || []).map(entry=>({student,entry}))).sort((a,b)=>String(b.entry.date).localeCompare(String(a.entry.date))).slice(0,60);
    return `<div class="bcs-history-grid">${entries.map(({student,entry})=>`<article class="bcs-history-card"><div class="bcs-section-head"><strong>${esc(student.name)}</strong><span class="bcs-score-badge ${Number(entry.points)<0?'negative':''}">${Number(entry.points)>0?'+':''}${esc(entry.points)} đ</span></div><p>${esc(entry.reason)}</p><small>${esc(entry.category)} • ${esc(entry.performer)} • ${esc(String(entry.date || '').slice(0,10))}</small>${entry.canEdit?`<button type="button" data-action="edit-score" data-student="${esc(student.id)}" data-id="${esc(entry.id)}">Sửa bản ghi</button>`:''}</article>`).join('') || '<p>Chưa có điểm được ghi nhận trong phạm vi này.</p>'}</div>`;
  }
  function dashboardHtml() {
    const p = data.permissions || {}, students = data.students || [];
    const cards = [];
    const card = (id,title,value,note,tone) => cards.push(window.ClassDashboard.card({panel:id,title,value,note,tone,icon:id}));
    if (p.attendanceView) card('attendance','Điểm danh nhanh',`${students.filter(s=>['present','late'].includes(s.attendance)).length}/${students.length}`,'Có mặt / học sinh trong phạm vi','blue');
    if (p.scoresView) card('scores','Tổng điểm thi đua',students.reduce((sum,s)=>sum+(Number(s.points)||0),0),'Tổng hợp điểm trong phạm vi được giao','amber');
    if (p.roster) card('roster','Thành viên lớp',students.length,data.groupId ? `Danh sách ${data.groupId}` : 'Kết nối các thành viên lớp 7N','violet');
    if (p.points || p.scoreEdit) card('points','Nhập điểm trực tiếp','＋ / −','Lưu ngay theo quyền và phạm vi được giao','rose');
    if (p.dutyView) card('duty','Lịch trực nhật',data.duties.filter(d=>d.week===data.week).length,'Ca trực trong tuần được giao','green');
    if (p.grades) card('grades','Sổ điểm học tập','Aa','Nhập điểm theo quyền của bạn','orange');
    const groups = new Map();
    if(p.scoresView) students.forEach(s=>{const g=groups.get(s.group)||{count:0,points:0};g.count++;g.points+=Number(s.points)||0;groups.set(s.group,g);});
    const select = (data.availableRoles || []).length > 1 ? `<label class="bcs-role-select">Chức vụ đang sử dụng<select id="bcs-role-select">${data.availableRoles.map(r=>`<option value="${esc(r.key)}" ${r.key===data.selectedRoleKey?'selected':''}>${esc(r.title)} • ${esc(r.scope==='group'?r.groupName:'Toàn lớp')}</option>`).join('')}</select></label>` : '';
    return `<div class="bcs-section-head"><div><h2>Góc điều hành của bạn</h2><p>Những việc nhỏ, cùng tạo nên một tập thể tốt.</p></div><button data-action="refresh">Làm mới dữ liệu</button></div>${select}<div class="dashboard-card-grid">${cards.join('')}</div>${!cards.length?'<div class="bcs-empty">Chưa có chức năng được cấp cho vai trò này. Bạn vẫn có thể làm mới dữ liệu hoặc đăng xuất; GVCN sẽ kiểm tra phân công.</div>':''}
      ${p.scoresView?`<section data-panel="scores"><h2>Thi đua trong phạm vi của bạn</h2><p>Tổng điểm hiện tại của các học sinh được phép xem.</p><div class="bcs-groups">${[...groups].map(([name,g])=>`<div class="bcs-group"><strong>${esc(name)}</strong><b>${esc(g.points)} đ</b><small>${g.count} học sinh</small></div>`).join('')}</div><h3>Điểm vừa ghi nhận</h3>${scoreHistory()}</section>`:''}
      ${p.roster?`<section data-panel="roster"><h2>Thành viên ${esc(data.groupId || data.className || 'lớp 7N')}</h2>${students.map((s,i)=>`<div class="bcs-student"><span class="bcs-avatar" aria-hidden="true">${i+1}</span><div><strong>${esc(s.name)}</strong><small>${esc(s.group)}</small></div></div>`).join('') || '<p>Chưa có học sinh trong phạm vi được giao.</p>'}</section>`:''}`;
  }
  function showPanel(id) {
    const panel = [...root.querySelectorAll('#content [data-panel]')].find(p=>p.dataset.panel===id);
    if (!panel) return;
    selectedPanel = id;
    root.querySelectorAll('#content [data-panel]').forEach(p=>{p.id='bcs-panel-'+p.dataset.panel;p.hidden=p!==panel;});
    root.querySelectorAll('[data-panel-link]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panelLink===id)));
  }
  function installDashboardNavigation() {
    const first = root.querySelector('[data-panel-link]');
    if (first) showPanel(root.querySelector(`[data-panel="${selectedPanel}"]`) ? selectedPanel : first.dataset.panelLink);
    root.querySelectorAll('[data-panel-link]').forEach(b=>b.onclick=()=>showPanel(b.dataset.panelLink));
    const picker = el('bcs-role-select');
    if (picker) picker.onchange = event => {
      event.stopPropagation();
      if (working || dirty && !confirm('Đổi chức vụ sẽ bỏ nội dung biểu mẫu chưa gửi. Tiếp tục?')) {picker.value=selectedRoleKey;return;}
      selectedRoleKey=picker.value;selectedPanel='';
      void run(load);
    };
  }
  function renderDeputy() {
    const scoreCategories = (data.permissions?.categories && data.permissions.categories.length)
      ? data.permissions.categories
      : ['Học tập', 'Phong trào', 'Kỷ luật', 'Chuyên cần', 'Nề nếp'];
    el('content').innerHTML = dashboardHtml() + `
      ${data.permissions?.points || data.permissions?.scoreEdit ? `<section data-panel="points"><div class="bcs-section-head"><div><h2 id="score-form-title">Nhập điểm trực tiếp</h2><p>Điểm được cập nhật ngay sau khi lưu thành công.</p></div><span class="bcs-live">● Lưu trực tiếp</span></div>${!data.permissions.points?'<p>Chọn một bản ghi của bạn trong lịch sử điểm để chỉnh sửa.</p>':''}<form id="score-form" data-request="${safeUuid()}" ${!data.permissions.points?'hidden':''}><div class="grid"><label>Học sinh<select name="studentId">${data.students.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} • ${esc(s.group)}</option>`).join('')}</select></label><label>Điểm cộng / trừ<input name="points" type="number" min="-100" max="100" step="1" inputmode="numeric" value="2" required></label></div><label>Chuyên mục<select name="category">${scoreCategories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label>Lý do<textarea name="reason" required maxlength="500" placeholder="Ghi rõ thành tích hoặc nội dung cần nhắc nhở"></textarea></label><p><small>Giơ tay phát biểu: +2 điểm.</small></p><div class="actions"><button class="primary" type="submit">Lưu điểm ngay</button><button type="button" data-action="cancel-edit" hidden>Hủy sửa</button></div></form></section>` : ''}
      ${data.permissions?.dutyView ? `<section data-panel="duty"><h2>Trực nhật • Tuần ${esc(data.week)}</h2>${data.duties.filter(d => d.week === data.week).map(d => {
        const s = data.students.find(s => s.id === d.studentId);
        return `<form class="duty-form bcs-person-card" data-week="${esc(d.week)}" data-day="${esc(d.day)}" data-shift="${esc(d.shift)}" data-id="${esc(d.studentId)}"><h3>${esc(s?.name)} • ${esc(days[d.day])} • ${d.shift === 'morning' ? 'Buổi sáng' : 'Buổi chiều'}</h3>${!data.permissions.duty || d.teacherEvaluation?.status || d.evaluation?.teacherLocked ? (!data.permissions.duty ? '<p>Chỉ xem lịch trực nhật theo phân quyền được giao.</p>' : '<p>Ca trực/điểm đã được cán bộ phụ trách hoặc GVCN xử lý.</p>') : `<label>Đánh giá<select name="rating">${Object.entries(ratings).map(([key,label]) => `<option value="${key}" ${d.evaluation?.rating === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Lý do<textarea name="reason" required maxlength="500">${esc(d.evaluation?.reason || '')}</textarea></label><button>Lưu đánh giá / sửa lý do</button>`}</form>`;
      }).join('') || '<p>Tổ chưa có ca trực được phân công trong tuần.</p>'}</section>` : ''}`;
    if (el('score-form')) el('score-form').onsubmit = event => {
      event.preventDefault(); if (working || leaving) return; dirty=true; const form = event.target;
      // The student selector is locked while editing; use the original record binding.
      const values = Object.fromEntries(new FormData(form));
      if (form.dataset.studentId) values.studentId = form.dataset.studentId;
      run(async () => {
        await api({action:form.dataset.historyId?'score-edit':'score',...values,requestId:form.dataset.request || safeUuid(),historyId:form.dataset.historyId,expectedRecord:form.dataset.version});
        if (!root.isConnected || leaving) return;
        // A confirmed write must not become an unsent draft when the following read fails.
        dirty = false;
        try {
          await load();
          if (root.isConnected && !leaving) message('Đã lưu điểm trực tiếp và đồng bộ dữ liệu.');
        } catch (error) {
          if (!root.isConnected || leaving) return;
          renderDeputy();
          showRecovery(error, 'Đã lưu điểm trực tiếp. Đang chờ tải lại dữ liệu mới nhất.');
        }
      });
    };
    if (data.permissions?.attendanceView) {
      const section=document.createElement('section');
      section.dataset.panel = 'attendance';
      section.innerHTML=`<h2>Điểm danh hôm nay • ${esc(data.today)}</h2>${data.students.map(s=>`<form class="attendance-form bcs-person-card" data-id="${esc(s.id)}"><label>${esc(s.name)}<select name="status" ${data.permissions.attendance ? '' : 'disabled'}><option value="" disabled ${!s.attendance?'selected':''}>Chưa ghi nhận</option>${Object.entries({present:'Có mặt',late:'Đi muộn',excused:'Vắng P',unexcused:'Vắng KP'}).map(([key,label])=>`<option value="${key}" ${s.attendance===key?'selected':''}>${label}</option>`).join('')}</select></label>${data.permissions.attendance ? '<button>Lưu điểm danh</button>' : ''}</form>`).join('')}`;
      el('content').appendChild(section);
      section.querySelectorAll('form').forEach(form=>form.onsubmit=event=>{
        event.preventDefault();if(working || leaving)return;dirty=true;const status=new FormData(form).get('status');
        if(!status)return;
        run(async()=>{await api({action:'attendance',studentId:form.dataset.id,status});await load();message('Đã lưu điểm danh và điểm chuyên cần.');});
      });
    }
    if (data.permissions?.grades) {
      const section = document.createElement('section');
      section.dataset.panel = 'grades';
      section.innerHTML = `<h2>Nhập / sửa điểm học tập</h2><form id="grade-form" data-request="${safeUuid()}"><div class="grid">
        <label>Học sinh<select name="studentId">${data.students.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label>
        <label>Môn học<select name="subjectId">${data.subjects.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label>
        <label>Học kỳ<select name="semester"><option>HK1</option><option>HK2</option></select></label>
        <label>Cột điểm<select name="sequence">${['TX1','TX2','TX3','TX4','Giữa kỳ','Cuối kỳ'].map((s,i)=>`<option value="${i+1}">${s}</option>`).join('')}</select></label></div>
        <p id="grade-current"></p><label>Điểm mới (để trống nếu xóa)<input name="score" type="number" min="0" max="10" step="any" inputmode="decimal"></label><button class="primary">Lưu điểm học tập</button></form>
        <details><summary>Điểm đã ghi nhận</summary>${data.grades.map(r=>`<p>${esc(data.students.find(s=>s.id===r.studentId)?.name)} • ${esc(data.subjects.find(s=>s.id===r.subjectId)?.name)} • ${esc(r.semester)} • ${Number(r.sequence)<=4?'TX'+Number(r.sequence):Number(r.sequence)===5?'Giữa kỳ':'Cuối kỳ'}: <b>${esc(r.score)}</b></p>`).join('') || '<p>Chưa có điểm.</p>'}</details>`;
      el('content').appendChild(section);
      const form = el('grade-form');
      const currentRecord = () => data.grades.find(r => r.studentId === form.querySelector('[name=studentId]').value && r.subjectId === form.querySelector('[name=subjectId]').value && r.semester === form.querySelector('[name=semester]').value && Number(r.sequence) === Number(form.querySelector('[name=sequence]').value));
      const updateCurrent = () => { el('grade-current').textContent = 'Điểm hiện tại: ' + (currentRecord()?.score ?? 'Chưa nhập'); };
      form.querySelectorAll('select').forEach(select => select.addEventListener('change', updateCurrent));
      updateCurrent();
      form.onsubmit = event => {
        event.preventDefault();if(working || leaving)return;dirty=true;
        const values = Object.fromEntries(new FormData(form));
        if (values.score === '' && !confirm('Xóa điểm đang chọn và hoàn tác đóng góp điểm theo quy định của lớp?')) return;
        run(async () => {
          await api({action:'grade', ...values, expectedRecord:currentRecord()?.version ?? null, requestId:form.dataset.request});
          await load(); message('Đã lưu điểm học tập và cập nhật điểm tích.');
        });
      };
    }
    installDashboardNavigation();
    root.querySelectorAll('.duty-form').forEach(form => form.onsubmit = event => {
      event.preventDefault();if(working || leaving)return;dirty=true;
      const values=Object.fromEntries(new FormData(form));
      run(async () => { await api({ action:'duty', ...values, week:form.dataset.week, day:form.dataset.day, shift:form.dataset.shift, studentId:form.dataset.id }); await load(); message('Đã lưu đánh giá và cập nhật điểm theo cấu hình lớp.'); });
    });
  }

  async function load(permissionEvent = false) {
    let next;
    try { next = await api({ action:'view' }); }
    catch (error) {
      if (!permissionEvent || !selectedRoleKey || !['ROLE_UNAVAILABLE','ASSIGNMENT_CHANGED'].includes(error.code)) throw error;
      selectedRoleKey = '';
      next = await api({ action:'view' });
    }
    if (!root.isConnected || leaving) return;
    const accessShape = d => JSON.stringify([d?.selectedRoleKey,d?.groupId,d?.permissions,d?.availableRoles,(d?.students || []).map(s=>s.id)]);
    if (permissionEvent && dirty && data && accessShape(data) === accessShape(next)) {
      recoveryActive = false; sessionBlocked = false; el('recovery').hidden = true; el('recovery').innerHTML = '';
      return;
    }
    const discardedDraft = permissionEvent && dirty;
    recoveryActive = false; sessionBlocked = false; el('recovery').hidden = true; el('recovery').innerHTML = '';
    data = next;
    selectedRoleKey = data.selectedRoleKey || '';
    if (data.identity) {
      root.querySelector('h1').textContent = `${data.identity.name} • ${data.identity.title}`;
      el('bcs-avatar').textContent = String(data.identity.name || 'BC').trim().split(/\s+/).slice(-2).map(s=>s[0]).join('');
      el('bcs-welcome').textContent = `Chào ${data.identity.name}!`;
      el('bcs-scope').textContent = `${data.className || 'Lớp 7N'} • ${data.identity.title} • ${data.groupId || 'Toàn lớp'}`;
    }
    dirty = false;
    renderDeputy();
    message(discardedDraft ? 'Quyền đã thay đổi. Biểu mẫu chưa gửi đã được đóng để tránh thao tác sai phạm vi.' : '');
  }
  const handleAction = event => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const {action,id} = button.dataset;
    if (action === 'login' || action === 'home') { void leaveWorkspace(); return; }
    if (action === 'refresh') { void run(refresh); return; }
    if (action === 'cancel-edit' && !working) { renderDeputy(); dirty=false; return; }
    if (action === 'edit-score') {
      if (working || dirty && !confirm('Bỏ nội dung chưa gửi để sửa bản ghi này?')) return;
      const student=data.students.find(s=>s.id===button.dataset.student);
      const entry=student?.history.find(h=>h.id===id && h.canEdit);
      const form=el('score-form'); if (!entry || !form) return;
      form.hidden=false;form.dataset.historyId=entry.id;form.dataset.studentId=student.id;form.dataset.version=entry.version;form.dataset.request=safeUuid();
      for (const [key,value] of Object.entries({studentId:student.id,points:entry.points,category:entry.category,reason:entry.reason})) form.querySelector(`[name=${key}]`).value=value;
      form.querySelector('[name=studentId]').disabled=true;
      form.querySelector('[data-action=cancel-edit]').hidden=false;el('score-form-title').textContent='Sửa điểm đã ghi nhận';dirty=true;showPanel('points');
    }
  };
  el('content').addEventListener('click', handleAction);
  el('recovery').addEventListener('click', handleAction);
  function requestPermissionRefresh() {
    if (leaving || !root.isConnected) return;
    permissionRefreshQueued = true;
    clearTimeout(permissionRefreshTimer);
    permissionRefreshTimer = setTimeout(() => {
      if (working || leaving || !root.isConnected) return;
      permissionRefreshQueued = false;
      void run(async () => {
        const fresh = await window.cloudServices.refreshSession();
        if (!root.isConnected || leaving) return;
        if (fresh.role !== member.role) { window.startApp(); return; }
        await load(true);
      });
    }, 100);
  }
  const stopPermissions = window.cloudServices.subscribePermissionChanges?.(requestPermissionRefresh, () => {
    // Keep the fallback reader alive if the signal subscription temporarily fails.
    requestPermissionRefresh();
  });
  const timer = setInterval(() => {
    if (!root.isConnected) { clearInterval(timer); return; }
    if (!working && !leaving && !document.hidden) {
      if (recoveryActive && !sessionBlocked) requestPermissionRefresh();
      else if (!recoveryActive && !dirty && !(root.contains(document.activeElement) && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))) run(() => load());
    }
  }, 15000);
  window.closeDeputyWorkspace = () => { clearInterval(timer); clearTimeout(permissionRefreshTimer); stopPermissions?.(); root.remove(); };
  el('logout').onclick = () => { void leaveWorkspace(); };
  await run(load);
};
