import { TrackData, SoundEvent, NoteEvent } from '../types/track';

// Track 2: Cyber Circuit (136 BPM, Breakbeat / Cyber-Electronic)
// 1 beat = 60 / 136 ≈ 0.441176s
// 32 bars ≈ 56.47s
const BPM = 136;
const BEAT = 60 / BPM;
const TOTAL_BARS = 32;
const TOTAL_DURATION = Number((TOTAL_BARS * 4 * BEAT).toFixed(2)); // 56.47초

interface ChordInfo {
  name: string;
  pitches: number[];
  root: number;
}

const CHORDS: Record<string, ChordInfo> = {
  Dm: { name: 'Dm', pitches: [146.83, 220.0, 261.63], root: 73.42 }, // D2 root, D3 A3 C4
  Bb: { name: 'Bb', pitches: [116.54, 174.61, 233.08], root: 58.27 }, // Bb1 root, Bb2 F3 Bb3
  F: { name: 'F', pitches: [174.61, 220.0, 261.63], root: 87.31 },   // F2 root, F3 A3 C4
  C: { name: 'C', pitches: [130.81, 196.0, 261.63], root: 65.41 },   // C2 root, C3 G3 C4
  Gm: { name: 'Gm', pitches: [196.0, 233.08, 293.66], root: 98.0 },  // G2 root, G3 Bb3 D4
  A: { name: 'A', pitches: [220.0, 277.18, 329.63], root: 110.0 },   // A2 root, A3 C#4 E4
};

function getBarChord(bar: number): ChordInfo {
  if (bar < 4) {
    // Intro: Dm -> Bb -> F -> C
    const prog = ['Dm', 'Bb', 'F', 'C'];
    return CHORDS[prog[bar % 4]];
  } else if (bar < 12) {
    // Build: Dm -> Bb -> Gm -> A (x2)
    const prog = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'A'];
    return CHORDS[prog[(bar - 4) % prog.length]];
  } else if (bar < 20) {
    // Main Drop: Dm -> Dm -> Bb -> C -> Dm -> Dm -> Gm -> A
    const prog = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'];
    return CHORDS[prog[(bar - 12) % prog.length]];
  } else if (bar < 24) {
    // Breakdown: Bb -> C -> Dm -> F
    const prog = ['Bb', 'C', 'Dm', 'F'];
    return CHORDS[prog[(bar - 20) % prog.length]];
  } else if (bar < 30) {
    // Final Drop: Dm -> Bb -> F -> C -> Dm -> A
    const prog = ['Dm', 'Bb', 'F', 'C', 'Dm', 'A'];
    return CHORDS[prog[(bar - 24) % prog.length]];
  } else {
    // Outro: Bb -> Dm
    return bar === 30 ? CHORDS['Bb'] : CHORDS['Dm'];
  }
}

