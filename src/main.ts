import "./styles.css";
import {
  addTimeMark,
  cancelReset,
  confirmReset,
  pauseStopwatch,
  requestReset,
  resumeStopwatch,
  startStopwatch,
} from "./stopwatch/stopwatch-actions";
import { loadState, saveState } from "./stopwatch/stopwatch-storage";
import type { StopwatchState } from "./stopwatch/types";
import { createStopwatchView } from "./ui/stopwatch-view";
import { executeWithInputLock } from "./input/input-lock";
import { handleKeyboardEvent } from "./input/keyboard-adapter";
import { registerMetaDisplayAdapter } from "./input/meta-display-adapter";

const appRoot = document.querySelector<HTMLElement>("#app");

if (!appRoot) {
  throw new Error("Elemento #app nao encontrado.");
}

let state: StopwatchState = loadState();
let renderFrameId: number | null = null;
let highlightedMarkId: string | null = null;
let highlightTimeoutId: number | null = null;

const view = createStopwatchView(appRoot);

function commitState(nextState: StopwatchState): void {
  const previousStatus = state.status;
  state = nextState;
  saveState(state);
  view.renderAll(state, highlightedMarkId);

  if (state.status === "running") {
    startRenderLoop();
  } else if (previousStatus === "running") {
    stopRenderLoop();
  }
}

function startStopwatchAction(): void {
  commitState(startStopwatch(state));
}

function pauseStopwatchAction(): void {
  commitState(pauseStopwatch(state));
}

function resumeStopwatchAction(): void {
  commitState(resumeStopwatch(state));
}

function addTimeMarkAction(): void {
  const previousMarkId = state.marks.at(-1)?.id;
  const nextState = addTimeMark(state);
  const newMark = nextState.marks.at(-1);
  commitState(nextState);

  if (newMark && newMark.id !== previousMarkId) {
    highlightMark(newMark.id);
    view.showFeedback("Marcacao registrada");
  }
}

function requestResetAction(): void {
  commitState(requestReset(state));
}

function cancelResetAction(): void {
  commitState(cancelReset(state));
}

function confirmResetAction(): void {
  highlightedMarkId = null;
  commitState(confirmReset(state));
}

function handlePrimaryAction(): void {
  switch (state.status) {
    case "idle":
      startStopwatchAction();
      break;
    case "running":
      addTimeMarkAction();
      break;
    case "paused":
      resumeStopwatchAction();
      break;
    case "confirming-reset":
      confirmResetAction();
      break;
  }
}

function handleLeftAction(): void {
  switch (state.status) {
    case "running":
      pauseStopwatchAction();
      break;
    case "paused":
      requestResetAction();
      break;
    case "idle":
    case "confirming-reset":
      break;
  }
}

function handleRightAction(): void {
  if (state.status === "confirming-reset") {
    cancelResetAction();
  }
}

function onPrimaryInput(): void {
  executeWithInputLock(handlePrimaryAction);
}

function onLeftInput(): void {
  executeWithInputLock(handleLeftAction);
}

function onRightInput(): void {
  executeWithInputLock(handleRightAction);
}

function startRenderLoop(): void {
  if (renderFrameId !== null) {
    return;
  }

  const renderFrame = () => {
    if (state.status !== "running") {
      renderFrameId = null;
      return;
    }

    view.renderStopwatch(state);
    renderFrameId = window.requestAnimationFrame(renderFrame);
  };

  renderFrameId = window.requestAnimationFrame(renderFrame);
}

function stopRenderLoop(): void {
  if (renderFrameId === null) {
    return;
  }

  window.cancelAnimationFrame(renderFrameId);
  renderFrameId = null;
}

function highlightMark(markId: string): void {
  highlightedMarkId = markId;
  view.renderMarks(state, highlightedMarkId);

  if (highlightTimeoutId !== null) {
    window.clearTimeout(highlightTimeoutId);
  }

  highlightTimeoutId = window.setTimeout(() => {
    highlightedMarkId = null;
    view.renderMarks(state);
    highlightTimeoutId = null;
  }, 500);
}

document.addEventListener("keydown", (event) =>
  handleKeyboardEvent(event, {
    primary: onPrimaryInput,
    left: onLeftInput,
    right: onRightInput,
    requestReset: () => {
      if (state.status === "paused") {
        onLeftInput();
      }
    },
  }),
);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveState(state);
    return;
  }

  view.renderAll(state, highlightedMarkId);
  if (state.status === "running") {
    startRenderLoop();
  }
});

view.setPrimaryAction(onPrimaryInput);
view.setLeftAction(onLeftInput);
view.setRightAction(onRightInput);

registerMetaDisplayAdapter({
  onPrimaryInput,
  onLeftInput,
  onRightInput,
});

view.renderAll(state);
if (state.status === "running") {
  startRenderLoop();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Nao foi possivel registrar o service worker.", error);
    });
  });
}
