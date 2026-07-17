import type { StopwatchState, StopwatchStatus } from "./types";

export function createInitialState(now = Date.now()): StopwatchState {
  return {
    status: "idle",
    elapsedBeforeCurrentRunMs: 0,
    currentRunStartedAt: null,
    marks: [],
    sessionCreatedAt: now,
  };
}

export function isStopwatchStatus(value: unknown): value is StopwatchStatus {
  return (
    value === "idle" ||
    value === "running" ||
    value === "paused" ||
    value === "confirming-reset"
  );
}

export function sanitizeState(value: unknown, now = Date.now()): StopwatchState {
  if (!value || typeof value !== "object") {
    return createInitialState(now);
  }

  const candidate = value as Partial<StopwatchState>;
  const status = isStopwatchStatus(candidate.status) ? candidate.status : "idle";
  const marks = Array.isArray(candidate.marks)
    ? candidate.marks
        .filter((mark) => mark && typeof mark === "object")
        .map((mark, index) => {
          const item = mark as unknown as Record<string, unknown>;
          const totalElapsedMs = safeNumber(item.totalElapsedMs);
          return {
            id: typeof item.id === "string" ? item.id : `restored-${index + 1}`,
            sequence: safeNumber(item.sequence, index + 1),
            totalElapsedMs,
            splitElapsedMs: safeNumber(item.splitElapsedMs, totalElapsedMs),
            createdAt: safeNumber(item.createdAt, now),
          };
        })
    : [];

  const restoredStatus = status === "confirming-reset" ? "paused" : status;
  const currentRunStartedAt =
    restoredStatus === "running" && typeof candidate.currentRunStartedAt === "number"
      ? candidate.currentRunStartedAt
      : null;

  return {
    status: restoredStatus,
    elapsedBeforeCurrentRunMs: safeNumber(candidate.elapsedBeforeCurrentRunMs),
    currentRunStartedAt,
    marks,
    sessionCreatedAt: safeNumber(candidate.sessionCreatedAt, now),
  };
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;
}
