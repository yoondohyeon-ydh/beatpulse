import { TrackData, SoundEvent, NoteEvent } from '../types/track';

// Track 1: Neon Pulse (120 BPM, Synthwave)
// 1 beat = 0.5s, 1 bar (4 beats) = 2.0s
// 32 bars = 64.0s
const BPM = 120;
const BEAT = 60 / BPM; // 0.5초
const TOTAL_BARS = 32;
const TOTAL_DURATION = TOTAL_BARS * 4 * BEAT; // 64.0초

interface ChordInfo {
  name: string;
  pitches: number[];
  root: number;
}

const CHORDS: Record<string, ChordInfo> = {
  Am: { name: 'Am', pitches: [220.0, 261.63, 329.63], root: 110.0 }, // A2 root, A3 C4 E4
  F: { name: 'F', pitches: [174.61, 220.0, 261.63], root: 87.31 },  // F2 root, F3 A3 C4
  C: { name: 'C', pitches: [196.0, 261.63, 329.63], root: 130.81 }, // C3 root, G3 C4 E4
  G: { name: 'G', pitches: [196.0, 246.94, 293.66], root: 98.0 },   // G2 root, G3 B3 D4
  Dm: { name: 'Dm', pitches: [220.0, 261.63, 293.66], root: 146.83 }, // D3 root, A3 C4 D4
  Em: { name: 'Em', pitches: [164.81, 246.94, 329.63], root: 82.41 }, // E2 root, E3 B3 E4
};

function getBarChord(bar: number): ChordInfo {
  // 6개 섹션별 화성 진행 매핑
  if (bar < 4) {
    // Intro: Am -> F -> C -> G
    const prog = ['Am', 'F', 'C', 'G'];
    return CHORDS[prog[bar % 4]];
  } else if (bar < 12) {
    // Build: Am -> F -> C -> G (x2)
    const prog = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'];
    return CHORDS[prog[(bar - 4) % prog.length]];
  } else if (bar < 20) {
    // Main Drop: Am -> F -> Dm -> Em (x2)
    const prog = ['Am', 'F', 'Dm', 'Em', 'Am', 'F', 'Dm', 'Em'];
    return CHORDS[prog[(bar - 12) % prog.length]];
  } else if (bar < 24) {
    // Breakdown: F -> G -> Em -> Am
    const prog = ['F', 'G', 'Em', 'Am'];
    return CHORDS[prog[(bar - 20) % prog.length]];
  } else if (bar < 30) {
    // Final Drop: Am -> F -> C -> G -> Am -> F
    const prog = ['Am', 'F', 'C', 'G', 'Am', 'F'];
    return CHORDS[prog[(bar - 24) % prog.length]];
  } else {
    // Outro: F -> Am
    return bar === 30 ? CHORDS['F'] : CHORDS['Am'];
  }
}

