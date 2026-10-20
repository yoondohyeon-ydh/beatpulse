export type LaneIndex = 0 | 1 | 2 | 3;

export interface NoteEvent {
  id: string;
  time: number;          // 절대 게임 시간 (초)
  lane: LaneIndex;       // 4개 레인 (0: D, 1: F, 2: J, 3: K)
  duration?: number;     // 롱노트 지원용 (초, MVP에서는 주로 단타 노트)
  isJudged?: boolean;    // 중복 판정 방지 플래그
}

export type InstrumentType = 'kick' | 'snare' | 'hihat' | 'bass' | 'lead' | 'chord' | 'pluck';

export interface SoundEvent {
  id?: string;
  time: number;          // 발음 시각 (초 단위 절대 시간)
  instrument: InstrumentType;
  pitch?: number;        // 주파수 (Hz)
  pitches?: number[];    // 다성 화음 주파수 배열 (Hz, e.g. [220, 261.63, 329.63])
  duration?: number;     // 지속 시간 (초)
  volume?: number;       // 상대 볼륨 (0.0 ~ 1.0)
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;      // 트랙 총 재생 시간 (초)
  previewTime: number;   // 프리뷰 시작 시점
  audioEvents: SoundEvent[];
  charts: {
    easy: NoteEvent[];
    normal: NoteEvent[];
    hard: NoteEvent[];
  };
}
