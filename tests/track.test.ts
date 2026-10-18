import { describe, it, expect } from 'vitest';
import { TRACKS } from '../src/tracks';
import { Difficulty } from '../src/types/track';

describe('Track Data Integrity', () => {
  it('should have 3 distinct tracks defined', () => {
    expect(TRACKS.length).toBe(3);
    expect(TRACKS[0].id).toBe('neon-pulse');
    expect(TRACKS[1].id).toBe('cyber-circuit');
    expect(TRACKS[2].id).toBe('quantum-overdrive');
  });

  const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];

  TRACKS.forEach((track) => {
    describe(`Track: ${track.title} (BPM: ${track.bpm})`, () => {
      it('should have audioEvents sorted in chronological order', () => {
        expect(track.audioEvents.length).toBeGreaterThan(0);
        for (let i = 0; i < track.audioEvents.length - 1; i++) {
          expect(track.audioEvents[i].time).toBeLessThanOrEqual(track.audioEvents[i + 1].time);
        }
      });

      difficulties.forEach((diff) => {
        it(`should have valid chart for difficulty: ${diff}`, () => {
          const chart = track.charts[diff];
          expect(chart).toBeDefined();
          expect(chart.length).toBeGreaterThan(0);

          // 시간 오름차순 검증 및 레인 유효성(0~3) 검증
          for (let i = 0; i < chart.length; i++) {
            const note = chart[i];
            expect(note.time).toBeGreaterThan(0);
            expect([0, 1, 2, 3]).toContain(note.lane);

            if (i < chart.length - 1) {
              expect(note.time).toBeLessThanOrEqual(chart[i + 1].time);
            }
          }
        });
      });

      it('should have increasing note count with difficulty progression', () => {
        const easyCount = track.charts.easy.length;
        const normalCount = track.charts.normal.length;
        const hardCount = track.charts.hard.length;

        expect(normalCount).toBeGreaterThan(easyCount);
        expect(hardCount).toBeGreaterThan(normalCount);
      });
    });
  });
});