function generateTrack1Audio(): SoundEvent[] {
  const events: SoundEvent[] = [];

  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const chord = getBarChord(bar);
    const barStart = bar * 4 * BEAT;

    // 1. 화성 패드 / 코드 (Pad Chords)
    if (bar < 4 || (bar >= 12 && bar < 24) || bar >= 30) {
      events.push({
        time: barStart,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 3.8,
        volume: bar >= 20 && bar < 24 ? 0.65 : 0.45,
      });
    } else if (bar >= 4 && bar < 12) {
      // 빌드 구간은 반박자 스타카토 코드
      events.push({
        time: barStart,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 1.8,
        volume: 0.4,
      });
      events.push({
        time: barStart + BEAT * 2,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 1.8,
        volume: 0.4,
      });
    } else if (bar >= 24 && bar < 30) {
      // 드랍 2 구간 스타카토 코드 찌르기
      events.push({
        time: barStart,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 0.9,
        volume: 0.5,
      });
      events.push({
        time: barStart + BEAT * 2.5,
        instrument: 'chord',
        pitches: chord.pitches,
        duration: BEAT * 0.9,
        volume: 0.5,
      });
    }

    // 2. 베이스라인 (Synth Bass)
    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;

      if (bar >= 4 && bar < 20) {
        // 빌드 및 메인 드랍: 8분음표 롤링 신스 베이스
        events.push({
          time,
          instrument: 'bass',
          pitch: chord.root,
          duration: BEAT * 0.45,
          volume: 0.65,
        });
        events.push({
          time: time + BEAT * 0.5,
          instrument: 'bass',
          pitch: chord.root * 1.5,
          duration: BEAT * 0.35,
          volume: 0.5,
        });
      } else if (bar >= 24 && bar < 30) {
        // 파이널 드랍: 옥타브 점프 드라이브 베이스
        events.push({
          time,
          instrument: 'bass',
          pitch: chord.root,
          duration: BEAT * 0.4,
          volume: 0.7,
        });
        events.push({
          time: time + BEAT * 0.5,
          instrument: 'bass',
          pitch: chord.root * 2.0,
          duration: BEAT * 0.35,
          volume: 0.55,
        });
      } else if (bar < 4 || (bar >= 20 && bar < 24) || bar >= 30) {
        // 인트로 / 브레이크다운 / 아웃트로: 정박 롱톤 베이스
        if (beat === 0) {
          events.push({
            time,
            instrument: 'bass',
            pitch: chord.root,
            duration: BEAT * 2.8,
            volume: 0.5,
          });
        }
      }
    }

    // 3. 드럼 섹션 (Kick, Snare, Hi-hat)
    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;

      // --- Kick ---
      const isKickSection =
        (bar >= 4 && bar < 11) ||
        (bar >= 12 && bar < 20) ||
        (bar >= 24 && bar < 30);

      if (isKickSection) {
        // 4-on-the-floor
        events.push({
          time,
          instrument: 'kick',
          volume: 0.85,
        });
      } else if (bar === 11 || bar === 23) {
        // 빌드업 마지막 마디: 비트 0, 1, 2만 킥
        if (beat < 3) {
          events.push({
            time,
            instrument: 'kick',
            volume: 0.85,
          });
        }
      }

      // --- Snare ---
      if (isKickSection) {
        // 정박 스네어 (2번째, 4번째 비트)
        if (beat === 1 || beat === 3) {
          events.push({
            time,
            instrument: 'snare',
            volume: 0.75,
          });
        }
      } else if (bar === 11 || bar === 23) {
        // 빌드업 롤 (16분음표 롤)
        events.push({ time, instrument: 'snare', volume: 0.6 + beat * 0.08 });
        events.push({ time: time + BEAT * 0.5, instrument: 'snare', volume: 0.65 + beat * 0.08 });
      }

      // --- Hi-hat ---
      if (bar >= 2 && bar < 30) {
        // 8분음표 오프비트 하이햇
        events.push({
          time: time + BEAT * 0.5,
          instrument: 'hihat',
          volume: bar >= 12 && bar < 20 ? 0.55 : 0.4,
        });

        // 드랍 구간에서는 16분음표 고스트 하이햇 추가
        if ((bar >= 12 && bar < 20) || (bar >= 24 && bar < 30)) {
          events.push({
            time: time + BEAT * 0.25,
            instrument: 'hihat',
            volume: 0.3,
          });
          events.push({
            time: time + BEAT * 0.75,
            instrument: 'hihat',
            volume: 0.3,
          });
        }
      }
    }

    // 4. 아르페지오 플럭 (Synth Pluck)
    if (bar < 8 || (bar >= 20 && bar < 24) || bar >= 30) {
      // 영롱한 아르페지오 (16분음표)
      for (let s = 0; s < 4; s++) {
        const time = barStart + s * BEAT;
        const notePitch = chord.pitches[s % chord.pitches.length] * 1.5;
        events.push({
          time: time + BEAT * 0.25,
          instrument: 'pluck',
          pitch: notePitch,
          duration: 0.12,
          volume: 0.45,
        });
      }
    }

    // 5. 리드 멜로디 (Synth Lead)
    if ((bar >= 6 && bar < 20) || (bar >= 22 && bar < 30)) {
      // A 단조 펜타토닉 / 네온 스케일 (A4, C5, D5, E5, G5)
      const scale = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
      const isClimax = bar >= 24 && bar < 30;
      const octaveMult = isClimax ? 1.5 : 1.0;

      // 마디별 정돈된 멜로디 프레이즈
      const barPattern = bar % 4;
      if (barPattern === 0) {
        // 프레이즈 시작
        events.push({ time: barStart, instrument: 'lead', pitch: scale[0] * octaveMult, duration: BEAT * 0.8, volume: 0.6 });
        events.push({ time: barStart + BEAT, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.8, volume: 0.6 });
        events.push({ time: barStart + BEAT * 2, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 1.4, volume: 0.65 });
      } else if (barPattern === 1) {
        // 변주
        events.push({ time: barStart, instrument: 'lead', pitch: scale[4] * octaveMult, duration: BEAT * 0.8, volume: 0.6 });
        events.push({ time: barStart + BEAT * 1.5, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.4, volume: 0.55 });
        events.push({ time: barStart + BEAT * 2, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.8, volume: 0.6 });
        events.push({ time: barStart + BEAT * 3, instrument: 'lead', pitch: scale[1] * octaveMult, duration: BEAT * 0.8, volume: 0.6 });
      } else if (barPattern === 2) {
        // 고조
        events.push({ time: barStart, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.8, volume: 0.65 });
        events.push({ time: barStart + BEAT * 1.5, instrument: 'lead', pitch: scale[4] * octaveMult, duration: BEAT * 0.4, volume: 0.65 });
        events.push({ time: barStart + BEAT * 2, instrument: 'lead', pitch: scale[5] * octaveMult, duration: BEAT * 1.8, volume: 0.7 });
      } else {
        // 해결 및 전환
        events.push({ time: barStart, instrument: 'lead', pitch: scale[4] * octaveMult, duration: BEAT * 0.8, volume: 0.6 });
        events.push({ time: barStart + BEAT, instrument: 'lead', pitch: scale[3] * octaveMult, duration: BEAT * 0.8, volume: 0.6 });
        events.push({ time: barStart + BEAT * 2, instrument: 'lead', pitch: scale[2] * octaveMult, duration: BEAT * 0.8, volume: 0.55 });
        events.push({ time: barStart + BEAT * 3, instrument: 'lead', pitch: scale[0] * octaveMult, duration: BEAT * 0.9, volume: 0.6 });
      }
    }
  }

  // 시간순 정렬 보장
  return events.sort((a, b) => a.time - b.time);
}

