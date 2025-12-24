// src/services/LoggerService.ts

import type { HTTPContext } from "./HTTPContext";

export class LoggerService {
  private startTime: number = 0;

  async before(c: HTTPContext) {
    this.startTime = performance.now();
  }

  async after(c: HTTPContext) {
    const duration = performance.now() - this.startTime;
    console.log(`[${c.req.method}][${c.path}][${duration.toFixed(2)}ms]`);
  }
}