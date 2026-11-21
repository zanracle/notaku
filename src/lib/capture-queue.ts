const queue: string[] = [];

export function enqueueCapture(uri: string): void {
  queue.push(uri);
}

export function captureQueueLength(): number {
  return queue.length;
}

export function firstCapture(): string | null {
  return queue[0] ?? null;
}

export function shiftCapture(): string | null {
  return queue.shift() ?? null;
}

export function clearCaptureQueue(): void {
  queue.length = 0;
}
