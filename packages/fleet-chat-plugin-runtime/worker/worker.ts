/**
 * Plugin Worker
 *
 * Web Worker implementation for isolated plugin execution
 */

import type {
  WorkerMessage,
  WorkerResponse,
  WorkerMessageType,
  ExecuteData,
  InitData,
  RenderData,
  WorkerConfig,
  WorkerState,
  ExecutionResult,
  SetStateData,
  GetStateData,
} from './types.js';

export class PluginWorker {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void; timeout?: NodeJS.Timeout }
  >();
  private state: WorkerState;
  private config: Required<WorkerConfig>;
  private consoleListeners: Array<(type: string, args: string[]) => void> = [];

  constructor(workerUrl: string, config: WorkerConfig = {}) {
    this.config = {
      maxMemory: config.maxMemory ?? 100,
      timeout: config.timeout ?? 30000,
      debug: config.debug ?? false,
      sandbox: {
        allowedDomains: config.sandbox?.allowedDomains ?? [],
        allowNetwork: config.sandbox?.allowNetwork ?? true,
        allowFileSystem: config.sandbox?.allowFileSystem ?? false,
      },
    };

    this.state = {
      id: `worker-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: 'initializing',
      lastActivity: Date.now(),
    };
  }

  /**
   * Get worker state
   */
  getState(): WorkerState {
    return { ...this.state };
  }

  /**
   * Get worker ID
   */
  getId(): string {
    return this.state.id;
  }

  /**
   * Initialize the worker with plugin manifest and API
   */
  async init(manifest: InitData['manifest'], api: Record<string, unknown>, code?: string | Record<string, string>): Promise<void> {
    if (this.state.status === 'ready') {
      return;
    }

    this.state.status = 'initializing';
    this.state.manifest = manifest;

    await this.postMessage('init', { manifest, api, code });
    this.state.status = 'ready';
    this.state.lastActivity = Date.now();

    if (this.config.debug) {
      console.log(`[PluginWorker ${this.state.id}] Initialized`);
    }
  }

  /**
   * Execute a command in the worker
   */
  async execute(command: string, args: unknown[] = []): Promise<ExecutionResult> {
    if (this.state.status !== 'ready') {
      throw new Error('Worker not ready. Current status: ' + this.state.status);
    }

    const startTime = Date.now();

    try {
      const result = await this.postMessage('execute', { command, args });
      this.state.lastActivity = Date.now();

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.lastActivity = Date.now();

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Render a component
   */
  async render(component: string, props: Record<string, unknown> = {}): Promise<ExecutionResult> {
    if (this.state.status !== 'ready') {
      throw new Error('Worker not ready. Current status: ' + this.state.status);
    }

    const startTime = Date.now();

    try {
      const result = await this.postMessage('render', { component, props });
      this.state.lastActivity = Date.now();

      return {
        success: true,
        data: result,
        component: JSON.stringify(result),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.state.lastActivity = Date.now();

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Set state in worker
   */
  async setState(key: string, value: unknown): Promise<void> {
    if (this.state.status !== 'ready') {
      throw new Error('Worker not ready. Current status: ' + this.state.status);
    }

    await this.postMessage('setState', { key, value });
  }

  /**
   * Get state from worker
   */
  async getState(key: string): Promise<unknown> {
    if (this.state.status !== 'ready') {
      throw new Error('Worker not ready. Current status: ' + this.state.status);
    }

    return this.postMessage('getState', { key }) as Promise<unknown>;
  }

  /**
   * Send a message to the worker and wait for response
   */
  private async postMessage(type: WorkerMessageType, data: unknown): Promise<unknown> {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker-entry.js', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    }

    const id = ++this.messageId;
    this.state.status = 'busy';

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        this.state.status = 'ready';
        reject(new Error(`Worker timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      this.pendingMessages.set(id, { resolve, reject, timeout });
      this.worker!.postMessage({ id, type, data });
    });
  }

  /**
   * Handle message from worker
   */
  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, result, error } = event.data;
    const pending = this.pendingMessages.get(id);

    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      this.pendingMessages.delete(id);
      this.state.status = 'ready';

      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    }
  }

  /**
   * Handle worker error
   */
  private handleError(event: ErrorEvent): void {
    console.error(`[PluginWorker ${this.state.id}] Worker error:`, event.error);
    this.state.status = 'error';

    // Reject all pending messages
    for (const [id, pending] of this.pendingMessages.entries()) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error(`Worker error: ${event.message}`));
      this.pendingMessages.delete(id);
    }
  }

  /**
   * Add console listener
   */
  onConsole(callback: (type: string, args: string[]) => void): void {
    this.consoleListeners.push(callback);
  }

  /**
   * Handle console message from worker
   */
  handleConsoleMessage(type: string, args: string[]): void {
    for (const listener of this.consoleListeners) {
      listener(type, args);
    }

    // Also log to main console
    const logFn = console[type] || console.log;
    logFn(...args);
  }

  /**
   * Ping the worker to check if it's alive
   */
  async ping(): Promise<boolean> {
    try {
      await this.postMessage('ping', {});
      this.state.lastActivity = Date.now();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if worker is stale (no activity for too long)
   */
  isStale(timeout: number = 60000): boolean {
    return Date.now() - this.state.lastActivity > timeout;
  }

  /**
   * Terminate the worker
   */
  async dispose(): Promise<void> {
    if (this.worker) {
      try {
        await this.postMessage('dispose', {});
      } catch {
        // Ignore errors during dispose
      }

      this.worker.terminate();
      this.worker = null;
    }

    // Clear all pending messages
    for (const [id, pending] of this.pendingMessages.entries()) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Worker disposed'));
      this.pendingMessages.delete(id);
    }

    this.state.status = 'disposed';
    this.consoleListeners = [];
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): number {
    // Estimate based on pending messages and state size
    const stateSize = JSON.stringify(this.state).length * 2; // bytes
    const pendingSize = this.pendingMessages.size * 1024; // ~1KB per pending message
    return stateSize + pendingSize;
  }

  /**
   * Check if memory limit is exceeded
   */
  isMemoryLimitExceeded(): boolean {
    const maxBytes = this.config.maxMemory * 1024 * 1024;
    return this.getMemoryUsage() > maxBytes;
  }
}
