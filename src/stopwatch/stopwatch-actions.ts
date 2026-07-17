import { createInitialState } from "./stopwatch-state";
import type { StopwatchState, TimeMark } from "./types";

export function getElapsedTime(state: StopwatchState, now = Date.now()): number {
  if (state.status === "idle") {
    return 0;
  }

  const elapsedBeforeCurrentRunMs = safeDuration(state.elapsedBeforeCurrentRunMs);
  if (state.status !== "running") {
    return elapsedBeforeCurrentRunMs;
  }

  if (typeof state.currentRunStartedAt !== "number" || !Number.isFinite(state.currentRunStartedAt)) {
    return elapsedBeforeCurrentRunMs;
  }

  return Math.max(0, elapsedBeforeCurrentRunMs + Math.max(0, now - state.currentRunStartedAt));
}

export function startStopwatch(state: StopwatchState, now = Date.now()): StopwatchState {
  if (state.status !== "idle") {
    return state;
  }

  return {
    status: "running",
    currentRunStartedAt: now,
    elapsedBeforeCurrentRunMs: 0,
    marks: [],
    sessionCreatedAt: now,
  };
}

export function pauseStopwatch(state: StopwatchState, now = Date.now()): StopwatchState {
  if (state.status !== "running") {
    return state;
  }

  return {
    ...state,
    status: "paused",
    elapsedBeforeCurrentRunMs: getElapsedTime(state, now),
    currentRunStartedAt: null,
  };
}

export function resumeStopwatch(state: StopwatchState, now = Date.now()): StopwatchState {
  if (state.status !== "paused") {
    return state;
  }

  return {
    ...state,
    status: "running",
    currentRunStartedAt: now,
  };
}

export function addTimeMark(state: StopwatchState, now = Date.now()): StopwatchState {
  if (state.status !== "running") {
    return state;
  }

  const totalElapsedMs = getElapsedTime(state, now);
  const previousMark = state.marks.at(-1);
  const splitElapsedMs = Math.max(0, totalElapsedMs - (previousMark?.totalElapsedMs ?? 0));
  const sequence = (previousMark?.sequence ?? 0) + 1;
  const mark: TimeMark = {
    id: createMarkId(sequence, now),
    sequence,
    totalElapsedMs,
    splitElapsedMs,
    createdAt: now,
  };

  return {
    ...state,
    marks: [...state.marks, mark],
  };
}

export function requestReset(state: StopwatchState): StopwatchState {
  if (state.status !== "paused") {
    return state;
  }

  return {
    ...state,
    status: "confirming-reset",
  };
}

export function cancelReset(state: StopwatchState): StopwatchState {
  if (state.status !== "confirming-reset") {
    return state;
  }

  return {
    ...state,
    status: "paused",
  };
}

export function confirmReset(state: StopwatchState, now = Date.now()): StopwatchState {
  if (state.status !== "confirming-reset") {
    return state;
  }

  return createInitialState(now);
}

function createMarkId(sequence: number, now: number): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${now}-${sequence}`;
}

function safeDuration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
