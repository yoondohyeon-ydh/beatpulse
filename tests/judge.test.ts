import { describe, it, expect } from 'vitest';
import {
  evaluateHit,
  isAutoMiss,
  processHitInput,
  processAutoMisses,
  clampOffset,
} from '../src/engine/JudgeEngine';
import { NoteEvent } from '../src/types/track';

describe('JudgeEngine - evaluateHit and Timing Windows', () => {
  it('should return PERFECT for exact 0ms error', () => {
    const res = evaluateHit(1.0, 1.0, 0);
    expect(res.type).toBe('PERFECT');
    expect(res.errorMs).toBe(0);
    expect(res.absErrorMs).toBe(0);
  });

  it('should verify PERFECT boundary at +/- 45ms', () => {
    // 45.0ms -> PERFECT
    const resEarly = evaluateHit(0.955, 1.0, 0);
    expect(resEarly.type).toBe('PERFECT');
    expect(resEarly.absErrorMs).toBeCloseTo(45, 1);

    const resLate = evaluateHit(1.045, 1.0, 0);
    expect(resLate.type).toBe('PERFECT');
    expect(resLate.absErrorMs).toBeCloseTo(45, 1);

    // 45.1ms -> GREAT
    const resOver = evaluateHit(1.0451, 1.0, 0);
    expect(resOver.type).toBe('GREAT');
  });

  it('should verify GREAT boundary at +/- 90ms', () => {
    const res90 = evaluateHit(1.090, 1.0, 0);
    expect(res90.type).toBe('GREAT');
    expect(res90.absErrorMs).toBeCloseTo(90, 1);

    const resOver90 = evaluateHit(1.0901, 1.0, 0);
    expect(resOver90.type).toBe('GOOD');
  });

  it('should verify GOOD boundary at +/- 140ms', () => {
    const res140 = evaluateHit(1.140, 1.0, 0);
    expect(res140.type).toBe('GOOD');
    expect(res140.absErrorMs).toBeCloseTo(140, 1);

    // 140.1ms 초과는 NONE
    const resOver140 = evaluateHit(1.1401, 1.0, 0);
    expect(resOver140.type).toBe('NONE');
  });

  it('should correctly apply positive offset for late tap compensation', () => {
    // 사용자가 소리가 늦게 들려 50ms 늦게 쳤음 (hit = 1.050s, target = 1.000s)
    // 오프셋 50ms를 적용하면 실질 오차가 0ms가 되어 PERFECT로 보정되어야 함
    const res = evaluateHit(1.050, 1.000, 50);
    expect(res.type).toBe('PERFECT');
    expect(res.errorMs).toBeCloseTo(0, 2);
  });

  it('should correctly apply negative offset for early tap compensation', () => {
    // 사용자가 50ms 빠르게 쳤음 (hit = 0.950s, target = 1.000s)
    // 오프셋 -50ms를 적용하면 실질 오차가 0ms가 되어 PERFECT로 보정되어야 함
    const res = evaluateHit(0.950, 1.000, -50);
    expect(res.type).toBe('PERFECT');
    expect(res.errorMs).toBeCloseTo(0, 2);
  });

  it('should clamp offset to [-200ms, +200ms]', () => {
    expect(clampOffset(300)).toBe(200);
    expect(clampOffset(-250)).toBe(-200);
    expect(clampOffset(50)).toBe(50);
  });
});

