(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.loadDeputyPermissions = async function() {
    const host = document.getElementById('deputy-permissions');
    if (!host || window.cloudMembership?.role !== 'gvcn') return;
    if (host.deputyPermissionsInitialized) return;
    host.deputyPermissionsInitialized = true;
    let rows = [], loaded = false, busy = false, dialog = null, dialogObserver = null;
    const api = body => {
      if (window.cloudMembership?.role !== 'gvcn') throw new Error('Chỉ GVCN được quản lý quyền Tổ phó.');
      if (!window.cloudServices?.accessAdmin) throw new Error('Chưa kết nối máy chủ. Hãy đăng nhập GVCN và thử lại.');
      return window.cloudServices.accessAdmin(body);
    };
    function message(text, error = false) {
      const box = (dialog || host).querySelector('[data-deputy-message]');
      if (box) { box.textContent = text; box.style.color = error ? '#b91c1c' : '#166534'; }
      if (!dialog) {
        const retry = host.querySelector('[data-deputy-retry]');
        if (retry) retry.hidden = !error;
      }
    }
    function groupStudent(group) {
      const members = rows.filter(s => s.group === group);
      return members.find(s => s.deputyAccess === 'active') || members.find(s => s.deputyAccess === 'blocked');
    }
    function render() {
      const groups = [...new Set(['Tổ 1','Tổ 2','Tổ 3','Tổ 4',...rows.map(s => s.group).filter(Boolean)])];
      host.innerHTML = `<div class="flex flex-wrap items-center gap-3"><p data-deputy-message role="status" aria-live="polite" class="text-sm empty:hidden"></p><button type="button" data-deputy-refresh data-deputy-retry hidden class="px-4 py-3 border rounded-xl font-bold text-indigo-700">Thử lại</button></div>${groups.map(group => {
        const members = rows.filter(s => s.group === group), selected = groupStudent(group);
        const enabled = selected?.deputyAccess === 'active';
        return `<article data-deputy-row="${esc(group)}" class="permission-role-card ${selected && !enabled ? 'is-disabled' : ''} p-5 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
          <div class="permission-role-info flex items-center gap-4 flex-1 min-w-0">
            <div class="permission-role-avatar w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold bg-indigo-50 text-indigo-600 shrink-0"><i class="ph-fill ph-user-circle" aria-hidden="true"></i></div>
            <div class="flex-1 min-w-0"><div class="permission-role-title font-black text-base text-slate-800">Tổ phó ${esc(group)}</div>
              <div class="permission-role-summary text-xs text-slate-500 mt-0.5">Phạm vi: <b class="text-blue-600">${esc(group)}</b> • Chuyên mục: <span class="text-slate-600 font-bold">Trực nhật, Đề xuất điểm, Lịch sử thi đua</span></div>
            </div>
          </div>
          <div class="permission-role-controls flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
            <select data-deputy-select aria-label="Chọn Tổ phó ${esc(group)}" class="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none min-w-0 flex-1" style="max-width:100%" ${members.length ? '' : 'disabled'}>
              <option value="" ${selected ? '' : 'selected'} disabled>${loaded ? '-- Chọn học sinh --' : 'Đang chờ tải danh sách'}</option>
              ${members.map(s => `<option value="${esc(s.id)}" ${selected?.id === s.id ? 'selected' : ''}>${esc(s.name)} (${esc(group)})</option>`).join('')}
            </select>
            <button type="button" data-deputy-toggle class="px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${enabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}" aria-pressed="${enabled}" ${selected ? '' : 'disabled'}>${!loaded ? 'Chưa tải' : enabled ? 'Đang Bật' : selected ? 'Đã Tắt' : 'Chưa gán'}</button>
            <button type="button" data-deputy-settings ${members.length ? '' : 'disabled'} class="permission-role-settings p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl shrink-0" title="Cài đặt Tổ phó ${esc(group)}" aria-label="Cài đặt Tổ phó ${esc(group)}"><i class="ph-bold ph-sliders text-base" aria-hidden="true"></i></button>
          </div>
        </article>`;
      }).join('')}<div class="flex flex-wrap gap-3 justify-end text-xs"><button type="button" data-deputy-refresh class="text-slate-500 underline">Cập nhật danh sách</button><button type="button" onclick="openDeputyWorkspace()" class="text-indigo-700 underline font-bold">Duyệt đề xuất điểm</button></div>`;
    }
    async function refresh() {
      message('Đang tải danh sách phân quyền…');
      const result = await api({action:'list'});
      if (!host.isConnected) return;
      if (result.features?.compactDeputyAssignment !== true) throw new Error('Máy chủ chưa có bản phân quyền Tổ phó mới. Hãy triển khai đầy đủ mã nguồn và Functions.');
      rows = result.students || [];
      loaded = true;
      render();
    }
    async function run(action) {
      if (busy) return;
      busy = true;
      const controls = [...host.querySelectorAll('button,select'),...(dialog?.querySelectorAll('button,input') || [])].map(el => [el,el.disabled]);
      controls.forEach(([el]) => el.disabled = true);
      try { await action(); }
      catch (error) { message(error instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(error.message || '') ? 'Chưa kết nối được máy chủ. Kiểm tra mạng rồi bấm Thử lại để tải danh sách.' : error.message || 'Chưa lưu được. Hãy thử lại.', true); }
      finally { busy = false; controls.forEach(([el,disabled]) => el.disabled = disabled); }
    }
    function closeDialog() {
      dialogObserver?.disconnect(); dialogObserver = null;
      if (!dialog) return;
      dialog.querySelectorAll('input').forEach(input => input.value = '');
      dialog.close(); dialog.remove(); dialog = null;
    }
    function confirmAssignment(student) {
      return confirm(`Phân công ${student.name} làm Tổ phó ${student.group}? Tài khoản Tổ phó trước trong cùng tổ và quyền cán bộ toàn lớp của học sinh này sẽ bị khóa.`);
    }
    async function afterSave(text) {
      closeDialog();
      try { await refresh(); message(text); }
      catch (error) { message(`Đã lưu nhưng chưa tải lại được danh sách: ${error.message}`, true); }
    }
    function openSettings(student) {
      if (busy || !host.isConnected) return;
      closeDialog();
      dialog = document.createElement('dialog');
      dialog.setAttribute('aria-labelledby','deputy-settings-title');
      dialog.style.cssText = 'width:min(520px,calc(100vw - 32px));max-height:90vh;overflow:auto;border:1px solid #cbd5e1;border-radius:20px;padding:24px;color:#1e293b;background:white';
      dialog.innerHTML = `<h3 id="deputy-settings-title" class="text-lg font-black">Cài đặt Tổ phó ${esc(student.group)}</h3>
        <p class="mt-2 font-bold">${esc(student.name)}</p>
        <p class="my-3 text-sm text-slate-600">Được chấm trực nhật, đề xuất điểm và xem lịch sử trong ${esc(student.group)}. Không được chốt tuần hoặc xóa lịch sử đã duyệt.</p>
        <form><label class="block text-sm font-bold mt-3">${student.deputyAccess === 'missing' ? 'Cấp mật khẩu đăng nhập' : 'Mật khẩu mới'}<input name="password" type="password" required minlength="6" maxlength="128" autocomplete="new-password" class="block w-full p-3 border rounded-xl mt-1"></label>
          <label class="block text-sm font-bold mt-3">Nhập lại mật khẩu<input name="confirmation" type="password" required minlength="6" maxlength="128" autocomplete="new-password" class="block w-full p-3 border rounded-xl mt-1"></label>
          <p class="text-xs text-slate-500 my-3">Học sinh chọn Ban cán sự trên màn hình đăng nhập chung.</p>
          <p data-deputy-message role="status" aria-live="polite" class="text-sm my-2"></p>
          <div class="flex justify-end gap-2"><button type="button" data-deputy-close class="px-4 py-2.5 border rounded-xl">Hủy</button><button type="submit" class="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Lưu</button></div>
        </form>`;
      document.body.appendChild(dialog);
      dialog.showModal();
      if (typeof MutationObserver === 'function') {
        dialogObserver = new MutationObserver(() => { if (!host.isConnected) closeDialog(); });
        dialogObserver.observe(document.body, {childList:true,subtree:true});
      }
      dialog.querySelector('input').focus();
      dialog.querySelector('[data-deputy-close]').onclick = () => { if (!busy) { closeDialog(); render(); } };
      dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy) { closeDialog(); render(); } });
      dialog.querySelector('form').onsubmit = event => {
        event.preventDefault();
        const values = new FormData(event.target), password = values.get('password');
        if (password !== values.get('confirmation')) return message('Hai lần nhập mật khẩu chưa khớp.',true);
        if (!confirmAssignment(student)) return;
        run(async () => {
          await api({action:'set-officer-password',kind:'to_pho',studentId:student.id,password,replaceGroupDeputy:true,expectedGroup:student.group});
          await afterSave('Đã lưu phân công và mật khẩu. Học sinh đăng nhập bằng mục Ban cán sự.');
        });
      };
    }
    host.onchange = event => {
      const select = event.target.closest('[data-deputy-select]');
      if (!select || busy) return;
      const row = select.closest('[data-deputy-row]');
      const student = rows.find(s => s.id === select.value && s.group === row.dataset.deputyRow);
      if (!student) return;
      if (student.deputyAccess === 'missing') return openSettings(student);
      if (!confirmAssignment(student)) { render(); return; }
      run(async () => {
        try {
          await api({action:'toggle',kind:'to_pho',studentId:student.id,active:true,replaceGroupDeputy:true,expectedGroup:student.group});
          await afterSave('Đã lưu phân công Tổ phó.');
        } catch (error) { render(); throw error; }
      });
    };
    host.onclick = event => {
      const button = event.target.closest('button');
      if (!button || busy) return;
      if (button.hasAttribute('data-deputy-refresh')) return run(refresh);
      const row = button.closest('[data-deputy-row]');
      if (!row) return;
      const student = rows.find(s => s.id === row.querySelector('select').value && s.group === row.dataset.deputyRow);
      if (!student) return message('Hãy chọn học sinh trong ô bên cạnh trước.',true);
      if (button.hasAttribute('data-deputy-settings')) return openSettings(student);
      if (!button.hasAttribute('data-deputy-toggle')) return;
      const active = student.deputyAccess !== 'active';
      if (!(active ? confirmAssignment(student) : confirm(`Tắt quyền Tổ phó của ${student.name}?`))) return;
      run(async () => {
        await api({action:'toggle',kind:'to_pho',studentId:student.id,active,replaceGroupDeputy:active,expectedGroup:student.group});
        await afterSave('Đã cập nhật trạng thái Tổ phó.');
      });
    };
    // Mount all four cards in the common permissions list before the API responds.
    render();
    await run(refresh);
  };
})();
