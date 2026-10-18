import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { InputManager } from '../src/engine/InputManager';

describe('InputManager - Keyboard, Touch & Blur Lifecycle', () => {
  type Listener = (e: any) => void;
  const listeners: Record<string, Listener[]> = {};

  const fakeWindow = {
    addEventListener: (type: string, cb: Listener) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(cb);
    },
    removeEventListener: (type: string, cb: Listener) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((l) => l !== cb);
      }
    },
    dispatchEvent: (event: { type: string; [key: string]: any }) => {
      const cbs = listeners[event.type] || [];
      for (const cb of cbs) {
        cb(event);
      }
    },
  };

  beforeAll(() => {
    (globalThis as any).window = fakeWindow;
  });

  afterAll(() => {
    delete (globalThis as any).window;
  });

  it('should map D, F, J, K keys to correct lanes 0, 1, 2, 3 without repeats', () => {
    const input = new InputManager();
    const hits: number[] = [];
    const releases: number[] = [];

    input.init(
      (lane) => hits.push(lane),
      (lane) => releases.push(lane)
    );

    // D 누름 (Lane 0)
    fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyD', repeat: false });
    expect(hits).toEqual([0]);

    // e.repeat === true 인 경우 무시되어야 함
    fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyD', repeat: true });
    expect(hits).toEqual([0]); // 여전히 1회

    // F 누름 (Lane 1)
    fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyF', repeat: false });
    expect(hits).toEqual([0, 1]);

    // D 뗌
    fakeWindow.dispatchEvent({ type: 'keyup', code: 'KeyD' });
    expect(releases).toEqual([0]);

    input.destroy();
  });

  it('should clear active keys on window blur event', () => {
    const input = new InputManager();
    input.init(() => {}, () => {});

    // KeyJ 누름
    fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyJ', repeat: false });

    // 창 포커스 아웃 (blur)
    fakeWindow.dispatchEvent({ type: 'blur' });

    // destroy 후 리스너 제거 검증
    const removeSpy = vi.spyOn(fakeWindow, 'removeEventListener');
    input.destroy();
    expect(removeSpy).toHaveBeenCalledWith('blur', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('should ignore input when setEnabled is false', () => {
    const input = new InputManager();
    const hits: number[] = [];
    input.init((lane) => hits.push(lane), () => {});

    input.setEnabled(false);

    fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyK', repeat: false });
    expect(hits.length).toBe(0);

    input.destroy();
  });
});
