import { TrackData, SoundEvent, NoteEvent } from '../types/track';

// Track 3: Quantum Overdrive (152 BPM)
// 1 beat = 60 / 152 ≈ 0.3947s
const BPM = 152;
const BEAT = 60 / BPM;

function generateTrack3Audio(): SoundEvent[] {
  const events: SoundEvent[] = [];
  const totalBars = 12; // 약 19초
  const totalBeats = totalBars * 4;

  for (let b = 0; b < totalBeats; b++) {
    const time = b * BEAT;

    // Hardcore Driving Kick: 매 비트 묵직한 킥
    events.push({
      time,
      instrument: 'kick',
      volume: 1.0,
    });

    // Snare: 짝수 비트 (하드 스네어)
    if (b % 2 === 1) {
      events.push({
        time,
        instrument: 'snare',
        volume: 0.9,
      });
    }

    // Hi-hat: 고속 16분음표 러시
    events.push({ time: time + BEAT * 0.25, instrument: 'hihat', volume: 0.6 });
    events.push({ time: time + BEAT * 0.5, instrument: 'hihat', volume: 0.75 });
    events.push({ time: time + BEAT * 0.75, instrument: 'hihat', volume: 0.6 });

    // Driving Fast Bass (F Minor: F, Ab, Bb, C)
    const bar = Math.floor(b / 4);
    const bassScale = [87.31, 103.83, 116.54, 130.81]; // F2, Ab2, Bb2, C3
    const rootBass = bassScale[bar % 4];
    events.push({
      time,
      instrument: 'bass',
      pitch: rootBass,
      duration: 0.15,
      volume: 0.8,
    });
    events.push({
      time: time + BEAT * 0.5,
      instrument: 'bass',
      pitch: rootBass * 1.5,
      duration: 0.15,
      volume: 0.8,
    });

    // Overdrive Lead: 고속 아르페지오 (글리치 느낌)
    const leadNotes = [700, 875, 1050, 1400];
    events.push({
      time: time + BEAT * 0.25,
      instrument: 'lead',
      pitch: leadNotes[b % leadNotes.length],
      duration: 0.12,
      volume: 0.7,
    });
    events.push({
      time: time + BEAT * 0.75,
      instrument: 'lead',
      pitch: leadNotes[(b + 2) % leadNotes.length],
      duration: 0.12,
      volume: 0.7,
    });
  }

  return events.sort((a, b) => a.time - b.time);
}

function generateTrack3Charts(): { easy: NoteEvent[]; normal: NoteEvent[]; hard: NoteEvent[] } {
  const easy: NoteEvent[] = [];
  const normal: NoteEvent[] = [];
  const hard: NoteEvent[] = [];

  const totalBars = 12;
  const totalBeats = totalBars * 4;

  // Easy: 빠른 템포이므로 2비트 정박으로 안정적 플레이 유도
  for (let b = 2; b < totalBeats - 2; b += 2) {
    const lane = ((b / 2) % 4) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t3-e-${b}`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });
  }

  // Normal: 매 비트 정박 + 싱코페이션
  for (let b = 2; b < totalBeats - 2; b++) {
    const lane = (b % 4) as 0 | 1 | 2 | 3;
    normal.push({
      id: `t3-n-${b}`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });

    if (b % 2 === 1) {
      normal.push({
        id: `t3-n-${b}-off`,
        time: Number((b * BEAT + BEAT * 0.5).toFixed(3)),
        lane: ((lane + 2) % 4) as 0 | 1 | 2 | 3,
      });
    }
  }

  // Hard: 초고속 8분/16분 난타 및 듀얼 노트 (Expert/Hard)
  for (let b = 2; b < totalBeats - 2; b++) {
    const lane = (b % 4) as 0 | 1 | 2 | 3;
    hard.push({
      id: `t3-h-${b}-1`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });

    hard.push({
      id: `t3-h-${b}-2`,
      time: Number((b * BEAT + BEAT * 0.5).toFixed(3)),
      lane: ((lane + 1) % 4) as 0 | 1 | 2 | 3,
    });

    // 더블 탭
    if (b % 4 === 0) {
      hard.push({
        id: `t3-h-${b}-dual`,
        time: Number((b * BEAT).toFixed(3)),
        lane: ((lane + 2) % 4) as 0 | 1 | 2 | 3,
      });
    }

    // 16분 초고속 연타
    if (b % 4 === 2) {
      hard.push({
        id: `t3-h-${b}-quad`,
        time: Number((b * BEAT + BEAT * 0.25).toFixed(3)),
        lane: ((lane + 3) % 4) as 0 | 1 | 2 | 3,
      });
    }
  }

  return {
    easy: easy.sort((a, b) => a.time - b.time),
    normal: normal.sort((a, b) => a.time - b.time),
    hard: hard.sort((a, b) => a.time - b.time),
  };
}

export const track3Quantum: TrackData = {
  id: 'quantum-overdrive',
  title: 'Quantum Overdrive',
  artist: 'PULSE ENGINE',
  bpm: BPM,
  duration: 20.0,
  previewTime: 3.0,
  audioEvents: generateTrack3Audio(),
  charts: generateTrack3Charts(),
};
