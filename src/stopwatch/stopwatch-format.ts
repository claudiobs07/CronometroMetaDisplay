export function formatElapsedTime(milliseconds: number): string {
  const safeMilliseconds = Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0);
  const totalCentiseconds = Math.trunc(safeMilliseconds / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.trunc(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.trunc(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.trunc(totalMinutes / 60);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
