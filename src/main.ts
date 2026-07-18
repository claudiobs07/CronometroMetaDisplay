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
let selectedMarkId: string | null = null;
let highlightTimeoutId: number | null = null;

const view = createStopwatchView(appRoot);

function commitState(nextState: StopwatchState): void {
  const previousStatus = state.status;
  state = nextState;
  if (state.status !== "paused" || !state.marks.some((mark) => mark.id === selectedMarkId)) {
    selectedMarkId = null;
  }
  saveState(state);
  view.renderAll(state, getActiveMarkId());

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
  selectedMarkId = null;
  commitState(requestReset(state));
}

function cancelResetAction(): void {
  commitState(cancelReset(state));
}

function confirmResetAction(): void {
  highlightedMarkId = null;
  selectedMarkId = null;
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
  switch (state.status) {
    case "paused":
      clearSelectedMark();
      break;
    case "confirming-reset":
      cancelResetAction();
      break;
    case "idle":
    case "running":
      break;
  }
}

function handleDownAction(): void {
  if (state.status !== "paused" || state.marks.length === 0) {
    return;
  }

  clearNewMarkHighlight();
  const marksFromNewest = state.marks.slice().reverse();
  if (selectedMarkId === null) {
    selectedMarkId = marksFromNewest[0].id;
    view.renderMarks(state, selectedMarkId);
    return;
  }

  const selectedIndex = marksFromNewest.findIndex((mark) => mark.id === selectedMarkId);
  if (selectedIndex === -1) {
    selectedMarkId = marksFromNewest[0].id;
    view.renderMarks(state, selectedMarkId);
    return;
  }

  const nextMark = marksFromNewest[selectedIndex + 1];
  if (!nextMark) {
    return;
  }

  selectedMarkId = nextMark.id;
  view.renderMarks(state, selectedMarkId);
}

function handleUpAction(): void {
  if (state.status !== "paused" || selectedMarkId === null) {
    return;
  }

  clearNewMarkHighlight();
  const marksFromNewest = state.marks.slice().reverse();
  const selectedIndex = marksFromNewest.findIndex((mark) => mark.id === selectedMarkId);
  if (selectedIndex <= 0) {
    clearSelectedMark();
    return;
  }

  selectedMarkId = marksFromNewest[selectedIndex - 1].id;
  view.renderMarks(state, selectedMarkId);
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

function onUpInput(): void {
  executeWithInputLock(handleUpAction);
}

function onDownInput(): void {
  executeWithInputLock(handleDownAction);
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
  clearSelectedMark();
  highlightedMarkId = markId;
  view.renderMarks(state, getActiveMarkId());

  if (highlightTimeoutId !== null) {
    window.clearTimeout(highlightTimeoutId);
  }

  highlightTimeoutId = window.setTimeout(() => {
    highlightedMarkId = null;
    view.renderMarks(state, getActiveMarkId());
    highlightTimeoutId = null;
  }, 500);
}

function clearSelectedMark(): void {
  if (selectedMarkId === null) {
    return;
  }

  selectedMarkId = null;
  view.renderMarks(state, getActiveMarkId());
}

function clearNewMarkHighlight(): void {
  if (highlightTimeoutId !== null) {
    window.clearTimeout(highlightTimeoutId);
    highlightTimeoutId = null;
  }
  highlightedMarkId = null;
}

function getActiveMarkId(): string | null {
  return selectedMarkId ?? highlightedMarkId;
}

document.addEventListener("keydown", (event) =>
  handleKeyboardEvent(event, {
    primary: onPrimaryInput,
    left: onLeftInput,
    right: onRightInput,
    up: onUpInput,
    down: onDownInput,
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

  view.renderAll(state, getActiveMarkId());
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
  onUpInput,
  onDownInput,
});

view.renderAll(state);
if (state.status === "running") {
  startRenderLoop();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch((error) => {
        console.warn("Nao foi possivel registrar o service worker.", error);
      });
  });
}
