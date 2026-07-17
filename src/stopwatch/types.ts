export type StopwatchStatus = "idle" | "running" | "paused" | "confirming-reset";

export interface TimeMark {
  id: string;
  sequence: number;
  totalElapsedMs: number;
  splitElapsedMs: number;
  createdAt: number;
}

export interface StopwatchState {
  status: StopwatchStatus;
  elapsedBeforeCurrentRunMs: number;
  currentRunStartedAt: number | null;
  marks: TimeMark[];
  sessionCreatedAt: number;
}
