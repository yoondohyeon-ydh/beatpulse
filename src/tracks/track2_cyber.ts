import { TrackData, SoundEvent, NoteEvent } from '../types/track';

// Track 2: Cyber Circuit (136 BPM)
// 1 beat = 60 / 136 ≈ 0.4412s
const BPM = 136;
const BEAT = 60 / BPM;

function generateTrack2Audio(): SoundEvent[] {
  const events: SoundEvent[] = [];
  const totalBars = 12; // 약 21.2초
  const totalBeats = totalBars * 4;

  for (let b = 0; b < totalBeats; b++) {
    const time = b * BEAT;

    // Drum Breakbeat 패턴:
    // 비트 0, 1.5, 2.5에 킥
    events.push({
      time,
      instrument: 'kick',
      volume: 0.95,
    });
    if (b % 2 === 0) {
      events.push({
        time: time + BEAT * 0.75,
        instrument: 'kick',
        volume: 0.8,
      });
    }

    // Snare: 매 2번째 비트 (정박 1, 3)
    if (b % 2 === 1) {
      events.push({
        time,
        instrument: 'snare',
        volume: 0.85,
      });
    }

    // Hi-hat: 16분음표 롤
    events.push({ time: time + BEAT * 0.25, instrument: 'hihat', volume: 0.5 });
    events.push({ time: time + BEAT * 0.5, instrument: 'hihat', volume: 0.65 });
    events.push({ time: time + BEAT * 0.75, instrument: 'hihat', volume: 0.5 });

    // Acid / Cyber Bass (D Minor: D, F, G, Bb)
    const bar = Math.floor(b / 4);
    const bassNotes = [146.83, 174.61, 196.0, 116.54]; // D3, F3, G3, Bb2
    const currentNote = bassNotes[bar % 4];
    events.push({
      time,
      instrument: 'bass',
      pitch: currentNote,
      duration: 0.2,
      volume: 0.75,
    });

    // Lead Arp: 사이버 감성 빠른 아르페지오
    if (bar >= 1) {
      const arp = [587.33, 698.46, 783.99, 880.0]; // D5, F5, G5, A5
      events.push({
        time: time + BEAT * 0.25,
        instrument: 'lead',
        pitch: arp[(b * 2) % arp.length],
        duration: 0.18,
        volume: 0.6,
      });
      events.push({
        time: time + BEAT * 0.75,
        instrument: 'lead',
        pitch: arp[(b * 2 + 1) % arp.length],
        duration: 0.18,
        volume: 0.6,
      });
    }
  }

  return events.sort((a, b) => a.time - b.time);
}

function generateTrack2Charts(): { easy: NoteEvent[]; normal: NoteEvent[]; hard: NoteEvent[] } {
  const easy: NoteEvent[] = [];
  const normal: NoteEvent[] = [];
  const hard: NoteEvent[] = [];

  const totalBars = 12;
  const totalBeats = totalBars * 4;

  // Easy: 정박 위주 (2비트 간격)
  for (let b = 2; b < totalBeats - 2; b += 2) {
    const lane = ((b / 2) % 4) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t2-e-${b}`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });
  }

  // Normal: 브레이크비트 스네어/킥 리듬 매핑
  for (let b = 2; b < totalBeats - 2; b++) {
    const lane = (b % 4) as 0 | 1 | 2 | 3;
    normal.push({
      id: `t2-n-${b}`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });

    if (b % 2 === 0) {
      normal.push({
        id: `t2-n-${b}-sync`,
        time: Number((b * BEAT + BEAT * 0.5).toFixed(3)),
        lane: ((lane + 2) % 4) as 0 | 1 | 2 | 3,
      });
    }
  }

  // Hard: 16분음표 콤보 및 양손 교차 패턴
  for (let b = 2; b < totalBeats - 2; b++) {
    const lane = (b % 4) as 0 | 1 | 2 | 3;
    hard.push({
      id: `t2-h-${b}-1`,
      time: Number((b * BEAT).toFixed(3)),
      lane,
    });

    hard.push({
      id: `t2-h-${b}-2`,
      time: Number((b * BEAT + BEAT * 0.5).toFixed(3)),
      lane: ((lane + 1) % 4) as 0 | 1 | 2 | 3,
    });

    // 16분 트릴 (빠른 연타)
    if (b % 3 === 0) {
      hard.push({
        id: `t2-h-${b}-trill`,
        time: Number((b * BEAT + BEAT * 0.75).toFixed(3)),
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

export const track2Cyber: TrackData = {
  id: 'cyber-circuit',
  title: 'Cyber Circuit',
  artist: 'PULSE ENGINE',
  bpm: BPM,
  duration: 22.0,
  previewTime: 3.5,
  audioEvents: generateTrack2Audio(),
  charts: generateTrack2Charts(),
};
