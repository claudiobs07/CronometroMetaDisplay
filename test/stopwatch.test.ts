import { describe, expect, it, vi } from "vitest";
import {
  addTimeMark,
  cancelReset,
  confirmReset,
  getElapsedTime,
  pauseStopwatch,
  requestReset,
  resumeStopwatch,
  startStopwatch,
} from "../src/stopwatch/stopwatch-actions";
import { formatElapsedTime } from "../src/stopwatch/stopwatch-format";
import { createInitialState, sanitizeState } from "../src/stopwatch/stopwatch-state";
import { loadState, saveState, STORAGE_KEY } from "../src/stopwatch/stopwatch-storage";
import type { StopwatchState } from "../src/stopwatch/types";
import { handleKeyboardEvent, type KeyboardActions } from "../src/input/keyboard-adapter";

describe("formatElapsedTime", () => {
  it.each([
    [0, "00:00:00.00"],
    [999, "00:00:00.99"],
    [1000, "00:00:01.00"],
    [60000, "00:01:00.00"],
    [3600000, "01:00:00.00"],
    [-100, "00:00:00.00"],
    [3723456, "01:02:03.45"],
  ])("formats %i as %s", (input, expected) => {
    expect(formatElapsedTime(input)).toBe(expected);
  });
});

describe("getElapsedTime", () => {
  it("returns zero for idle state", () => {
    expect(getElapsedTime(createInitialState(100), 500)).toBe(0);
  });

  it("returns accumulated time for paused state", () => {
    expect(getElapsedTime({ ...createInitialState(), status: "paused", elapsedBeforeCurrentRunMs: 1234 }, 5000)).toBe(1234);
  });

  it("returns accumulated plus current run time while running", () => {
    const state: StopwatchState = {
      ...createInitialState(1000),
      status: "running",
      elapsedBeforeCurrentRunMs: 500,
      currentRunStartedAt: 1000,
    };

    expect(getElapsedTime(state, 1750)).toBe(1250);
  });

  it("continues correctly after pause and resume", () => {
    const running = startStopwatch(createInitialState(1000), 1000);
    const paused = pauseStopwatch(running, 2500);
    const resumed = resumeStopwatch(paused, 4000);

    expect(getElapsedTime(resumed, 4750)).toBe(2250);
  });

  it("handles negative and inconsistent values defensively", () => {
    const state: StopwatchState = {
      ...createInitialState(),
      status: "running",
      elapsedBeforeCurrentRunMs: -500,
      currentRunStartedAt: 2000,
    };

    expect(getElapsedTime(state, 1000)).toBe(0);
  });
});

describe("marks", () => {
  it("creates the first mark with split equal to total", () => {
    const running = startStopwatch(createInitialState(1000), 1000);
    const marked = addTimeMark(running, 4200);

    expect(marked.marks).toHaveLength(1);
    expect(marked.marks[0]).toMatchObject({ sequence: 1, totalElapsedMs: 3200, splitElapsedMs: 3200 });
    expect(marked.status).toBe("running");
  });

  it("creates the second mark with split since previous mark", () => {
    const running = startStopwatch(createInitialState(1000), 1000);
    const first = addTimeMark(running, 3000);
    const second = addTimeMark(first, 5500);

    expect(second.marks[1]).toMatchObject({ sequence: 2, totalElapsedMs: 4500, splitElapsedMs: 2500 });
  });

  it("does not add marks while paused", () => {
    const paused = pauseStopwatch(startStopwatch(createInitialState(1000), 1000), 2000);

    expect(addTimeMark(paused, 3000).marks).toHaveLength(0);
  });
});

describe("transitions", () => {
  it("supports the required state machine transitions", () => {
    const idle = createInitialState(1000);
    const running = startStopwatch(idle, 1000);
    const paused = pauseStopwatch(running, 2000);
    const resumed = resumeStopwatch(paused, 3000);
    const pausedAgain = pauseStopwatch(resumed, 4000);
    const confirming = requestReset(pausedAgain);
    const cancelled = cancelReset(confirming);
    const confirmingAgain = requestReset(cancelled);
    const reset = confirmReset(confirmingAgain, 5000);

    expect(running.status).toBe("running");
    expect(paused.status).toBe("paused");
    expect(resumed.status).toBe("running");
    expect(confirming.status).toBe("confirming-reset");
    expect(cancelled.status).toBe("paused");
    expect(reset.status).toBe("idle");
    expect(reset.marks).toHaveLength(0);
  });
});

describe("persistence", () => {
  it("saves and loads a valid state", () => {
    const storage = createMemoryStorage();
    const state = pauseStopwatch(startStopwatch(createInitialState(1000), 1000), 2500);

    saveState(state, storage);

    expect(loadState(storage, 3000)).toEqual(state);
  });

  it("returns initial state for invalid JSON", () => {
    const storage = createMemoryStorage();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    storage.setItem(STORAGE_KEY, "{nope");

    expect(loadState(storage, 111)).toEqual(createInitialState(111));
    warnSpy.mockRestore();
  });

  it("returns initial state for missing fields", () => {
    expect(sanitizeState(null, 222)).toEqual(createInitialState(222));
  });

  it("restores paused sessions", () => {
    const state = sanitizeState({ status: "paused", elapsedBeforeCurrentRunMs: 800, marks: [], sessionCreatedAt: 1 }, 1000);

    expect(state.status).toBe("paused");
    expect(getElapsedTime(state, 5000)).toBe(800);
  });

  it("restores running sessions using saved timestamp", () => {
    const state = sanitizeState(
      { status: "running", elapsedBeforeCurrentRunMs: 800, currentRunStartedAt: 1000, marks: [], sessionCreatedAt: 1 },
      5000,
    );

    expect(getElapsedTime(state, 5000)).toBe(4800);
  });

  it("restores confirming reset as paused", () => {
    const state = sanitizeState({ status: "confirming-reset", elapsedBeforeCurrentRunMs: 700, marks: [], sessionCreatedAt: 1 }, 1000);

    expect(state.status).toBe("paused");
  });
});

describe("keyboard input", () => {
  it("maps ArrowUp to up action", () => {
    const actions = createKeyboardActions();
    const event = createKeyboardEvent("ArrowUp");

    handleKeyboardEvent(event, actions);

    expect(actions.up).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("maps ArrowDown to down action", () => {
    const actions = createKeyboardActions();
    const event = createKeyboardEvent("ArrowDown");

    handleKeyboardEvent(event, actions);

    expect(actions.down).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("ignores repeated ArrowDown input", () => {
    const actions = createKeyboardActions();
    const event = createKeyboardEvent("ArrowDown", true);

    handleKeyboardEvent(event, actions);

    expect(actions.down).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("ignores repeated ArrowUp input", () => {
    const actions = createKeyboardActions();
    const event = createKeyboardEvent("ArrowUp", true);

    handleKeyboardEvent(event, actions);

    expect(actions.up).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear: vi.fn(() => data.clear()),
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(data.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => data.delete(key)),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
  };
}

function createKeyboardActions(): KeyboardActions {
  return {
    primary: vi.fn(),
    left: vi.fn(),
    right: vi.fn(),
    up: vi.fn(),
    down: vi.fn(),
    requestReset: vi.fn(),
  };
}

function createKeyboardEvent(key: string, repeat = false): KeyboardEvent {
  return {
    key,
    repeat,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}