describe('JudgeEngine - Early Input Protection & Once-only Judgment', () => {
  it('should preserve note state and return NONE for early hits beyond 140ms', () => {
    const notes: NoteEvent[] = [
      { id: 'n1', time: 1.0, lane: 0, isJudged: false },
    ];

    // 목표 시간(1.0s)보다 200ms 일찍 탭 (0.8s) -> errorMs = -200ms
    const { hitNote, judgment } = processHitInput(notes, 0, 0.8, 0);

    expect(hitNote).toBeNull();
    expect(judgment.type).toBe('NONE');
    expect(judgment.errorMs).toBeCloseTo(-200, 1);
    // 노트를 소비하지 않고 보존해야 함
    expect(notes[0].isJudged).toBe(false);
  });

  it('should strictly judge a note only once and prevent double scoring', () => {
    const notes: NoteEvent[] = [
      { id: 'n1', time: 1.0, lane: 0, isJudged: false },
    ];

    // 첫 번째 타격 (1.020s -> PERFECT)
    const firstAttempt = processHitInput(notes, 0, 1.020, 0);
    expect(firstAttempt.hitNote).not.toBeNull();
    expect(firstAttempt.judgment.type).toBe('PERFECT');
    expect(notes[0].isJudged).toBe(true);

    // 두 번째 타격 (1.025s -> 이미 판정된 노트이므로 타격 대상 없음)
    const secondAttempt = processHitInput(notes, 0, 1.025, 0);
    expect(secondAttempt.hitNote).toBeNull();
    expect(secondAttempt.judgment.type).toBe('NONE');
  });

  it('should process auto MISS once when deadline passes', () => {
    const notes: NoteEvent[] = [
      { id: 'n1', time: 1.0, lane: 0, isJudged: false },
    ];

    // 마감 시각: targetTime(1.0) + GOOD_MS(0.14) = 1.140s
    // 1.130s 시점: 아직 MISS 아님
    expect(isAutoMiss(1.0, 1.130, 0)).toBe(false);
    let misses = processAutoMisses(notes, 1.130, 0);
    expect(misses.length).toBe(0);
    expect(notes[0].isJudged).toBe(false);

    // 1.150s 시점: 마감 초과 -> 자동 MISS 1회 처리
    expect(isAutoMiss(1.0, 1.150, 0)).toBe(true);
    misses = processAutoMisses(notes, 1.150, 0);
    expect(misses.length).toBe(1);
    expect(misses[0].id).toBe('n1');
    expect(notes[0].isJudged).toBe(true);

    // 그 다음 프레임(1.160s): 이미 판정되었으므로 다시 MISS 처리되지 않아야 함
    const nextMisses = processAutoMisses(notes, 1.160, 0);
    expect(nextMisses.length).toBe(0);
  });

  it('should respect userOffset in auto MISS calculation', () => {
    // 오프셋이 +50ms인 경우 마감 시각은 1.0 + 0.05 + 0.14 = 1.190s
    expect(isAutoMiss(1.0, 1.150, 50)).toBe(false);
    expect(isAutoMiss(1.0, 1.191, 50)).toBe(true);
  });

  it('should have exact boundary consistency between evaluateHit and isAutoMiss at 140.00ms and 140.01ms', () => {
    // 1) 정확히 140.00ms 시점 (target = 1.0, time = 1.1400)
    const target = 1.0;
    const exact140 = 1.1400;
    const hitRes140 = evaluateHit(exact140, target, 0);
    expect(hitRes140.type).toBe('GOOD'); // 140.00ms는 GOOD이어야 함
    expect(isAutoMiss(target, exact140, 0)).toBe(false); // 140.00ms는 아직 MISS가 아니어야 함

    // 2) 140.01ms 초과 시점 (target = 1.0, time = 1.14001 -> 140.01ms)
    const over140 = 1.14001;
    const hitResOver = evaluateHit(over140, target, 0);
    expect(hitResOver.type).toBe('NONE'); // GOOD 윈도우 초과
    expect(isAutoMiss(target, over140, 0)).toBe(true); // 정확히 MISS로 전환

    // 3) 오프셋 +50ms 적용 시 동일한 140.00ms vs 140.01ms 일관성
    const offset = 50;
    const exact140WithOffset = 1.1900; // 1.0 + 0.05 + 0.14 = 1.19
    expect(evaluateHit(exact140WithOffset, target, offset).type).toBe('GOOD');
    expect(isAutoMiss(target, exact140WithOffset, offset)).toBe(false);

    const over140WithOffset = 1.19001;
    expect(evaluateHit(over140WithOffset, target, offset).type).toBe('NONE');
    expect(isAutoMiss(target, over140WithOffset, offset)).toBe(true);

    // 4) 음수 오프셋 -50ms 적용 시 동일한 일관성
    const negOffset = -50;
    const exact140WithNegOffset = 1.0900; // 1.0 - 0.05 + 0.14 = 1.09
    expect(evaluateHit(exact140WithNegOffset, target, negOffset).type).toBe('GOOD');
    expect(isAutoMiss(target, exact140WithNegOffset, negOffset)).toBe(false);

    const over140WithNegOffset = 1.09001;
    expect(evaluateHit(over140WithNegOffset, target, negOffset).type).toBe('NONE');
    expect(isAutoMiss(target, over140WithNegOffset, negOffset)).toBe(true);
  });
});
