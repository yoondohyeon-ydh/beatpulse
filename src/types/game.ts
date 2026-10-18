export type JudgmentType = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | 'NONE';

export interface JudgmentResult {
  type: JudgmentType;
  errorMs: number;    // 음수: Early(빠름), 양수: Late(느림)
  absErrorMs: number; // 절댓값 오차 (ms)
}

export type GameState = 'READY' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'RESULT';

export type ClearGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface ScoreStats {
  score: number;
  combo: number;
  maxCombo: number;
  counts: {
    PERFECT: number;
    GREAT: number;
    GOOD: number;
    MISS: number;
  };
  accuracy: number;  // 0.0 ~ 100.0 %
  grade: ClearGrade;
}

export interface HighScoreRecord {
  trackId: string;
  difficulty: string;
  highScore: number;
  maxCombo: number;
  accuracy: number;
  grade: ClearGrade;
  updatedAt: number; // timestamp
}

export interface UserSettings {
  userOffsetMs: number;   // -200ms ~ +200ms
  bgmVolume: number;      // 0.0 ~ 1.0
  sfxVolume: number;      // 0.0 ~ 1.0
  noteSpeed: number;      // 1.0 ~ 3.0 배속
}
