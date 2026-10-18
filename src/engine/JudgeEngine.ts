import { JudgmentResult, JudgmentType, ClearGrade, ScoreStats } from '../types/game';
import { NoteEvent, LaneIndex } from '../types/track';

export const JUDGE_WINDOWS = {
  PERFECT_MS: 45,
  GREAT_MS: 90,
  GOOD_MS: 140,
} as const;

export const OFFSET_LIMITS = {
  MIN_MS: -200,
  MAX_MS: 200,
} as const;

/**
 * 사용자 타이밍 오프셋을 허용 범위(-200ms ~ +200ms) 내로 제한합니다.
 */
export function clampOffset(offsetMs: number): number {
  if (Number.isNaN(offsetMs)) return 0;
  return Math.max(OFFSET_LIMITS.MIN_MS, Math.min(OFFSET_LIMITS.MAX_MS, offsetMs));
}

/**
 * 단일 판정 함수:
 * hitTimeSec와 targetTimeSec, userOffsetMs를 기반으로 오차 및 판정 결과를 산출합니다.
 *
 * 공식:
 * errorMs = (hitTimeSec - targetTimeSec) * 1000 - userOffsetMs
 * correctedTargetTime = targetTimeSec + userOffsetMs / 1000
 *
 * - userOffsetMs > 0: 늦은 입력 보정 (목표 시각이 늦춰짐)
 * - userOffsetMs < 0: 이른 입력 보정 (목표 시각이 당겨짐)
 */
export function evaluateHit(
  hitTimeSec: number,
  targetTimeSec: number,
  userOffsetMs: number = 0
): JudgmentResult {
  const safeOffset = clampOffset(userOffsetMs);
  const rawErrorMs = (hitTimeSec - targetTimeSec) * 1000 - safeOffset;
  // 부동소수점 미세 오차 보정 (IEEE 754 precision fix)
  const errorMs = Math.round(rawErrorMs * 100) / 100;
  const absErrorMs = Math.abs(errorMs);

  let type: JudgmentType = 'NONE';
  if (absErrorMs <= JUDGE_WINDOWS.PERFECT_MS) {
    type = 'PERFECT';
  } else if (absErrorMs <= JUDGE_WINDOWS.GREAT_MS) {
    type = 'GREAT';
  } else if (absErrorMs <= JUDGE_WINDOWS.GOOD_MS) {
    type = 'GOOD';
  } else {
    type = 'NONE';
  }

  return {
    type,
    errorMs,
    absErrorMs,
  };
}

/**
 * 자동 MISS 처리 기준:
 * 현재 게임 시간(gameTimeSec)이 보정된 판정 기한(GOOD 140ms 초과)을 넘었는지 확인합니다.
 * evaluateHit와 동일한 오프셋 및 밀리초 반올림 정책을 공유합니다.
 */
export function isAutoMiss(
  targetTimeSec: number,
  gameTimeSec: number,
  userOffsetMs: number = 0
): boolean {
  const safeOffset = clampOffset(userOffsetMs);
  const rawDiffMs = (gameTimeSec - targetTimeSec) * 1000 - safeOffset;
  const diffMs = Math.round(rawDiffMs * 100) / 100;
  return diffMs > JUDGE_WINDOWS.GOOD_MS;
}

/**
 * 특정 레인에서 타격 입력 시 가장 적절한 미판정 노트를 찾아 판정합니다.
 *
 * 규칙:
 * - isJudged가 false인 해당 레인의 노트 중 targetTime 순으로 검사
 * - 조기 입력(errorMs < -140ms): 아직 판정 윈도우에 도달하지 않았으므로 노트를 소비하지 않고 NONE 반환
 * - 유효 윈도우(absError <= 140ms): 판정 결과를 반환하고 해당 노트를 isJudged = true 처리
 * - 지나간 노트(errorMs > 140ms): 이미 지나친 노트는 후보에서 제외 (자동 MISS로 처리될 대상)
 */
export function processHitInput(
  notes: NoteEvent[],
  lane: LaneIndex,
  hitTimeSec: number,
  userOffsetMs: number = 0
): { hitNote: NoteEvent | null; judgment: JudgmentResult } {
  const safeOffset = clampOffset(userOffsetMs);

  // 해당 레인의 미판정 노트들을 시간순으로 검색
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (note.lane !== lane || note.isJudged) {
      continue;
    }

    const res = evaluateHit(hitTimeSec, note.time, safeOffset);

    // 1. 유효 판정 윈도우 내 타격 (PERFECT, GREAT, GOOD)
    if (res.type !== 'NONE') {
      note.isJudged = true; // 단일 1회 판정 고정
      return { hitNote: note, judgment: res };
    }

    // 2. 조기 입력 (errorMs < -140ms):
    // 이후의 노트들은 현재 노트보다 더 뒤에 있으므로 더 큰 조기 입력임.
    // 따라서 노트를 소비하지 않고 즉시 종료.
    if (res.errorMs < -JUDGE_WINDOWS.GOOD_MS) {
      return { hitNote: null, judgment: res };
    }

    // 3. 늦은 입력 (errorMs > 140ms):
    // 이미 타격 기회를 넘긴 노트이므로 다음 노트가 있는지 계속 탐색
  }

  return {
    hitNote: null,
    judgment: { type: 'NONE', errorMs: 0, absErrorMs: 0 },
  };
}

/**
 * 프레임마다 호출되어 유효 타격 시간을 경과한 미판정 노트를 단 1회 자동 MISS 처리합니다.
 */
export function processAutoMisses(
  notes: NoteEvent[],
  gameTimeSec: number,
  userOffsetMs: number = 0
): NoteEvent[] {
  const safeOffset = clampOffset(userOffsetMs);
  const missedNotes: NoteEvent[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (note.isJudged) continue;

    if (isAutoMiss(note.time, gameTimeSec, safeOffset)) {
      note.isJudged = true;
      missedNotes.push(note);
    }
  }

  return missedNotes;
}

/**
 * 점수 계산 (PERFECT: 1000, GREAT: 700, GOOD: 400, MISS: 0) + 콤보 보너스(최대 50콤보 * 10 = 500점)
 */
export function calculateHitScore(judgment: JudgmentType, currentCombo: number): number {
  let baseScore = 0;
  if (judgment === 'PERFECT') baseScore = 1000;
  else if (judgment === 'GREAT') baseScore = 700;
  else if (judgment === 'GOOD') baseScore = 400;
  else return 0;

  const comboBonus = Math.min(currentCombo, 50) * 10;
  return baseScore + comboBonus;
}

/**
 * 정확도 계산 (판정 가중치: PERFECT 1.0, GREAT 0.7, GOOD 0.4, MISS 0.0)
 */
export function calculateAccuracy(counts: ScoreStats['counts']): number {
  const total = counts.PERFECT + counts.GREAT + counts.GOOD + counts.MISS;
  if (total === 0) return 100;

  const weightedSum =
    counts.PERFECT * 1.0 +
    counts.GREAT * 0.7 +
    counts.GOOD * 0.4 +
    counts.MISS * 0.0;

  const accuracy = (weightedSum / total) * 100;
  return Math.round(accuracy * 100) / 100; // 소수점 둘째자리
}

/**
 * 클리어 등급 산출
 */
export function calculateGrade(accuracy: number): ClearGrade {
  if (accuracy >= 95) return 'S';
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 70) return 'C';
  return 'F';
}