function generateTrack2Audio(): SoundEvent[] {
  const events: SoundEvent[] = [];

  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const chord = getBarChord(bar);
    const barStart = bar * 4 * BEAT;

    // 1. 화성 패드 / 신스 스탭 (Chords & Stabs)
    if (bar < 4 || (bar >= 20 && bar < 24) || bar >= 30) {
      // 앰비언트 사이버 패드
      events.push({
        time: barStart,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 3.7,
        volume: bar >= 20 && bar < 24 ? 0.6 : 0.45,
      });
    } else if ((bar >= 12 && bar < 20) || (bar >= 24 && bar < 30)) {
      // 브레이크비트 싱코페이션 코드 스탭 (비트 0, 1.5, 3.25)
      events.push({
        time: barStart,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 0.4,
        volume: 0.5,
      });
      events.push({
        time: barStart + BEAT * 1.5,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 0.4,
        volume: 0.5,
      });
      events.push({
        time: barStart + BEAT * 3.25,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 0.35,
        volume: 0.45,
      });
    }

    // 2. 애시드 사이버 베이스 (Acid / Cyber Bass)
    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;

      if ((bar >= 4 && bar < 20) || (bar >= 24 && bar < 30)) {
        // 브레이크비트 싱코페이션 애시드 베이스라인
        events.push({
          time,
          instrument: 'bass',
          pitch: chord.root * 2.0, // D3
          duration: BEAT * 0.3,
          volume: 0.7,
        });
        if (beat === 1 || beat === 3) {
          events.push({
            time: time + BEAT * 0.5,
            instrument: 'bass',
            pitch: chord.root * 3.0, // 5도 위
            duration: BEAT * 0.25,
            volume: 0.6,
          });
        }
      } else if (bar < 4 || (bar >= 20 && bar < 24) || bar >= 30) {
        // 서브 베이스 펄스
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

    // 3. 브레이크비트 드럼 섹션 (Breakbeat Drums)
    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;
      const isBeatDrop =
        (bar >= 4 && bar < 11) ||
        (bar >= 12 && bar < 20) ||
        (bar >= 24 && bar < 30);

      // --- Kick: 브레이크비트 리듬 (0, 1.75, 2.5) ---
      if (isBeatDrop) {
        if (beat === 0) {
          events.push({ time, instrument: 'kick', volume: 0.95 });
        } else if (beat === 1) {
          events.push({ time: time + BEAT * 0.75, instrument: 'kick', volume: 0.8 });
        } else if (beat === 2) {
          events.push({ time: time + BEAT * 0.5, instrument: 'kick', volume: 0.85 });
        }
      } else if (bar === 11 || bar === 23) {
        // 빌드업 킥
        events.push({ time, instrument: 'kick', volume: 0.85 });
      }

      // --- Snare: 브레이크비트 백비트 (1, 3번째 비트 + 싱코페이션 고스트) ---
      if (isBeatDrop) {
        if (beat === 1 || beat === 3) {
          events.push({ time, instrument: 'snare', volume: 0.85 });
        }
        // 고스트 스네어
        if (beat === 2 && bar % 2 === 1) {
          events.push({ time: time + BEAT * 0.75, instrument: 'snare', volume: 0.45 });
        }
      } else if (bar === 11 || bar === 23) {
        // 가속 스네어 롤
        events.push({ time, instrument: 'snare', volume: 0.6 + beat * 0.08 });
        events.push({ time: time + BEAT * 0.5, instrument: 'snare', volume: 0.7 + beat * 0.08 });
      }

      // --- Hi-hat: 사이버 16분음표 롤 & 오프비트 ---
      if (bar >= 1 && bar < 30) {
        events.push({ time: time + BEAT * 0.25, instrument: 'hihat', volume: 0.4 });
        events.push({ time: time + BEAT * 0.5, instrument: 'hihat', volume: 0.6 });
        events.push({ time: time + BEAT * 0.75, instrument: 'hihat', volume: 0.4 });
      }
    }

    // 4. 글리치 플럭 (Cyber Pluck)
    if (bar < 6 || (bar >= 20 && bar < 24) || bar >= 30) {
      for (let s = 0; s < 4; s++) {
        const time = barStart + s * BEAT;
        const arpNotes = [chord.pitches[0] * 2, chord.pitches[1] * 2, chord.pitches[2] * 2, chord.pitches[0] * 3];
        events.push({
          time: time + BEAT * 0.25,
          instrument: 'pluck',
          pitch: arpNotes[(bar + s) % arpNotes.length],
          duration: 0.1,
          volume: 0.45,
        });
      }
    }

    // 5. 사이버 리드 멜로디 (Cyber Lead)
    if ((bar >= 6 && bar < 20) || (bar >= 24 && bar < 30)) {
      const scale = [587.33, 698.46, 783.99, 880.0, 1046.5]; // D5, F5, G5, A5, C6
      const isClimax = bar >= 24 && bar < 30;
      const octaveMult = isClimax ? 1.2 : 1.0;

      const p = bar % 4;
      if (p === 0) {
        events.push({ time: barStart + BEAT * 0.25, instrument: 'lead', pitch: scale[0] * octaveMult, duration: BEAT * 0.4, volume: 0.6 });
        events.push({ time: barStart + BEAT * 1.25, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.4, volume: 0.6 });
        events.push({ time: barStart + BEAT * 2.5, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.8, volume: 0.65 });
      } else if (p === 1) {
        events.push({ time: barStart + BEAT * 0.5, instrument: 'lead', pitch: scale[4] * octaveMult, duration: BEAT * 0.4, volume: 0.6 });
        events.push({ time: barStart + BEAT * 1.5, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.4, volume: 0.6 });
        events.push({ time: barStart + BEAT * 2.25, instrument: 'lead', pitch: scale[1] * octaveMult, duration: BEAT * 0.4, volume: 0.55 });
        events.push({ time: barStart + BEAT * 3.0, instrument: 'lead', pitch: scale[0] * octaveMult, duration: BEAT * 0.7, volume: 0.6 });
      } else if (p === 2) {
        events.push({ time: barStart + BEAT * 0.25, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.4, volume: 0.6 });
        events.push({ time: barStart + BEAT * 1.0, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.4, volume: 0.65 });
        events.push({ time: barStart + BEAT * 2.0, instrument: 'lead', pitch: scale[4] * octaveMult, duration: BEAT * 1.5, volume: 0.7 });
      } else {
        events.push({ time: barStart + BEAT * 0.5, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.4, volume: 0.6 });
        events.push({ time: barStart + BEAT * 1.5, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.4, volume: 0.6 });
        events.push({ time: barStart + BEAT * 2.5, instrument: 'lead', pitch: scale[0] * octaveMult, duration: BEAT * 1.0, volume: 0.6 });
      }
    }
  }

  return events.sort((a, b) => a.time - b.time);
}

