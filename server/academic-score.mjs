import { AccessError } from './access-model.mjs';
export function calculateRewardForAcademicScore(state, score, sequence) {
  const num = parseFloat(score);
  const seq = parseInt(sequence, 10);

  if (isNaN(num) || num < 0 || num > 10) {
    return 0;
  }

  // GIỮA KỲ (cột 5) và CUỐI KỲ (cột 6) dùng cùng thang điểm tích riêng:
  // >= 8 điểm: +15đ; từ 5 đến dưới 8 điểm: +5đ; dưới 5 điểm: -5đ.
  // Khi sửa điểm, saveAcademicScoreRecord() sẽ hoàn tác đúng đóng góp cũ
  // rồi chỉ cộng/trừ phần chênh lệch để bản ghi đóng góp đúng mức mới.
  if (seq === 5 || seq === 6) {
    if (num >= 8) return 15;
    if (num >= 5) return 5;
    return -5;
  }

  // TX1-TX4: 10→+10, 9→+9, 8→+8, 7→+7, 6→+6; 5→-1, 4→-2, 3→-3, 2→-4, 1→-5.
  const rules = state.scoreRewardRules || [
    { minScore: 10.0, maxScore: 10.0, rewardPoints: 10 },
    { minScore: 9.0, maxScore: 9.99, rewardPoints: 9 },
    { minScore: 8.0, maxScore: 8.99, rewardPoints: 8 },
    { minScore: 7.0, maxScore: 7.99, rewardPoints: 7 },
    { minScore: 6.0, maxScore: 6.99, rewardPoints: 6 },
    { minScore: 5.0, maxScore: 5.0, rewardPoints: -1 },
    { minScore: 4.0, maxScore: 4.99, rewardPoints: -2 },
    { minScore: 3.0, maxScore: 3.99, rewardPoints: -3 },
    { minScore: 2.0, maxScore: 2.99, rewardPoints: -4 },
    { minScore: 0.0, maxScore: 1.99, rewardPoints: -5 }
  ];

  const matched = rules.find(r =>
    num >= Number(r.minScore) &&
    num <= Number(r.maxScore)
  );

  return matched ? Number(matched.rewardPoints) || 0 : 0;
}

export function gradeVersion(record) {
  return record ? JSON.stringify([Number(record.score), record.updatedAt || record.createdAt || '', !!(record.weeklyResetSettled || record.scoreCycleSettledAt)]) : null;
}
export function applyAcademicScore(state, student, input, stamp, performer, applyDelta) {
  const sequence = Number(input.sequence);
  const subject = state.subjectsConfig?.find(s => s.id === input.subjectId);
  if (!subject || !['HK1','HK2'].includes(input.semester) || !Number.isInteger(sequence) || sequence < 1 || sequence > 6)
    throw new AccessError(400, 'Môn học, học kỳ hoặc cột điểm không hợp lệ.');
  const records = state.academicScoresRecords ||= [];
  const index = records.findIndex(r => String(r.studentId) === String(student.id) && r.subjectId === input.subjectId && r.semester === input.semester && Number(r.sequence) === sequence);
  const old = records[index];
  if (input.expectedRecord !== gradeVersion(old)) throw new AccessError(409, 'Ô điểm đã thay đổi trên thiết bị khác. Bấm Cập nhật, kiểm tra điểm mới rồi nhập lại.');
  const deleting = input.score === '' || input.score === null;
  const score = Number(input.score);
  if (!deleting && (typeof input.score === 'boolean' || input.score === undefined || String(input.score).trim() === '' || !Number.isFinite(score) || score < 0 || score > 10))
    throw new AccessError(400, 'Điểm phải từ 0 đến 10.');
  if (deleting && !old) return;
  const oldScore = old?.score;
  const settled = !!(old?.weeklyResetSettled || old?.scoreCycleSettledAt);
  const oldApplied = settled ? 0 : Number(old?.actualAppliedPoints ?? old?.rewardPoints) || 0;
  const reward = deleting ? 0 : calculateRewardForAcademicScore(state, score, sequence);
  const delta = settled ? 0 : reward - oldApplied;
  if (deleting) records.splice(index, 1);
  else if (old) Object.assign(old, {score, rewardPoints:reward, actualAppliedPoints:settled ? 0 : reward, updatedAt:stamp, updatedBy:performer});
  else records.push({id:'gr_' + input.requestId, studentId:student.id, subjectId:input.subjectId, semester:input.semester, sequence, score, rewardPoints:reward, actualAppliedPoints:reward, createdAt:stamp, createdBy:performer});
  if (deleting || !old || Number(oldScore) !== score || delta !== 0) {
    applyDelta(student, delta, {id:'grade_' + input.requestId, date:stamp, category:'Học tập', source:'academic-grade', subjectId:input.subjectId, semester:input.semester, sequence, score:deleting ? null : score, performer,
      reason:`${subject.name} - ${input.semester} - ${sequence <= 4 ? 'TX' + sequence : sequence === 5 ? 'Giữa kỳ' : 'Cuối kỳ'}: ${deleting ? 'Xóa điểm' : score + ' điểm'}; điểm tích thay đổi ${delta}`});
  }
}
