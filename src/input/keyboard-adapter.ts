export interface KeyboardActions {
  primary: () => void;
  left: () => void;
  right: () => void;
  up: () => void;
  down: () => void;
  requestReset: () => void;
}

export function handleKeyboardEvent(event: KeyboardEvent, actions: KeyboardActions): void {
  if (event.repeat) {
    return;
  }

  switch (event.key) {
    case "Enter":
      actions.primary();
      break;
    case " ":
    case "Spacebar":
      event.preventDefault();
      actions.primary();
      break;
    case "ArrowLeft":
      actions.left();
      break;
    case "ArrowRight":
      actions.right();
      break;
    case "ArrowUp":
      event.preventDefault();
      actions.up();
      break;
    case "ArrowDown":
      event.preventDefault();
      actions.down();
      break;
    case "Escape":
      actions.right();
      break;
    case "r":
    case "R":
      actions.requestReset();
      break;
  }
}
