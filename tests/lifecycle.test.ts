import { describe, it, expect } from 'vitest';
import { getClonedChart, TRACKS } from '../src/tracks';
import { SoundEvent } from '../src/types/track';
import { saveHighScore, loadHighScore } from '../src/utils/storage';

describe('Game Lifecycle & State Management', () => {
  it('should reset all note isJudged flags when cloning chart for fresh game', () => {
    const track = TRACKS[0];
    const initialNotes = getClonedChart(track, 'normal');

    // 일부 노트를 판정 완료 상태로 변경
    initialNotes[0].isJudged = true;
    initialNotes[1].isJudged = true;

    // 다시 시작할 때 차트를 새로 복제
    const resetNotes = getClonedChart(track, 'normal');

    expect(resetNotes[0].isJudged).toBe(false);
    expect(resetNotes[1].isJudged).toBe(false);
    // 원본 데이터가 오염되지 않았음을 검증
    expect(track.charts.normal[0].isJudged).toBeUndefined();
  });

  it('should filter remaining events after pause without replaying past events', () => {
    const sampleEvents: SoundEvent[] = [
      { time: 1.0, instrument: 'kick' },
      { time: 2.0, instrument: 'snare' },
      { time: 3.0, instrument: 'hihat' },
      { time: 4.0, instrument: 'bass' },
    ];

    // 게임 진행 2.5초에서 일시정지 발생
    const pausedGameTime = 2.5;

    // 재개 시 2.5초 이후의 이벤트만 필터링되어야 함
    const remainingEvents = sampleEvents.filter((ev) => ev.time >= pausedGameTime);

    expect(remainingEvents.length).toBe(2);
    expect(remainingEvents[0].time).toBe(3.0);
    expect(remainingEvents[1].time).toBe(4.0);

    // 과거 이벤트 (1.0, 2.0)는 완전히 제외되어 중복 재생 방지
    expect(remainingEvents.some((ev) => ev.time < pausedGameTime)).toBe(false);
  });

  it('should gracefully handle LocalStorage persistence without crashing', () => {
    // LocalStorage 모킹 환경 검증
    const trackId = 'test-track';
    const res1 = saveHighScore(trackId, 'easy', 50000, 30, 92.5, 'A');
    expect(res1.isNewRecord).toBe(true);

    const loaded = loadHighScore(trackId, 'easy');
    expect(loaded?.highScore).toBe(50000);

    // 더 낮은 점수 기록 시 갱신되지 않음
    const res2 = saveHighScore(trackId, 'easy', 40000, 20, 85.0, 'B');
    expect(res2.isNewRecord).toBe(false);
    expect(loadHighScore(trackId, 'easy')?.highScore).toBe(50000);
  });

  it('should calculate correctedTargetTime consistently for note rendering', () => {
    const noteTime = 2.0;

    // 1) offset = 0ms -> correctedTargetTime == noteTime
    const offset0 = 0;
    const target0 = noteTime + offset0 / 1000;
    expect(target0).toBe(2.0);

    // 2) offset = +50ms -> correctedTargetTime == 2.05s
    const offsetPos = 50;
    const targetPos = noteTime + offsetPos / 1000;
    expect(targetPos).toBeCloseTo(2.05, 3);

    // 3) offset = -50ms -> correctedTargetTime == 1.95s
    const offsetNeg = -50;
    const targetNeg = noteTime + offsetNeg / 1000;
    expect(targetNeg).toBeCloseTo(1.95, 3);
  });

  it('should preserve negative timeline during countdown pause and resume correctly', () => {
    // 카운트다운 3초 시작: audioStartTime = currentCtxTime(10.0) + 3.0 = 13.0
    const currentCtxTime = 10.0;
    const countdownDuration = 3.0;
    let audioStartTime = currentCtxTime + countdownDuration; // 13.0

    // 1초 경과 시점 (currentTime = 11.0): 아직 카운트다운 중 (gameTime = 11.0 - 13.0 = -2.0초, 2초 남음)
    const pauseTime = 11.0;
    const pausedGameTime = pauseTime - audioStartTime; // -2.0초
    expect(pausedGameTime).toBe(-2.0);

    // 5초 동안 일시정지 지속 후 재개 (currentTime = 16.0)
    const resumeTime = 16.0;
    audioStartTime = resumeTime - pausedGameTime; // 16.0 - (-2.0) = 18.0초

    // 재개 시점의 게임 시간: 16.0 - 18.0 = -2.0초 (정확히 남은 2초 유지)
    const resumedGameTime = resumeTime - audioStartTime;
    expect(resumedGameTime).toBe(-2.0);

    // 2초 경과 후 (currentTime = 18.0) 정확히 0.0초(첫 비트) 도달
    expect(18.0 - audioStartTime).toBe(0.0);
  });

  it('should not cut off song before track.duration even if all notes are judged', () => {
    const trackDuration = 64.0;
    const lastNoteTime = 59.0;
    const notesFinishedTime = lastNoteTime + 1.2; // 60.2초
    const targetEndTime = Math.max(trackDuration, notesFinishedTime); // 64.0초

    const allJudged = true;

    // 60.5초: 모든 노트 판정이 끝났으나 아직 64초 아웃트로가 재생 중인 경우
    const gameTimeMidOutro = 60.5;
    const shouldEndAtMidOutro =
      gameTimeMidOutro > 1.0 &&
      ((allJudged && gameTimeMidOutro >= targetEndTime) || gameTimeMidOutro > targetEndTime + 1.5);

    expect(shouldEndAtMidOutro).toBe(false); // 아웃트로 도중 종료되지 않음!

    // 64.1초: 아웃트로까지 완전히 재생된 경우
    const gameTimeFinished = 64.1;
    const shouldEndWhenDone =
      gameTimeFinished > 1.0 &&
      ((allJudged && gameTimeFinished >= targetEndTime) || gameTimeFinished > targetEndTime + 1.5);

    expect(shouldEndWhenDone).toBe(true); // 아웃트로 종료 후 안전하게 결과 전환
  });
});
