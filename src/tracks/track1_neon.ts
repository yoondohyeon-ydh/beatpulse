import { TrackData, SoundEvent, NoteEvent } from '../types/track';

// Track 1: Neon Pulse (120 BPM)
// 1 beat = 0.5s, 1 bar (4 beats) = 2.0s
const BPM = 120;
const BEAT = 60 / BPM; // 0.5초

function generateTrack1Audio(): SoundEvent[] {
  const events: SoundEvent[] = [];
  const totalBars = 12; // 24초
  const totalBeats = totalBars * 4; // 48비트

  for (let b = 0; b < totalBeats; b++) {
    const time = b * BEAT;

    // 4-on-the-floor Kick: 매 비트마다 킥
    events.push({
      time,
      instrument: 'kick',
      volume: 0.9,
    });

    // Snare / Clap: 2번째, 4번째 비트
    if (b % 2 === 1) {
      events.push({
        time,
        instrument: 'snare',
        volume: 0.8,
      });
    }

    // Hi-hat: 8분음표 오프비트
    events.push({
      time: time + BEAT / 2,
      instrument: 'hihat',
      volume: 0.6,
    });

    // Synth Bass: 아르페지오 베이스 (Root notes: A -> F -> C -> G)
    const bar = Math.floor(b / 4);
    const bassPitches = [110, 87.31, 130.81, 98]; // A2, F2, C3, G2
    const currentBass = bassPitches[bar % 4];
    events.push({
      time,
      instrument: 'bass',
      pitch: currentBass,
      duration: 0.35,
      volume: 0.7,
    });
    events.push({
      time: time + BEAT / 2,
      instrument: 'bass',
      pitch: currentBass * 1.5,
      duration: 0.2,
      volume: 0.5,
    });

    // Lead Melody: 네온 멜로디 (후반부 4마디부터 등장)
    if (bar >= 2) {
      const scale = [440, 523.25, 587.33, 659.25, 783.99]; // A4, C5, D5, E5, G5
      const notePitch = scale[(b * 3) % scale.length];
      events.push({
        time,
        instrument: 'lead',
        pitch: notePitch,
        duration: 0.4,
        volume: 0.65,
      });
    }
  }

  // 시간순 정렬
  return events.sort((a, b) => a.time - b.time);
}

function generateTrack1Charts(): { easy: NoteEvent[]; normal: NoteEvent[]; hard: NoteEvent[] } {
  const easy: NoteEvent[] = [];
  const normal: NoteEvent[] = [];
  const hard: NoteEvent[] = [];

  const totalBars = 12; // 24초
  const totalBeats = totalBars * 4;

  // Easy: 1박자 위주 (정박), 레인 1과 2 중심
  for (let b = 2; b < totalBeats - 2; b += 2) {
    const lane = (b % 4 === 0 ? 1 : 2) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t1-e-${b}`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });
  }

  // Normal: 1박자 정박 + 스네어/하이햇 싱코페이션 (레인 0, 1, 2, 3 분배)
  for (let b = 2; b < totalBeats - 2; b++) {
    const lane = (b % 4) as 0 | 1 | 2 | 3;
    normal.push({
      id: `t1-n-${b}`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });

    // 8마디 이후 가끔 8분음표 추가
    if (b >= 16 && b % 3 === 0) {
      const offLane = ((lane + 2) % 4) as 0 | 1 | 2 | 3;
      normal.push({
        id: `t1-n-${b}-off`,
        time: Number((b * BEAT + BEAT / 2).toFixed(3)),
        lane: offLane,
      });
    }
  }

  // Hard: 8분음표 드라이브 및 동시 탭 (밀도 높음)
  for (let b = 2; b < totalBeats - 2; b++) {
    const lane = (b % 4) as 0 | 1 | 2 | 3;
    hard.push({
      id: `t1-h-${b}-1`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });

    const offLane = ((lane + 1) % 4) as 0 | 1 | 2 | 3;
    hard.push({
      id: `t1-h-${b}-2`,
      time: Number((b * BEAT + BEAT / 2).toFixed(3)),
      lane: offLane,
    });

    // 4마디마다 동시치기(Double tap)
    if (b % 4 === 0) {
      const dualLane = ((lane + 3) % 4) as 0 | 1 | 2 | 3;
      hard.push({
        id: `t1-h-${b}-dual`,
        time: Number((b * BEAT).toFixed(3)),
        lane: dualLane,
      });
    }
  }

  return {
    easy: easy.sort((a, b) => a.time - b.time),
    normal: normal.sort((a, b) => a.time - b.time),
    hard: hard.sort((a, b) => a.time - b.time),
  };
}

export const track1Neon: TrackData = {
  id: 'neon-pulse',
  title: 'Neon Pulse',
  artist: 'PULSE ENGINE',
  bpm: BPM,
  duration: 25.0,
  previewTime: 4.0,
  audioEvents: generateTrack1Audio(),
  charts: generateTrack1Charts(),
};
