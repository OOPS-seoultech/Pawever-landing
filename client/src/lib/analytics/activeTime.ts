export class ActiveTimeCounter {
  private accumulatedMs = 0;
  private activeSince: number | null = null;

  resume(now: number) {
    if (this.activeSince === null) {
      this.activeSince = now;
    }
  }

  pause(now: number) {
    if (this.activeSince === null) return;
    this.accumulatedMs += Math.max(0, now - this.activeSince);
    this.activeSince = null;
  }

  elapsed(now: number) {
    if (this.activeSince === null) {
      return Math.round(this.accumulatedMs);
    }

    return Math.round(this.accumulatedMs + Math.max(0, now - this.activeSince));
  }

  reset(now?: number) {
    this.accumulatedMs = 0;
    this.activeSince = now ?? null;
  }
}