function generateTrack2Charts(): { easy: NoteEvent[]; normal: NoteEvent[]; hard: NoteEvent[] } {
  const easy: NoteEvent[] = [];
  const normal: NoteEvent[] = [];
  const hard: NoteEvent[] = [];

  // ==========================================
  // EASY: 4~29마디 대상, 브레이크비트 안정적 정박 (2비트 간격)
  // ==========================================
  for (let bar = 4; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;
    const lane1 = ((bar % 4)) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t2-e-${bar}-0`,
      time: Number((barStart).toFixed(3)),
      lane: lane1,
    });

    const lane2 = ((bar + 2) % 4) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t2-e-${bar}-2`,
      time: Number((barStart + BEAT * 2).toFixed(3)),
      lane: lane2,
    });
  }

  // ==========================================
  // NORMAL: 2~30마디 대상, 브레이크비트 킥/스네어 싱코페이션 반영
  // ==========================================
  for (let bar = 2; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;

    // 비트 0 (킥)
    normal.push({
      id: `t2-n-${bar}-0`,
      time: Number(barStart.toFixed(3)),
      lane: (bar % 4) as 0 | 1 | 2 | 3,
    });

    // 비트 1 (스네어)
    normal.push({
      id: `t2-n-${bar}-1`,
      time: Number((barStart + BEAT).toFixed(3)),
      lane: ((bar + 1) % 4) as 0 | 1 | 2 | 3,
    });

    // 브레이크비트 싱코페이션 킥 (비트 1.75 또는 2.5)
    if (bar >= 4 && bar < 30) {
      normal.push({
        id: `t2-n-${bar}-sync`,
        time: Number((barStart + BEAT * 2.5).toFixed(3)),
        lane: ((bar + 3) % 4) as 0 | 1 | 2 | 3,
      });
    }

    // 비트 3 (스네어)
    normal.push({
      id: `t2-n-${bar}-3`,
      time: Number((barStart + BEAT * 3).toFixed(3)),
      lane: ((bar + 2) % 4) as 0 | 1 | 2 | 3,
    });
  }

  // ==========================================
  // HARD: 1~30마디 대상, 브레이크비트 복합 싱코페이션 + 8분음표 리듬 + 더블탭
  // ==========================================
  for (let bar = 1; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;

    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;
      const lane = ((bar * 3 + beat) % 4) as 0 | 1 | 2 | 3;

      hard.push({
        id: `t2-h-${bar}-${beat}-0`,
        time: Number(time.toFixed(3)),
        lane,
      });

      // 브레이크비트 오프비트 노트 (비트 0.5, 1.75, 2.5)
      if (beat === 1 || beat === 2) {
        hard.push({
          id: `t2-h-${bar}-${beat}-sync`,
          time: Number((time + BEAT * 0.5).toFixed(3)),
          lane: ((lane + 2) % 4) as 0 | 1 | 2 | 3,
        });
      }

      // 드랍 진입 더블탭 (바 12, 24)
      if ((bar === 12 || bar === 24) && beat === 0) {
        hard.push({
          id: `t2-h-${bar}-${beat}-dual`,
          time: Number(time.toFixed(3)),
          lane: ((lane + 2) % 4) as 0 | 1 | 2 | 3,
        });
      }

      // 빌드업 롤 (바 11, 23)
      if ((bar === 11 || bar === 23) && beat >= 2) {
        hard.push({
          id: `t2-h-${bar}-${beat}-burst`,
          time: Number((time + BEAT * 0.25).toFixed(3)),
          lane: ((lane + 1) % 4) as 0 | 1 | 2 | 3,
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

export const track2Cyber: TrackData = {
  id: 'cyber-circuit',
  title: 'Cyber Circuit',
  artist: 'GLITCH MATRIX',
  bpm: BPM,
  duration: TOTAL_DURATION,
  previewTime: 7.0,
  audioEvents: generateTrack2Audio(),
  charts: generateTrack2Charts(),
};
