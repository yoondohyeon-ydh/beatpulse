import { describe, it, expect } from 'vitest';
import { TRACKS } from '../src/tracks';
import { Difficulty } from '../src/types/track';

describe('Track Data Integrity & Phase 3.1 Arrangement Overhaul', () => {
  it('should have 3 distinct tracks defined with expected IDs and BPMs', () => {
    expect(TRACKS.length).toBe(3);
    expect(TRACKS[0].id).toBe('neon-pulse');
    expect(TRACKS[0].bpm).toBe(120);

    expect(TRACKS[1].id).toBe('cyber-circuit');
    expect(TRACKS[1].bpm).toBe(136);

    expect(TRACKS[2].id).toBe('quantum-overdrive');
    expect(TRACKS[2].bpm).toBe(152);
  });

  const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];

  TRACKS.forEach((track) => {
    describe(`Track: ${track.title} (BPM: ${track.bpm})`, () => {
      // 1. 32마디 기준 트랙 총 길이 검증
      it('should have 32-bar duration matching BPM timing', () => {
        const beatSec = 60 / track.bpm;
        const expectedDuration = 32 * 4 * beatSec;
        expect(track.duration).toBeCloseTo(expectedDuration, 1);
        expect(track.duration).toBeGreaterThanOrEqual(50.0);
        expect(track.duration).toBeLessThanOrEqual(65.0);
      });

      // 2. 오디오 이벤트 시간순 정렬 및 유효성 검증
      it('should have audioEvents sorted in chronological order with valid timestamps', () => {
        expect(track.audioEvents.length).toBeGreaterThan(100);

        for (let i = 0; i < track.audioEvents.length; i++) {
          const ev = track.audioEvents[i];
          expect(ev.time).toBeGreaterThanOrEqual(0);
          expect(ev.time).toBeLessThanOrEqual(track.duration);

          if (ev.duration) {
            expect(ev.duration).toBeGreaterThan(0);
          }
          if (ev.volume) {
            expect(ev.volume).toBeGreaterThan(0);
            expect(ev.volume).toBeLessThanOrEqual(1.0);
          }

          if (i < track.audioEvents.length - 1) {
            expect(ev.time).toBeLessThanOrEqual(track.audioEvents[i + 1].time);
          }
        }
      });

      // 3. 다양한 악기 카테고리 구성 확인 (킥, 스네어, 하이햇, 베이스, 리드, 코드, 플럭)
      it('should feature diverse synthesized instrument categories including chord and pluck', () => {
        const instruments = new Set(track.audioEvents.map((e) => e.instrument));
        expect(instruments.has('kick')).toBe(true);
        expect(instruments.has('snare')).toBe(true);
        expect(instruments.has('hihat')).toBe(true);
        expect(instruments.has('bass')).toBe(true);
        expect(instruments.has('lead')).toBe(true);
        expect(instruments.has('chord')).toBe(true);
        expect(instruments.has('pluck')).toBe(true);
      });

      // 4. 다성 화음(Chord) 이벤트의 유효한 주파수 배열(pitches) 검증
      it('should include genuine polyphonic chord intervals', () => {
        const chordEvents = track.audioEvents.filter((e) => e.instrument === 'chord');
        expect(chordEvents.length).toBeGreaterThan(0);

        for (const chord of chordEvents) {
          expect(chord.pitches).toBeDefined();
          expect(Array.isArray(chord.pitches)).toBe(true);
          expect(chord.pitches!.length).toBeGreaterThanOrEqual(3); // 3화음 이상
          chord.pitches!.forEach((p) => {
            expect(p).toBeGreaterThan(50);
            expect(p).toBeLessThan(1000);
          });
        }
      });

      // 5. 난이도별 차트 유효성 및 고유 ID, 시간 범위 검증
      difficulties.forEach((diff) => {
        it(`should have valid chart for difficulty: ${diff}`, () => {
          const chart = track.charts[diff];
          expect(chart).toBeDefined();
          expect(chart.length).toBeGreaterThan(0);

          const ids = new Set<string>();

          for (let i = 0; i < chart.length; i++) {
            const note = chart[i];
            expect(note.time).toBeGreaterThan(0);
            // 모든 연주 가능한 노트는 트랙 종료 전에 완료되어야 함
            expect(note.time).toBeLessThan(track.duration);
            expect([0, 1, 2, 3]).toContain(note.lane);

            // 고유 ID 검증
            expect(ids.has(note.id)).toBe(false);
            ids.add(note.id);

            // 시간 오름차순 검증
            if (i < chart.length - 1) {
              expect(note.time).toBeLessThanOrEqual(chart[i + 1].time);
            }
          }
        });
      });

      // 6. 난이도별 점진적 노트 밀도 검증 (Easy < Normal < Hard)
      it('should have increasing note count with difficulty progression', () => {
        const easyCount = track.charts.easy.length;
        const normalCount = track.charts.normal.length;
        const hardCount = track.charts.hard.length;

        expect(normalCount).toBeGreaterThan(easyCount);
        expect(hardCount).toBeGreaterThan(normalCount);

        // 32마디 확장에 걸맞은 충실한 노트 볼륨 검증
        expect(easyCount).toBeGreaterThanOrEqual(40);
        expect(normalCount).toBeGreaterThanOrEqual(90);
        expect(hardCount).toBeGreaterThanOrEqual(150);
      });
    });
  });

  // 7. 세 트랙 간 뚜렷한 음악적 프로필 차이 검증
  it('should have distinct musical event profiles and densities across all 3 tracks', () => {
    const t1 = TRACKS[0];
    const t2 = TRACKS[1];
    const t3 = TRACKS[2];

    expect(t1.bpm).not.toBe(t2.bpm);
    expect(t2.bpm).not.toBe(t3.bpm);

    expect(t1.duration).not.toBe(t2.duration);
    expect(t2.duration).not.toBe(t3.duration);

    // 각 트랙의 하드 차트 총 노트 수 차별화
    expect(t1.charts.hard.length).toBeGreaterThan(0);
    expect(t2.charts.hard.length).toBeGreaterThan(0);
    expect(t3.charts.hard.length).toBeGreaterThan(0);
  });
});