function generateTrack1Charts(): { easy: NoteEvent[]; normal: NoteEvent[]; hard: NoteEvent[] } {
  const easy: NoteEvent[] = [];
  const normal: NoteEvent[] = [];
  const hard: NoteEvent[] = [];

  // ==========================================
  // EASY: 4~29마디 대상, 정박 중심 (2비트 간격 위주)
  // 센터 레인(1, 2) 위주 + 마디 첫머리 가끔 0/3
  // ==========================================
  for (let bar = 4; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;
    // 1박과 3박 (2비트 간격)
    const lane1 = ((bar % 2 === 0 ? 1 : 2)) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t1-e-${bar}-0`,
      time: Number((barStart).toFixed(3)),
      lane: lane1,
    });

    const lane2 = ((bar % 2 === 0 ? 2 : 1)) as 0 | 1 | 2 | 3;
    easy.push({
      id: `t1-e-${bar}-2`,
      time: Number((barStart + BEAT * 2).toFixed(3)),
      lane: lane2,
    });
  }

  // ==========================================
  // NORMAL: 2~30마디 대상, 매 비트 정박 + 8분음표 싱코페이션
  // 4개 레인 자연스러운 흐름 (D, F, J, K)
  // ==========================================
  for (let bar = 2; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;

    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;
      const lane = ((bar + beat) % 4) as 0 | 1 | 2 | 3;

      normal.push({
        id: `t1-n-${bar}-${beat}`,
        time: Number(time.toFixed(3)),
        lane,
      });

      // 드랍 구간(12~19, 24~29)에서 8분음표 싱코페이션 추가
      const isDrop = (bar >= 12 && bar < 20) || (bar >= 24 && bar < 30);
      if (isDrop && (beat === 1 || beat === 3)) {
        const offLane = ((lane + 2) % 4) as 0 | 1 | 2 | 3;
        normal.push({
          id: `t1-n-${bar}-${beat}-sync`,
          time: Number((time + BEAT * 0.5).toFixed(3)),
          lane: offLane,
        });
      }
    }
  }

  // ==========================================
  // HARD: 1~30마디 대상, 8분음표 지속 드라이브 + 필 버스트 + 드랍 더블탭
  // ==========================================
  for (let bar = 1; bar < 30; bar++) {
    const barStart = bar * 4 * BEAT;

    for (let beat = 0; beat < 4; beat++) {
      const time = barStart + beat * BEAT;
      const mainLane = ((bar * 2 + beat) % 4) as 0 | 1 | 2 | 3;

      // 정박 노트
      hard.push({
        id: `t1-h-${bar}-${beat}-0`,
        time: Number(time.toFixed(3)),
        lane: mainLane,
      });

      // 8분음표 오프비트 노트
      const subLane = ((mainLane + 1) % 4) as 0 | 1 | 2 | 3;
      hard.push({
        id: `t1-h-${bar}-${beat}-1`,
        time: Number((time + BEAT * 0.5).toFixed(3)),
        lane: subLane,
      });

      // 드랍 진입 마디(12, 24) 첫 박에 안전한 양손 더블탭 (왼손 0, 오른손 3)
      if ((bar === 12 || bar === 24) && beat === 0) {
        hard.push({
          id: `t1-h-${bar}-${beat}-dual`,
          time: Number(time.toFixed(3)),
          lane: 3, // mainLane이 0이므로 3 추가
        });
      }

      // 빌드업 마지막 마디(11, 23) 16분음표 래피드 버스트
      if ((bar === 11 || bar === 23) && beat >= 2) {
        const burstLane = ((mainLane + 2) % 4) as 0 | 1 | 2 | 3;
        hard.push({
          id: `t1-h-${bar}-${beat}-burst`,
          time: Number((time + BEAT * 0.25).toFixed(3)),
          lane: burstLane,
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

export const track1Neon: TrackData = {
  id: 'neon-pulse',
  title: 'Neon Pulse',
  artist: 'PULSE ENGINE',
  bpm: BPM,
  duration: TOTAL_DURATION,
  previewTime: 8.0,
  audioEvents: generateTrack1Audio(),
  charts: generateTrack1Charts(),
};
