(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={roster:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8',attendance:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',scores:'M4 20V10h4v10 M10 20V4h4v16 M16 20v-7h4v7',points:'M12 3v18 M3 12h18',duty:'M8 3h8v4H8z M6 5H4v16h16V5h-2 M8 12h8 M8 16h5',grades:'M4 3h13l3 3v15H4z M8 9h8 M8 13h8 M8 17h4',gift:'M3 8h18v4H3z M5 12v9h14v-9 M12 8v13 M12 8C2 8 5 0 12 8 M12 8c10 0 7-8 0 0'};
  const icon = kind => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[kind] || paths.roster}"/></svg>`;
  function card({id,title,value,note,tone='blue',icon:kind, panel,onclick,studentList=false}) {
    return `<button type="button" ${id?`id="${esc(id)}"`:''} class="dashboard-card" data-tone="${esc(tone)}" ${panel?`data-panel-link="${esc(panel)}" aria-controls="bcs-panel-${esc(panel)}" aria-pressed="false"`:''} ${onclick?`onclick="${esc(onclick)}"`:''} ${studentList?'data-student-list-open aria-label="Xem danh sách chi tiết học sinh" aria-haspopup="dialog" aria-controls="student-list-modal"':''}>${icon(kind)}<strong>${esc(title)}</strong><b>${esc(value)}</b><small>${esc(note)}</small>${studentList?'<span id="student-list-open-status" role="status" aria-live="polite" hidden></span>':''}</button>`;
  }
  function heroContent({title,kicker,subtitle,description,year='2026 - 2027',student=false}) {
    return `<div class="overview-hero-default-content"><div class="overview-hero-chip">✨ ${esc(kicker)}</div><div class="overview-hero-grid"><div class="overview-hero-copy"><h1 ${student?'id="bcs-welcome"':'id="page-banner-overview-title"'} class="overview-hero-title">${esc(title)}</h1><div class="overview-hero-subtitle">💛 ${esc(subtitle)} 💛</div><p class="overview-hero-slogan">🌟 ${esc(description)} 🚀</p>${student?'<span id="bcs-scope" class="bcs-scope">Đang cập nhật phân công của bạn</span>':''}</div><div class="overview-hero-visual">${artwork()}</div><div class="overview-hero-yearbox"><span>NĂM HỌC ${esc(year)}</span><strong>Sổ Tay Giáo Viên Chủ Nhiệm</strong></div></div></div>`;
  }
