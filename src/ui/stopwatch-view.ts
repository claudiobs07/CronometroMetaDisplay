import { formatElapsedTime } from "../stopwatch/stopwatch-format";
import type { StopwatchState, TimeMark } from "../stopwatch/types";
import { getElapsedTime } from "../stopwatch/stopwatch-actions";

export interface StopwatchView {
  root: HTMLElement;
  renderAll: (state: StopwatchState, activeMarkId?: string | null) => void;
  renderStopwatch: (state: StopwatchState) => void;
  renderMarks: (state: StopwatchState, activeMarkId?: string | null) => void;
  showFeedback: (message: string) => void;
  setPrimaryAction: (action: () => void) => void;
  setLeftAction: (action: () => void) => void;
  setRightAction: (action: () => void) => void;
}

export function createStopwatchView(root: HTMLElement): StopwatchView {
  root.innerHTML = `
    <main class="app-shell" aria-labelledby="app-title">
      <header class="stopwatch-header">
        <p class="eyebrow" id="app-title">Cronometro</p>
      </header>

      <section class="timer-section" aria-label="Tempo total">
        <div class="stopwatch-time" aria-hidden="true">00:00:00.00</div>
        <p class="sr-only" id="screen-reader-time">Tempo total 00:00:00.00</p>
      </section>

      <section class="status-section" aria-live="polite">
        <p class="status-title">Pronto</p>
        <p class="status-detail">Pinca para iniciar</p>
        <p class="status-extra"></p>
        <p class="feedback" aria-live="polite"></p>
      </section>

      <section class="actions" aria-label="Controles">
        <button class="control-button primary-button" type="button">Iniciar</button>
        <button class="control-button left-button" type="button">Esquerda</button>
        <button class="control-button right-button" type="button">Direita</button>
      </section>

      <section class="marks-section" aria-labelledby="marks-title">
        <h2 id="marks-title">Marcacoes</h2>
        <ol class="marks-list"></ol>
      </section>
    </main>
  `;

  const timeElement = requireElement(root, ".stopwatch-time", HTMLElement);
  const screenReaderTimeElement = requireElement(root, "#screen-reader-time", HTMLElement);
  const statusTitleElement = requireElement(root, ".status-title", HTMLElement);
  const statusDetailElement = requireElement(root, ".status-detail", HTMLElement);
  const statusExtraElement = requireElement(root, ".status-extra", HTMLElement);
  const feedbackElement = requireElement(root, ".feedback", HTMLElement);
  const marksListElement = requireElement(root, ".marks-list", HTMLElement);
  const primaryButton = requireElement(root, ".primary-button", HTMLButtonElement);
  const leftButton = requireElement(root, ".left-button", HTMLButtonElement);
  const rightButton = requireElement(root, ".right-button", HTMLButtonElement);

  let feedbackTimeout: number | null = null;

  function renderStopwatch(state: StopwatchState): void {
    const formattedTime = formatElapsedTime(getElapsedTime(state));
    if (timeElement.textContent !== formattedTime) {
      timeElement.textContent = formattedTime;
    }
  }

  function renderStatus(state: StopwatchState): void {
    const content = getStatusContent(state.status);
    statusTitleElement.textContent = content.title;
    statusDetailElement.textContent = content.detail;
    statusExtraElement.textContent = content.extra;
    primaryButton.textContent = content.primary;
    leftButton.textContent = content.left;
    rightButton.textContent = content.right;
    leftButton.hidden = content.left.length === 0;
    rightButton.hidden = content.right.length === 0;
    screenReaderTimeElement.textContent = `Tempo total ${formatElapsedTime(getElapsedTime(state))}`;
  }

  function renderMarks(state: StopwatchState, activeMarkId?: string | null): void {
    const visibleMarks = getVisibleMarks(state, activeMarkId);
    marksListElement.innerHTML = "";

    if (visibleMarks.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "empty-marks";
      emptyItem.textContent = "Nenhuma marcacao";
      marksListElement.append(emptyItem);
      return;
    }

    for (const mark of visibleMarks) {
      const item = document.createElement("li");
      item.className = "mark-item";
      if (mark.id === activeMarkId) {
        item.classList.add("is-new");
        item.setAttribute("aria-current", "true");
      }

      item.innerHTML = `
        <span class="mark-sequence">#${mark.sequence}</span>
        <span class="mark-line"><span>Parcial</span><strong>${formatElapsedTime(mark.splitElapsedMs)}</strong></span>
        <span class="mark-line"><span>Total</span><strong>${formatElapsedTime(mark.totalElapsedMs)}</strong></span>
      `;
      marksListElement.append(item);
    }
  }

  function renderAll(state: StopwatchState, activeMarkId?: string | null): void {
    renderStopwatch(state);
    renderStatus(state);
    renderMarks(state, activeMarkId);
  }

  function showFeedback(message: string): void {
    feedbackElement.textContent = message;
    feedbackElement.classList.add("is-visible");

    if (feedbackTimeout !== null) {
      window.clearTimeout(feedbackTimeout);
    }

    feedbackTimeout = window.setTimeout(() => {
      feedbackElement.textContent = "";
      feedbackElement.classList.remove("is-visible");
      feedbackTimeout = null;
    }, 600);
  }

  return {
    root,
    renderAll,
    renderStopwatch,
    renderMarks,
    showFeedback,
    setPrimaryAction: (action) => primaryButton.addEventListener("click", action),
    setLeftAction: (action) => leftButton.addEventListener("click", action),
    setRightAction: (action) => rightButton.addEventListener("click", action),
  };
}

function getVisibleMarks(state: StopwatchState, activeMarkId?: string | null): TimeMark[] {
  const marksFromNewest = state.marks.slice().reverse();
  if (!activeMarkId) {
    return marksFromNewest.slice(0, 3);
  }

  const activeIndex = marksFromNewest.findIndex((mark) => mark.id === activeMarkId);
  if (activeIndex === -1) {
    return marksFromNewest.slice(0, 3);
  }

  const startIndex = Math.min(activeIndex, Math.max(0, marksFromNewest.length - 3));
  return marksFromNewest.slice(startIndex, startIndex + 3);
}

function getStatusContent(status: StopwatchState["status"]) {
  switch (status) {
    case "running":
      return {
        title: "Em andamento",
        detail: "Pinca: marcar",
        extra: "< Pausar",
        primary: "Marcar",
        left: "Pausar",
        right: "",
      };
    case "paused":
      return {
        title: "Pausado",
        detail: "Pinca: continuar",
        extra: "< Reiniciar",
        primary: "Continuar",
        left: "Reiniciar",
        right: "",
      };
    case "confirming-reset":
      return {
        title: "Reiniciar cronometro?",
        detail: "Todos os tempos serao apagados.",
        extra: "Pinca: confirmar  > Cancelar",
        primary: "Confirmar",
        left: "",
        right: "Cancelar",
      };
    case "idle":
    default:
      return {
        title: "Pronto",
        detail: "Pinca para iniciar",
        extra: "",
        primary: "Iniciar",
        left: "",
        right: "",
      };
  }
}

function requireElement<T extends Element>(
  root: HTMLElement,
  selector: string,
  constructor: { new (...args: never[]): T },
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Elemento obrigatorio nao encontrado: ${selector}`);
  }

  return element;
}
