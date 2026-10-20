import { TrackData, SoundEvent, NoteEvent } from '../types/track';

// Track 3: Quantum Overdrive (152 BPM, High-Energy Futuristic Cyber)
// 1 beat = 60 / 152 ≈ 0.394737s
// 32 bars ≈ 50.53s
const BPM = 152;
const BEAT = 60 / BPM;
const TOTAL_BARS = 32;
const TOTAL_DURATION = Number((TOTAL_BARS * 4 * BEAT).toFixed(2)); // 50.53초

interface ChordInfo {
  name: string;
  pitches: number[];
  root: number;
}

const CHORDS: Record<string, ChordInfo> = {
  Fm: { name: 'Fm', pitches: [174.61, 207.65, 261.63], root: 87.31 },  // F2 root, F3 Ab3 C4
  Db: { name: 'Db', pitches: [138.59, 174.61, 207.65], root: 69.3 },   // Db2 root, Db3 F3 Ab3
  Ab: { name: 'Ab', pitches: [207.65, 261.63, 311.13], root: 103.83 }, // Ab2 root, Ab3 C4 Eb4
  Eb: { name: 'Eb', pitches: [155.56, 196.0, 233.08], root: 77.78 },   // Eb2 root, Eb3 G3 Bb3
  Bbm: { name: 'Bbm', pitches: [233.08, 277.18, 349.23], root: 116.54 }, // Bb2 root, Bb3 Db4 F4
  C: { name: 'C', pitches: [130.81, 164.81, 196.0], root: 65.41 },     // C2 root, C3 E3 G3
};

function getBarChord(bar: number): ChordInfo {
  if (bar < 4) {
    // Intro: Fm -> Db -> Ab -> Eb
    const prog = ['Fm', 'Db', 'Ab', 'Eb'];
    return CHORDS[prog[bar % 4]];
  } else if (bar < 12) {
    // Build: Fm -> Db -> Bbm -> C (x2)
    const prog = ['Fm', 'Db', 'Bbm', 'C', 'Fm', 'Db', 'Bbm', 'C'];
    return CHORDS[prog[(bar - 4) % prog.length]];
  } else if (bar < 20) {
    // Main Drop: Fm -> Db -> Ab -> Eb (x2)
    const prog = ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Ab', 'Eb'];
    return CHORDS[prog[(bar - 12) % prog.length]];
  } else if (bar < 24) {
    // Breakdown: Db -> Eb -> Fm -> C
    const prog = ['Db', 'Eb', 'Fm', 'C'];
    return CHORDS[prog[(bar - 20) % prog.length]];
  } else if (bar < 30) {
    // Final Drop: Fm -> Db -> Bbm -> C -> Fm -> C
    const prog = ['Fm', 'Db', 'Bbm', 'C', 'Fm', 'C'];
    return CHORDS[prog[(bar - 24) % prog.length]];
  } else {
    // Outro: Db -> Fm
    return bar === 30 ? CHORDS['Db'] : CHORDS['Fm'];
  }
}