function artwork() {
            return `<div class="page-banner-default-art" aria-hidden="true">
                <svg viewBox="0 0 620 280" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="ov11Desk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stop-color="#f8c69e"/>
                            <stop offset="1" stop-color="#e9a972"/>
                        </linearGradient>
                        <linearGradient id="ov11BookPink" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stop-color="#fb7185"/>
                            <stop offset="1" stop-color="#f9a8d4"/>
                        </linearGradient>
                        <linearGradient id="ov11BookBlue" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stop-color="#7dd3fc"/>
                            <stop offset="1" stop-color="#60a5fa"/>
                        </linearGradient>
                        <filter id="ov11Shadow" x="-20%" y="-20%" width="140%" height="160%">
                            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#db2777" flood-opacity=".18"/>
                        </filter>
                    </defs>
                    <g opacity=".9">
                        <circle cx="76" cy="34" r="10" fill="#fff"/><circle cx="94" cy="28" r="13" fill="#fff"/><circle cx="112" cy="35" r="10" fill="#fff"/>
                        <circle cx="514" cy="30" r="10" fill="#fff"/><circle cx="532" cy="24" r="13" fill="#fff"/><circle cx="551" cy="31" r="10" fill="#fff"/>
                        <path d="M420 23l7 7 11-4-6 10 8 8-12-1-6 10-2-11-11-2 10-5z" fill="#fde68a"/>
                        <path d="M477 50c7-8 18-8 24 0 4 5 4 12-1 16l-11 10-11-10c-6-4-6-11-1-16z" fill="#fb7185"/>
                        <path d="M510 66c5-6 13-6 18 0 3 3 3 9-1 12l-8 8-8-8c-4-3-4-9-1-12z" fill="#f472b6"/>
                        <path d="M496 11l36 17-24 10 7 8" fill="none" stroke="#f9a8d4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </g>
                    <g transform="translate(47 171)" filter="url(#ov11Shadow)">
                        <rect x="0" y="0" width="62" height="11" rx="5.5" fill="#e8b98d"/>
                        <rect x="7" y="-12" width="48" height="14" rx="6" fill="url(#ov11BookPink)"/>
                        <rect x="12" y="-23" width="38" height="13" rx="6" fill="#fff"/>
                        <rect x="21" y="-35" width="24" height="22" rx="5" fill="#86efac"/>
                        <path d="M33-52c-10 0-16 6-16 14 0 10 7 15 16 15 8 0 16-5 16-15 0-8-7-14-16-14z" fill="#84cc16"/>
                        <path d="M33-58v-10M24-55l-6-8M42-55l6-8" stroke="#65a30d" stroke-width="3" stroke-linecap="round"/>
                    </g>
                    <g transform="translate(116 185)">
                        <path d="M0 0h354l-24 30H23z" fill="url(#ov11Desk)"/>
                        <path d="M0 0l23-11h327l28 11" fill="#f6d2ad"/>
                    </g>
                    <!-- boy -->
                    <g transform="translate(212 59)" filter="url(#ov11Shadow)">
                        <ellipse cx="64" cy="45" rx="45" ry="43" fill="#7c4a37"/>
                        <path d="M28 36c2-26 25-36 42-36 22 0 42 15 42 38-8-10-15-13-24-14-13 11-31 13-60 12z" fill="#58352b"/>
                        <circle cx="68" cy="52" r="34" fill="#ffd9c9"/>
                        <circle cx="56" cy="50" r="5" fill="#2b1f1b"/><circle cx="81" cy="50" r="5" fill="#2b1f1b"/>
                        <circle cx="55" cy="49" r="1.5" fill="#fff"/><circle cx="80" cy="49" r="1.5" fill="#fff"/>
                        <path d="M61 63c4 3 11 3 15 0" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
                        <circle cx="49" cy="59" r="4" fill="#fda4af" opacity=".55"/><circle cx="88" cy="59" r="4" fill="#fda4af" opacity=".55"/>
                        <rect x="34" y="84" width="64" height="57" rx="20" fill="#ffffff"/>
                        <path d="M65 85l16 18H49z" fill="#60a5fa"/>
                        <rect x="59" y="102" width="12" height="35" rx="6" fill="#2563eb"/>
                        <rect x="20" y="92" width="22" height="52" rx="10" fill="#ffd9c9" transform="rotate(9 20 92)"/>
                        <rect x="90" y="92" width="22" height="52" rx="10" fill="#ffd9c9" transform="rotate(-13 90 92)"/>
                        <circle cx="112" cy="141" r="8" fill="#ffd9c9"/>
                        <path d="M110 129l24-13" stroke="#6b7280" stroke-width="4" stroke-linecap="round"/>
                    </g>
                    <!-- girl -->
                    <g transform="translate(339 60)" filter="url(#ov11Shadow)">
                        <path d="M37 36c5-23 27-33 47-33 21 0 42 11 49 35 4 14 2 25 1 37-3 28-16 44-50 44-34 0-47-15-50-41-2-15-1-28 3-42z" fill="#6c4a42"/>
                        <circle cx="83" cy="56" r="35" fill="#ffd9c9"/>
                        <circle cx="70" cy="54" r="5" fill="#2b1f1b"/><circle cx="95" cy="54" r="5" fill="#2b1f1b"/>
                        <circle cx="69" cy="53" r="1.5" fill="#fff"/><circle cx="94" cy="53" r="1.5" fill="#fff"/>
                        <path d="M79 66c4 3 10 3 14 0" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
                        <circle cx="64" cy="62" r="4" fill="#fda4af" opacity=".55"/><circle cx="102" cy="62" r="4" fill="#fda4af" opacity=".55"/>
                        <path d="M102 44c4-8 14-10 20-3 5 6 5 14-1 19l-8 8-8-8c-6-4-7-11-3-16z" fill="#f472b6"/>
                        <rect x="47" y="90" width="74" height="58" rx="22" fill="#fff"/>
                        <path d="M83 92l20 18H63z" fill="#fb7185"/>
                        <rect x="77" y="108" width="12" height="30" rx="6" fill="#f472b6"/>
                        <rect x="112" y="96" width="20" height="42" rx="10" fill="#ffd9c9" transform="rotate(-12 112 96)"/>
                        <circle cx="129" cy="135" r="8" fill="#ffd9c9"/>
                        <path d="M127 123l11-12" stroke="#6b7280" stroke-width="4" stroke-linecap="round"/>
                        <path d="M134 107a11 11 0 1 1-22 0 11 11 0 0 1 22 0" fill="none" stroke="#fb7185" stroke-width="3"/>
                    </g>
                    <!-- notebooks -->
                    <g transform="translate(233 192)" filter="url(#ov11Shadow)">
                        <rect x="0" y="0" width="66" height="34" rx="7" fill="#fff"/>
                        <path d="M33 0v34" stroke="#d1d5db"/><path d="M9 8h18M9 14h18M39 8h18M39 14h18" stroke="#f9a8d4" stroke-width="2" stroke-linecap="round"/>
                        <rect x="88" y="2" width="24" height="31" rx="6" fill="#f9a8d4"/>
                        <rect x="148" y="0" width="66" height="34" rx="7" fill="#fff"/>
                        <path d="M181 0v34" stroke="#d1d5db"/><path d="M157 8h18M157 14h18M187 8h18M187 14h18" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
                    </g>
                    <!-- clock -->
                    <g transform="translate(525 180)" filter="url(#ov11Shadow)">
                        <circle cx="0" cy="0" r="23" fill="#fda4af"/>
                        <circle cx="0" cy="0" r="17" fill="#fff"/>
                        <path d="M0-21l-7-9M0-21l7-9" stroke="#fb7185" stroke-width="4" stroke-linecap="round"/>
                        <path d="M0 0v-7M0 0l7 5" stroke="#6b7280" stroke-width="3" stroke-linecap="round"/>
                        <circle cx="0" cy="0" r="2.5" fill="#6b7280"/>
                    </g>
                </svg>
            </div>`;
        }  window.ClassDashboard = {card,heroContent,artwork,icon};
})();
