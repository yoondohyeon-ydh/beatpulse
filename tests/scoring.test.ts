import { describe, it, expect } from 'vitest';
import {
  calculateHitScore,
  calculateAccuracy,
  calculateGrade,
} from '../src/engine/JudgeEngine';

describe('Scoring & Accuracy Logic', () => {
  it('should calculate base scores and combo bonus accurately', () => {
    // 콤보 0일 때: PERFECT 1000, GREAT 700, GOOD 400, MISS 0
    expect(calculateHitScore('PERFECT', 0)).toBe(1000);
    expect(calculateHitScore('GREAT', 0)).toBe(700);
    expect(calculateHitScore('GOOD', 0)).toBe(400);
    expect(calculateHitScore('MISS', 0)).toBe(0);

    // 콤보 10일 때: 10 * 10 = 100점 추가
    expect(calculateHitScore('PERFECT', 10)).toBe(1100);
    expect(calculateHitScore('GREAT', 10)).toBe(800);

    // 콤보 보너스 상한선 (50콤보): 50 * 10 = 500점 상한
    expect(calculateHitScore('PERFECT', 50)).toBe(1500);
    expect(calculateHitScore('PERFECT', 100)).toBe(1500); // 50 초과해도 500점 고정
  });

  it('should calculate accuracy percentage correctly', () => {
    // 0개 판정 시 100%
    expect(calculateAccuracy({ PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 })).toBe(100);

    // 10 PERFECT -> 100%
    expect(calculateAccuracy({ PERFECT: 10, GREAT: 0, GOOD: 0, MISS: 0 })).toBe(100);

    // 10 GREAT (가중치 0.7) -> 70%
    expect(calculateAccuracy({ PERFECT: 0, GREAT: 10, GOOD: 0, MISS: 0 })).toBe(70);

    // 10 GOOD (가중치 0.4) -> 40%
    expect(calculateAccuracy({ PERFECT: 0, GREAT: 0, GOOD: 10, MISS: 0 })).toBe(40);

    // 5 PERFECT, 5 MISS -> (5*1.0 + 0) / 10 = 50%
    expect(calculateAccuracy({ PERFECT: 5, GREAT: 0, GOOD: 0, MISS: 5 })).toBe(50);
  });

  it('should assign grades according to accuracy thresholds', () => {
    expect(calculateGrade(96)).toBe('S');
    expect(calculateGrade(95.0)).toBe('S');

    expect(calculateGrade(94.99)).toBe('A');
    expect(calculateGrade(90.0)).toBe('A');

    expect(calculateGrade(89.9)).toBe('B');
    expect(calculateGrade(80.0)).toBe('B');

    expect(calculateGrade(79.9)).toBe('C');
    expect(calculateGrade(70.0)).toBe('C');

    expect(calculateGrade(69.9)).toBe('F');
    expect(calculateGrade(0)).toBe('F');
  });
});