function generateTrack3Audio(): SoundEvent[] {
  const events: SoundEvent[] = [];

  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const chord = getBarChord(bar);
    const barStart = bar * 4 * BEAT;

    // 1. 화성 패드 / 코드 (Tension Chords)
    if (bar < 4 || (bar >= 20 && bar < 24) || bar >= 30) {
      events.push({
        time: barStart,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 3.6,
        volume: bar >= 20 && bar < 24 ? 0.65 : 0.45,
      });
    } else if ((bar >= 12 && bar < 20) || (bar >= 24 && bar < 30)) {
      // 드랍 구간 고속 코드 스타카토 (1박, 3박)
      events.push({
        time: barStart,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 0.4,
        volume: 0.5,
      });
      events.push({
        time: barStart + BEAT * 2,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 0.4,
        volume: 0.5,
      });
    }

    // 2. 고속 갤로핑 베이스 (Fast Galloping Bass)
    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;

      if ((bar >= 4 && bar < 20) || (bar >= 24 && bar < 30)) {
        // 드라이빙 갤로핑 16분음표 베이스 패턴 (정박 + 16분 오프비트)
        events.push({
          time,
          instrument: 'bass',
          pitch: chord.root,
          duration: BEAT * 0.25,
          volume: 0.75,
        });
        events.push({
          time: time + BEAT * 0.5,
          instrument: 'bass',
          pitch: chord.root * 1.5,
          duration: BEAT * 0.2,
          volume: 0.65,
        });
        events.push({
          time: time + BEAT * 0.75,
          instrument: 'bass',
          pitch: chord.root * 2.0,
          duration: BEAT * 0.2,
          volume: 0.6,
        });
      } else if (bar < 4 || (bar >= 20 && bar < 24) || bar >= 30) {
        // 인트로 / 브레이크다운: 롱톤 베이스
        if (beat === 0) {
          events.push({
            time,
            instrument: 'bass',
            pitch: chord.root,
            duration: BEAT * 2.5,
            volume: 0.6,
          });
        }
      }
    }

    // 3. 초고속 드럼 섹션 (Driving Drums)
    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;
      const isDriving =
        (bar >= 4 && bar < 11) ||
        (bar >= 12 && bar < 20) ||
        (bar >= 24 && bar < 30);

      // --- Kick: 강력한 4비트 드라이브 ---
      if (isDriving) {
        events.push({ time, instrument: 'kick', volume: 0.95 });
      } else if (bar === 11 || bar === 23) {
        // 빌드업 가속 킥
        events.push({ time, instrument: 'kick', volume: 0.9 });
      }

      // --- Snare: 파워풀한 백비트 (1, 3번째 비트) ---
      if (isDriving) {
        if (beat === 1 || beat === 3) {
          events.push({ time, instrument: 'snare', volume: 0.85 });
        }
      } else if (bar === 11 || bar === 23) {
        // 급가속 롤
        events.push({ time, instrument: 'snare', volume: 0.65 + beat * 0.08 });
        events.push({ time: time + BEAT * 0.5, instrument: 'snare', volume: 0.7 + beat * 0.08 });
      }

      // --- Hi-hat: 고속 16분음표 러시 ---
      if (bar >= 1 && bar < 30) {
        events.push({ time: time + BEAT * 0.25, instrument: 'hihat', volume: 0.45 });
        events.push({ time: time + BEAT * 0.5, instrument: 'hihat', volume: 0.65 });
        events.push({ time: time + BEAT * 0.75, instrument: 'hihat', volume: 0.45 });
      }
    }

    // 4. 고속 퀀텀 플럭 아르페지오 (Quantum Pluck Arp)
    if (bar < 6 || (bar >= 20 && bar < 24) || bar >= 30) {
      for (let s = 0; s < 4; s++) {
        const time = barStart + s * BEAT;
        const arpNotes = [chord.pitches[0] * 2, chord.pitches[1] * 2, chord.pitches[2] * 2, chord.pitches[0] * 3];
        events.push({
          time: time + BEAT * 0.25,
          instrument: 'pluck',
          pitch: arpNotes[(bar * 2 + s) % arpNotes.length],
          duration: 0.09,
          volume: 0.5,
        });
      }
    }

    // 5. 오버드라이브 리드 멜로디 (Overdrive Lead)
    if ((bar >= 6 && bar < 20) || (bar >= 24 && bar < 30)) {
      const scale = [698.46, 830.61, 932.33, 1046.5, 1244.51]; // F5, Ab5, Bb5, C6, Eb6
      const isClimax = bar >= 24 && bar < 30;
      const octaveMult = isClimax ? 1.25 : 1.0;

      const p = bar % 4;
      if (p === 0) {
        events.push({ time: barStart, instrument: 'lead', pitch: scale[0] * octaveMult, duration: BEAT * 0.6, volume: 0.65 });
        events.push({ time: barStart + BEAT, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.6, volume: 0.65 });
        events.push({ time: barStart + BEAT * 2, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 1.5, volume: 0.7 });
      } else if (p === 1) {
        events.push({ time: barStart, instrument: 'lead', pitch: scale[4] * octaveMult, duration: BEAT * 0.6, volume: 0.65 });
        events.push({ time: barStart + BEAT * 1.5, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.4, volume: 0.6 });
        events.push({ time: barStart + BEAT * 2, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.6, volume: 0.65 });
        events.push({ time: barStart + BEAT * 3, instrument: 'lead', pitch: scale[1] * octaveMult, duration: BEAT * 0.8, volume: 0.6 });
      } else if (p === 2) {
        events.push({ time: barStart, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.6, volume: 0.65 });
        events.push({ time: barStart + BEAT * 1.0, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.6, volume: 0.7 });
        events.push({ time: barStart + BEAT * 2.0, instrument: 'lead', pitch: scale[4] * octaveMult, duration: BEAT * 1.6, volume: 0.75 });
      } else {
        events.push({ time: barStart, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.6, volume: 0.65 });
        events.push({ time: barStart + BEAT, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.6, volume: 0.6 });
        events.push({ time: barStart + BEAT * 2, instrument: 'lead', pitch: scale[1] * octaveMult, duration: BEAT * 0.6, volume: 0.6 });
        events.push({ time: barStart + BEAT * 3, instrument: 'lead', pitch: scale[0] * octaveMult, duration: BEAT * 0.9, volume: 0.65 });
      }
    }
  }

  return events.sort((a, b) => a.time - b.time);
}

