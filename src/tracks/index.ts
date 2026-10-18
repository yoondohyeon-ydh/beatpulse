import { TrackData, NoteEvent, Difficulty } from '../types/track';
import { track1Neon } from './track1_neon';
import { track2Cyber } from './track2_cyber';
import { track3Quantum } from './track3_quantum';

export const TRACKS: TrackData[] = [
  track1Neon,
  track2Cyber,
  track3Quantum,
];

/**
 * 게임 시작 시 사용할 새로운 노트 배열을 복제하여 생성합니다.
 * (모든 isJudged 상태가 false로 초기화됨)
 */
export function getClonedChart(track: TrackData, difficulty: Difficulty): NoteEvent[] {
  const chart = track.charts[difficulty] || track.charts.normal;
  return chart.map((note) => ({
    ...note,
    isJudged: false,
  }));
}

export function getTrackById(id: string): TrackData {
  return TRACKS.find((t) => t.id === id) || TRACKS[0];
}
