import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { isIP } from 'node:net';

export class AccessError extends Error {
  constructor(status, message, retryAfter = 0) {
    super(message); this.status = status; this.retryAfter = retryAfter;
  }
}
export const LOGIN_ERROR = 'Mã hoặc mật khẩu không đúng, chưa được cấp quyền hoặc đã bị khóa.';
export function digest(secret, kind, credential) {
  return createHmac('sha256', secret).update(`${kind}\0${credential}`).digest('hex');
}
export function managedUid(appId, classId, kind, studentId) {
  return `simple_${kind}_${createHash('sha256').update(JSON.stringify([appId, classId, String(studentId)])).digest('hex').slice(0, 32)}`;
}
export function validateCredential(kind, value) {
  if (!['phhs', 'bcs', 'to_pho'].includes(kind) || typeof value !== 'string') throw new AccessError(400, 'Yêu cầu đăng nhập không hợp lệ.');
  if (kind === 'phhs' && !/^\d{5}$/.test(value)) throw new AccessError(400, 'Hãy nhập đúng 5 chữ số của mã học sinh.');
  if (['bcs', 'to_pho'].includes(kind) && (value.length < 6 || value.length > 128)) throw new AccessError(401, LOGIN_ERROR);
  return value;
}
export function validateOfficerPassword(value) {
  if (typeof value !== 'string' || value.length < 6 || value.length > 128) {
    throw new AccessError(400, 'Mật khẩu cán bộ phải từ 6 đến 128 ký tự.');
  }
  if (value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new AccessError(400, 'Mật khẩu không được có khoảng trắng ở đầu/cuối hoặc ký tự xuống dòng.');
  }
  return value;
}
export function readRoster(state) {
  const students = state?.students;
  if (!Array.isArray(students) || students.length > 80) throw new AccessError(409, 'Dữ liệu lớp chưa sẵn sàng hoặc vượt giới hạn 80 học sinh.');
  const ids = new Set(), codes = new Set();
  for (const student of students) {
    const id = String(student.id ?? '');
    if (!id || ids.has(id)) throw new AccessError(409, 'ID học sinh bị thiếu hoặc trùng. Hãy kiểm tra danh sách lớp.');
    const code = String(student.code ?? '');
    if (!/^\d{5}$/.test(code) || codes.has(code)) throw new AccessError(409, 'Mã học sinh phải đủ 5 số và không trùng nhau. Hãy kiểm tra danh sách lớp.');
    ids.add(id); codes.add(code);
  }
  return students;
}
export function officerFor(state, studentId) {
  return (state.officerRoles || []).find(r => r.status === 'active' && String(r.assignedStudentId) === String(studentId));
}
export function newOfficerPassword() { return randomBytes(12).toString('base64url'); }
export function newStudentCode(students) {
  const used = new Set(students.map(s => String(s.code)));
  for (let i = 0; i < 1000; i++) {
    const code = String(randomInt(10000, 100000));
    if (!used.has(code)) return code;
  }
  throw new AccessError(503, 'Chưa tạo được mã mới, hãy thử lại.');
}
export function ipBucket(ip) {
  if (!isIP(ip || '')) throw new AccessError(503, 'Không xác định được kết nối. Hãy thử lại sau.');
  if (isIP(ip) === 4) return ip;
  // Aggregate IPv6 privacy addresses by /64, not by freely rotating host bits.
  const raw = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const [left, right = ''] = raw.split('::');
  const a = left ? left.split(':') : [], b = right ? right.split(':') : [];
  const groups = raw.includes('::') ? [...a, ...Array(8 - a.length - b.length).fill('0'), ...b] : a;
  return groups.slice(0, 4).map(x => x.padStart(4, '0')).join(':');
}
export function nextLimit(old, now, max, windowMs) {
  const current = old && now < old.resetAt ? old : { count: 0, resetAt: now + windowMs };
  if (current.count >= max) throw new AccessError(429, 'Đã thử đăng nhập nhiều lần. Vui lòng chờ rồi thử lại.', Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
  return { count: current.count + 1, resetAt: current.resetAt };
}
export function studentView(state, student) {
  const own = { ...student }; delete own.password; delete own.deputyRole;
  const id = String(student.id);
  const attendanceRecords = Object.fromEntries(Object.entries(state.attendanceRecords || {}).map(([date, records]) => {
    const value = records && typeof records === 'object' ? records[id] : undefined;
    return [date, value === undefined ? {} : { [id]: value }];
  }));
  return {
    currentTab: 'tong-quan', admin: state.admin || {}, theme: state.theme || {}, settings: {},
    students: [own], groups: state.groups || [], rewards: state.rewards || [], attendanceRecords,
    timetable: state.timetable || {}, weeklyTasks: state.weeklyTasks || [], subjectsConfig: state.subjectsConfig || [],
    academicScoresRecords: (state.academicScoresRecords || []).filter(r => String(r.studentId) === id),
    reportRemarks: state.reportRemarks?.[id] ? { [id]: state.reportRemarks[id] } : {},
    honorBoardPraises: state.honorBoardPraises || [], officerRoles: [],
    classroomSeating: { version: 2, initialized: false, deskPlan: [], assignments: {} },
    dutyRoster: { weeks: {}, extraTasks: [], settings: {} }, settingsTab: 'thong-tin',
  };
}
