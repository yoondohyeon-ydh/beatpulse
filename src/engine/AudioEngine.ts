import { SoundEvent, InstrumentType } from '../types/track';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // 활성 노드 추적 (메모리 정리 및 강제 중단용)
  private activeNodes = new Set<{ stop?: () => void; disconnect: () => void }>();

  // 스케줄링 상태
  private scheduledEvents: SoundEvent[] = [];
  private eventCursor = 0;
  private schedulerTimerId: number | null = null;

  // 타임라인 상태
  private audioStartTime = 0;
  private pausedGameTime = 0;
  private isPaused = false;
  private isPlaying = false;

  // 룩어헤드 스케줄링 파라미터 (초)
  private readonly scheduleAheadTime = 0.25; // 250ms 앞까지 예약
  private readonly lookaheadIntervalMs = 50;  // 50ms마다 체크

  // 일시정지 콜백 (AudioContext가 외부 요인으로 중단될 때 UI와 동기화)
  private onExternalPauseCallback: (() => void) | null = null;

  constructor() {
    // 생성 시점에는 AudioContext를 대기 상태로 초기화 (모바일 사용자 제스처 대기)
  }

  /**
   * 사용자 최초 터치/클릭 제스처에서 호출되어 AudioContext를 활성화합니다.
   */
  public async initAudio(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass();

        // 마스터 및 카테고리별 게인 노드 구성
        this.masterGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.bgmGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // 노이즈 버퍼 사전 생성 (Snare, Hi-hat용)
        this.createNoiseBuffer();

        // 시스템 상태 변경 감지 (헤드폰 연결 해제, 전화 수신 등)
        let lastState = this.ctx.state;
        this.ctx.onstatechange = () => {
          if (!this.ctx) return;
          const currentState = this.ctx.state;
          // 이전에 running 상태였던 오디오가 시스템에 의해 외부 요인으로 중단된 경우에만 일시정지
          if (
            lastState === 'running' &&
            (currentState === 'suspended' || (currentState as string) === 'interrupted')
          ) {
            if (this.isPlaying && !this.isPaused && this.onExternalPauseCallback) {
              this.onExternalPauseCallback();
            }
          }
          lastState = currentState;
        };
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      return true;
    } catch (e) {
      console.warn('AudioContext initialization deferred:', e);
      return false;
    }
  }

  public setExternalPauseCallback(callback: () => void): void {
    this.onExternalPauseCallback = callback;
  }

  public setVolumes(master: number, bgm: number, sfx: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, master)), this.ctx.currentTime);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(Math.max(0, Math.min(1, bgm)), this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, sfx)), this.ctx.currentTime);
    }
  }

  /**
   * 화이트 노이즈 버퍼 생성 (1초)
   */
  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  /**
   * 카운트다운을 포함한 게임 트랙 오디오 시작 준비
   * @param events 전체 사운드 이벤트
   * @param countdownDurationSec 카운트다운 지속 시간 (초, 예: 3.0)
   */
  public startTrack(events: SoundEvent[], countdownDurationSec: number = 3.0): void {
    this.stopSchedulerLoop();
    this.stopAllActiveNodes();

    if (!this.ctx) {
      this.initAudio();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((e) => console.warn('AudioContext resume in startTrack failed:', e));
    }

    const currentCtxTime = this.ctx ? this.ctx.currentTime : 0;
    // 게임 시작 시각 = 현재 시각 + 카운트다운 시간
    this.audioStartTime = currentCtxTime + countdownDurationSec;
    this.pausedGameTime = 0;
    this.isPaused = false;
    this.isPlaying = true;

    // 이벤트 시간순 정렬 및 복제
    this.scheduledEvents = [...events].sort((a, b) => a.time - b.time);
    this.eventCursor = 0;

    // 스케줄러 루프 구동
    this.startSchedulerLoop();
  }

  /**
   * Lookahead 스케줄러:
   * setInterval을 사용하여 브라우저 UI 렌더링(rAF)과 독립적으로
   * Web Audio 파라미터 큐에 오디오 이벤트를 미리 스케줄링합니다.
   */
  private startSchedulerLoop(): void {
    this.stopSchedulerLoop();

    this.schedulerTimerId = window.setInterval(() => {
      this.runScheduleTick();
    }, this.lookaheadIntervalMs);

    // 즉시 1회 실행
    this.runScheduleTick();
  }

  private stopSchedulerLoop(): void {
    if (this.schedulerTimerId !== null) {
      clearInterval(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
  }

  private runScheduleTick(): void {
    if (!this.ctx || !this.isPlaying || this.isPaused) return;

    const currentCtxTime = this.ctx.currentTime;
    // 현재 스케줄링 대상 한계 시각
    const scheduleWindowEnd = currentCtxTime + this.scheduleAheadTime;

    while (this.eventCursor < this.scheduledEvents.length) {
      const event = this.scheduledEvents[this.eventCursor];
      // 이벤트의 실제 Web Audio 재생 시각
      const soundCtxTime = this.audioStartTime + event.time;

      if (soundCtxTime > scheduleWindowEnd) {
        // 아직 스케줄 윈도우 밖이므로 다음 틱까지 대기
        break;
      }

      // 만약 soundCtxTime이 이미 지나치게 과거라면 (예: 시스템 지연) 현재 시각에 즉시 연주
      const playTime = Math.max(currentCtxTime, soundCtxTime);
      this.playSyntheticInstrument(
        event.instrument,
        playTime,
        event.pitch,
        event.duration,
        event.volume,
        event.pitches
      );

      this.eventCursor++;
    }
  }

  /**
   * 일시정지 (Pause):
   * 1. 현재 게임 진행 시간 기록
   * 2. 스케줄러 타이머 중지
   * 3. 현재 재생 중인 모든 활성 노드 즉각 stop & disconnect
   */
  public pause(): number {
    if (!this.isPlaying || this.isPaused) return this.pausedGameTime;

    if (this.ctx) {
      this.pausedGameTime = this.ctx.currentTime - this.audioStartTime;
    }

    this.isPaused = true;
    this.stopSchedulerLoop();
    this.stopAllActiveNodes();

    return this.pausedGameTime;
  }

  /**
   * 재개 (Resume):
   * 1. AudioContext가 suspended라면 resume
   * 2. 새 audioStartTime = currentTime - pausedGameTime 재설정
   * 3. eventCursor를 pausedGameTime 이후의 첫 이벤트로 리셋 (과거 이벤트 중복 재생 방지)
   * 4. 스케줄러 루프 재가동
   */
  public resume(): void {
    if (!this.isPlaying || !this.isPaused) return;

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const currentCtxTime = this.ctx ? this.ctx.currentTime : 0;
    this.audioStartTime = currentCtxTime - this.pausedGameTime;
    this.isPaused = false;

    // pausedGameTime 이후의 이벤트만 남기도록 커서 조정
    this.eventCursor = this.scheduledEvents.findIndex(
      (ev) => ev.time >= this.pausedGameTime
    );
    if (this.eventCursor === -1) {
      this.eventCursor = this.scheduledEvents.length;
    }

    this.startSchedulerLoop();
  }

  /**
   * 완전 중지 및 리소스 정리 (Cleanup)
   */
  public stopAndCleanup(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.stopSchedulerLoop();
    this.stopAllActiveNodes();
    this.scheduledEvents = [];
    this.eventCursor = 0;
    this.pausedGameTime = 0;
  }

  private stopAllActiveNodes(): void {
    for (const item of this.activeNodes) {
      try {
        if (item.stop) item.stop();
        item.disconnect();
      } catch {
        // 이미 종료된 노드 무시
      }
    }
    this.activeNodes.clear();
  }

  /**
   * 카운트다운 완료 또는 활성화 시 AudioContext가 정상 동작 중인지 확인 및 보장
   */
  public ensureRunning(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch((e) => console.warn('AudioContext ensureRunning failed:', e));
    }
    if (this.isPaused) {
      this.resume();
    }
  }

  /**
   * 현재 절대 게임 진행 시간 (초) 반환
   * - 카운트다운 중: 음수 (< 0)
   * - 연주 중: 0 이상
   * - 일시정지 중: 정지 시점의 고정 시간
   */
  public getCurrentGameTime(): number {
    if (!this.isPlaying) return 0;
    if (this.isPaused) return this.pausedGameTime;
    if (!this.ctx) return 0;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx.currentTime - this.audioStartTime;
  }

  public getAudioContextTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  public getAudioStartTime(): number {
    return this.audioStartTime;
  }

  // ==========================================
  // 절차적 신시사이저 사운드 구현부
  // ==========================================

  private playSyntheticInstrument(
    instrument: InstrumentType,
    time: number,
    pitch?: number,
    duration?: number,
    volume: number = 0.8,
    pitches?: number[]
  ): void {
    if (!this.ctx || !this.bgmGain) return;

    try {
      switch (instrument) {
        case 'kick':
          this.synthKick(time, volume);
          break;
        case 'snare':
          this.synthSnare(time, volume);
          break;
        case 'hihat':
          this.synthHiHat(time, volume);
          break;
        case 'bass':
          this.synthBass(time, pitch || 110, duration || 0.2, volume);
          break;
        case 'lead':
          this.synthLead(time, pitch || 440, duration || 0.3, volume);
          break;
        case 'chord':
          this.synthChord(
            time,
            pitches && pitches.length > 0 ? pitches : [pitch || 220],
            duration || 0.8,
            volume
          );
          break;
        case 'pluck':
          this.synthPluck(time, pitch || 440, duration || 0.15, volume);
          break;
      }
    } catch (e) {
      console.warn('Synthesis dispatch error:', e);
    }
  }

  /**
   * Kick: 주파수 급강하(150Hz -> 30Hz) + 지수 감쇠 엔벨로프
   */
  private synthKick(time: number, volume: number): void {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.08);

    const kickVol = volume * 0.9;
    gain.gain.setValueAtTime(kickVol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.13);

    const ref = {
      stop: () => osc.stop(),
      disconnect: () => {
        osc.disconnect();
        gain.disconnect();
      },
    };
    this.activeNodes.add(ref);

    osc.onended = () => {
      ref.disconnect();
      this.activeNodes.delete(ref);
    };
  }

  /**
   * Snare: 화이트 노이즈 밴드패스(1000Hz) + 피치 오실레이터(180Hz)
   */
  private synthSnare(time: number, volume: number): void {
    if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;

    // 1. 노이즈 스네피 (Snap)
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(1.2, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.bgmGain);

    // 2. 톤 바디 (Body)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.08);

    const toneGain = this.ctx.createGain();
    toneGain.gain.setValueAtTime(volume * 0.5, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(toneGain);
    toneGain.connect(this.bgmGain);

    noiseSource.start(time);
    noiseSource.stop(time + 0.16);
    osc.start(time);
    osc.stop(time + 0.1);

    const ref = {
      stop: () => {
        noiseSource.stop();
        osc.stop();
      },
      disconnect: () => {
        noiseSource.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
        osc.disconnect();
        toneGain.disconnect();
      },
    };
    this.activeNodes.add(ref);

    noiseSource.onended = () => {
      ref.disconnect();
      this.activeNodes.delete(ref);
    };
  }

  /**
   * Hi-hat: 고역 하이패스 필터(7500Hz) + 짧은 노이즈 버스트
   */
  private synthHiHat(time: number, volume: number): void {
    if (!this.ctx || !this.bgmGain || !this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    source.start(time);
    source.stop(time + 0.05);

    const ref = {
      stop: () => source.stop(),
      disconnect: () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      },
    };
    this.activeNodes.add(ref);

    source.onended = () => {
      ref.disconnect();
      this.activeNodes.delete(ref);
    };
  }

  /**
   * Bass: Sawtooth / Triangle 파형 + 로우패스 필터
   */
  private synthBass(time: number, pitch: number, duration: number, volume: number): void {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);

    const ref = {
      stop: () => osc.stop(),
      disconnect: () => {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      },
    };
    this.activeNodes.add(ref);

    osc.onended = () => {
      ref.disconnect();
      this.activeNodes.delete(ref);
    };
  }

  /**
   * Lead: Square / Sine 파형의 사이버 멜로디
   */
  private synthLead(time: number, pitch: number, duration: number, volume: number): void {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);

    const ref = {
      stop: () => osc.stop(),
      disconnect: () => {
        osc.disconnect();
        gain.disconnect();
      },
    };
    this.activeNodes.add(ref);

    osc.onended = () => {
      ref.disconnect();
      this.activeNodes.delete(ref);
    };
  }

  /**
   * Chord / Pad: 복수 주파수(Triad/Dyad)를 레이어링하여 풍부하고 따뜻한 화성 패드 생성
   */
  private synthChord(time: number, pitches: number[], duration: number, volume: number): void {
    if (!this.ctx || !this.bgmGain || pitches.length === 0) return;

    // 보이스 수에 따른 헤드룸 자동 계산 (클리핑 방지)
    const voiceGainAmount = (volume * 0.22) / Math.sqrt(pitches.length);
    const stopTime = time + duration + 0.05;

    for (let i = 0; i < pitches.length; i++) {
      const pitch = pitches[i];
      if (pitch <= 0 || !Number.isFinite(pitch)) continue;

      try {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // 톱니파 + 삼각파 교차 배치 및 미세 디튠으로 아날로그 신스 패드 질감
        osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(pitch, time);
        // 약 -4 ~ +4 cents 디튠
        osc.detune.setValueAtTime((i - (pitches.length - 1) / 2) * 4, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, time);
        filter.frequency.linearRampToValueAtTime(1400, time + duration * 0.5);
        filter.frequency.linearRampToValueAtTime(800, stopTime);

        // 부드러운 어택과 릴리즈 (클릭음 방지)
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(voiceGainAmount, time + Math.min(0.08, duration * 0.2));
        gain.gain.setValueAtTime(voiceGainAmount, time + Math.max(0.08, duration * 0.7));
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(stopTime);

        const ref = {
          stop: () => {
            try { osc.stop(); } catch {}
          },
          disconnect: () => {
            try {
              osc.disconnect();
              filter.disconnect();
              gain.disconnect();
            } catch {}
          },
        };
        this.activeNodes.add(ref);

        osc.onended = () => {
          ref.disconnect();
          this.activeNodes.delete(ref);
        };
      } catch (e) {
        console.warn('synthChord voice error:', e);
      }
    }
  }

  /**
   * Pluck: 빠른 어택과 필터 스윕을 가진 경쾌하고 명료한 신스 플럭 사운드
   */
  private synthPluck(time: number, pitch: number, duration: number, volume: number): void {
    if (!this.ctx || !this.bgmGain || pitch <= 0 || !Number.isFinite(pitch)) return;

    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const stopTime = time + duration + 0.03;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, time);

      // 밝은 필터에서 빠르게 닫히는 플럭 엔벨로프
      const startCutoff = Math.min(8000, pitch * 4.5);
      const endCutoff = Math.max(300, pitch * 1.2);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(startCutoff, time);
      filter.frequency.exponentialRampToValueAtTime(endCutoff, time + duration);

      // 빠른 감쇠 퍼커시브 게인 엔벨로프
      gain.gain.setValueAtTime(volume * 0.45, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(stopTime);

      const ref = {
        stop: () => {
          try { osc.stop(); } catch {}
        },
        disconnect: () => {
          try {
            osc.disconnect();
            filter.disconnect();
            gain.disconnect();
          } catch {}
        },
      };
      this.activeNodes.add(ref);

      osc.onended = () => {
        ref.disconnect();
        this.activeNodes.delete(ref);
      };
    } catch (e) {
      console.warn('synthPluck error:', e);
    }
  }

  /**
   * 유저 타격 시 발생하는 짧은 피드백 SFX
   */
  public playHitSound(judgment: 'PERFECT' | 'GREAT' | 'GOOD'): void {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    const freq = judgment === 'PERFECT' ? 880 : judgment === 'GREAT' ? 660 : 440;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}

// 싱글톤 인스턴스 익스포트
export const audioEngine = new AudioEngine();
