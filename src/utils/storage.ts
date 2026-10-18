import { HighScoreRecord, UserSettings, ClearGrade } from '../types/game';
import { Difficulty } from '../types/track';

const SETTINGS_KEY = 'beatpulse_user_settings';
const RECORD_PREFIX = 'beatpulse_record_';

// In-memory fallback for test runners or environments where localStorage is unavailable
const memoryStorage = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // fallback to memory
  }
  return memoryStorage.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fallback to memory
  }
  memoryStorage.set(key, value);
}

export const DEFAULT_SETTINGS: UserSettings = {
  userOffsetMs: 0,
  bgmVolume: 0.85,
  sfxVolume: 0.85,
  noteSpeed: 1.0,
};

/**
 * 안전한 사용자 설정 로드
 */
export function loadUserSettings(): UserSettings {
  try {
    const raw = getStorageItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      userOffsetMs: typeof parsed.userOffsetMs === 'number' ? parsed.userOffsetMs : DEFAULT_SETTINGS.userOffsetMs,
      bgmVolume: typeof parsed.bgmVolume === 'number' ? parsed.bgmVolume : DEFAULT_SETTINGS.bgmVolume,
      sfxVolume: typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : DEFAULT_SETTINGS.sfxVolume,
      noteSpeed: typeof parsed.noteSpeed === 'number' ? parsed.noteSpeed : DEFAULT_SETTINGS.noteSpeed,
    };
  } catch (e) {
    console.warn('Failed to load user settings:', e);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 사용자 설정 저장
 */
export function saveUserSettings(settings: UserSettings): void {
  try {
    setStorageItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save user settings:', e);
  }
}

/**
 * 트랙 및 난이도별 최고 기록 로드
 */
export function loadHighScore(trackId: string, difficulty: Difficulty): HighScoreRecord | null {
  try {
    const key = `${RECORD_PREFIX}${trackId}_${difficulty}`;
    const raw = getStorageItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.highScore !== 'number') return null;
    return data as HighScoreRecord;
  } catch (e) {
    console.warn('Failed to load high score:', e);
    return null;
  }
}

/**
 * 새로운 점수 기록 시 최고 점수 갱신 확인 및 저장
 * @returns 최고 기록 갱신 여부 (boolean)
 */
export function saveHighScore(
  trackId: string,
  difficulty: Difficulty,
  score: number,
  maxCombo: number,
  accuracy: number,
  grade: ClearGrade
): { isNewRecord: boolean; record: HighScoreRecord } {
  const current = loadHighScore(trackId, difficulty);
  const isNewRecord = !current || score > current.highScore;

  const newRecord: HighScoreRecord = {
    trackId,
    difficulty,
    highScore: Math.max(score, current?.highScore ?? 0),
    maxCombo: Math.max(maxCombo, current?.maxCombo ?? 0),
    accuracy: isNewRecord ? accuracy : Math.max(accuracy, current?.accuracy ?? 0),
    grade: isNewRecord ? grade : (current?.grade ?? grade),
    updatedAt: Date.now(),
  };

  if (isNewRecord) {
    try {
      const key = `${RECORD_PREFIX}${trackId}_${difficulty}`;
      setStorageItem(key, JSON.stringify(newRecord));
    } catch (e) {
      console.warn('Failed to save high score:', e);
    }
  }

  return { isNewRecord, record: newRecord };
}