function generateTrack3Charts(): { easy: NoteEvent[]; normal: NoteEvent[]; hard: NoteEvent[] } {
  const easy: NoteEvent[] = [];
  const normal: NoteEvent[] = [];
  const hard: NoteEvent[] = [];

  // ==========================================
  // EASY: 4~29마디 대상, 152 BPM 고속 템포이므로 안정적인 2비트 정박 매핑
  // ==========================================
  for (let bar = 4; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;
    const lane1 = ((bar % 4)) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t3-e-${bar}-0`,
      time: Number(barStart.toFixed(3)),
      lane: lane1,
    });

    const lane2 = ((bar + 2) % 4) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t3-e-${bar}-2`,
      time: Number((barStart + BEAT * 2).toFixed(3)),
      lane: lane2,
    });
  }

  // ==========================================
  // NORMAL: 2~30마디 대상, 매 비트 정박 + 8분음표 갤로핑 비트
  // ==========================================
  for (let bar = 2; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;

    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;
      const lane = ((bar + beat) % 4) as 0 | 1 | 2 | 3;

      normal.push({
        id: `t3-n-${bar}-${beat}`,
        time: Number(time.toFixed(3)),
        lane,
      });

      // 드랍 구간(12~19, 24~29)에서 8분음표 갤롭 노트 추가
      const isDrop = (bar >= 12 && bar < 20) || (bar >= 24 && bar < 30);
      if (isDrop && (beat === 0 || beat === 2)) {
        normal.push({
          id: `t3-n-${bar}-${beat}-gallop`,
          time: Number((time + BEAT * 0.5).toFixed(3)),
          lane: ((lane + 2) % 4) as 0 | 1 | 2 | 3,
        });
      }
    }
  }

  // ==========================================
  // HARD: 1~30마디 대상, 고속 8분음표 연타 + 드랍 더블탭 + 16분음표 러시
  // ==========================================
  for (let bar = 1; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;

    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;
      const lane = ((bar * 2 + beat) % 4) as 0 | 1 | 2 | 3;

      hard.push({
        id: `t3-h-${bar}-${beat}-0`,
        time: Number(time.toFixed(3)),
        lane,
      });

      // 8분음표 빠른 연타
      hard.push({
        id: `t3-h-${bar}-${beat}-1`,
        time: Number((time + BEAT * 0.5).toFixed(3)),
        lane: ((lane + 1) % 4) as 0 | 1 | 2 | 3,
      });

      // 드랍 시작 마디(12, 24) 더블탭 (왼손 0, 오른손 3)
      if ((bar === 12 || bar === 24) && beat === 0) {
        hard.push({
          id: `t3-h-${bar}-${beat}-dual`,
          time: Number(time.toFixed(3)),
          lane: ((lane + 2) % 4) as 0 | 1 | 2 | 3,
        });
      }

      // 빌드업 마지막 마디(11, 23) 16분음표 러시
      if ((bar === 11 || bar === 23) && beat >= 2) {
        hard.push({
          id: `t3-h-${bar}-${beat}-rush`,
          time: Number((time + BEAT * 0.25).toFixed(3)),
          lane: ((lane + 3) % 4) as 0 | 1 | 2 | 3,
        });
      }
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
  artist: 'SUB-ATOMIC',
  bpm: BPM,
  duration: TOTAL_DURATION,
  previewTime: 6.0,
  audioEvents: generateTrack3Audio(),
  charts: generateTrack3Charts(),
};
