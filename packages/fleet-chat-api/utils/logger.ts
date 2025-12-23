/**
 * Fleet Chat Plugin Logger
 *
 * 提供统一的日志记录和错误处理功能
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: string
  error?: Error
}

export class Logger {
  private static instance: Logger
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private logLevel: LogLevel = LogLevel.INFO
  private context: string = 'Plugin'

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setContext(context: string): Logger {
    this.context = context
    return this
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private log(level: LogLevel, message: string, error?: Error): void {
    if (level < this.logLevel) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      error,
    }

    this.logs.push(entry)

    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 控制台输出
    const timestamp = entry.timestamp.toISOString()
    const contextStr = entry.context ? `[${entry.context}] ` : ''
    let logMessage = `${timestamp} ${contextStr}${message}`

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage)
        break
      case LogLevel.INFO:
        console.info(logMessage)
        break
      case LogLevel.WARN:
        console.warn(logMessage)
        break
      case LogLevel.ERROR:
        console.error(logMessage)
        if (error) {
          console.error(error.stack)
        }
        break
    }
  }

  debug(message: string): void {
    this.log(LogLevel.DEBUG, message)
  }

  info(message: string): void {
    this.log(LogLevel.INFO, message)
  }

  warn(message: string): void {
    this.log(LogLevel.WARN, message)
  }

  error(message: string, error?: Error): void {
    this.log(LogLevel.ERROR, message, error)
  }

  getLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logs.filter((log) => log.level >= level) : [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  // 静态便捷方法
  static debug(message: string, context?: string): void {
    const logger = Logger.getInstance()
    if (context) logger.setContext(context)
    logger.debug(message)
  }

  static info(message: string, context?: string): void {
    const logger = Logger.getInstance()
    if (context) logger.setContext(context)
    logger.info(message)
  }

  static warn(message: string, context?: string): void {
    const logger = Logger.getInstance()
    if (context) logger.setContext(context)
    logger.warn(message)
  }

  static error(message: string, error?: Error, context?: string): void {
    const logger = Logger.getInstance()
    if (context) logger.setContext(context)
    logger.error(message, error)
  }
}

// 错误处理工具
export class ErrorHandler {
  private static logger = Logger.getInstance()

  static async withErrorHandling<T>(
    operation: () => Promise<T> | T,
    errorMessage: string = '操作失败',
    context?: string,
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      this.logger.error(errorMessage, error as Error, context)

      // 向用户显示友好的错误信息
      if (typeof window !== 'undefined' && window.showToast) {
        await window.showToast({
          title: '错误',
          message: errorMessage,
          style: 'error',
        })
      }

      return null
    }
  }

  static wrapFunction<T extends (...args: any[]) => any>(
    fn: T,
    errorMessage?: string,
    context?: string,
  ): T {
    return (async (...args: Parameters<T>) => {
      return await this.withErrorHandling(() => fn(...args), errorMessage, context)
    }) as T
  }
}

// 性能监控
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map()
  private static logger = Logger.getInstance()

  static startTimer(name: string): void {
    this.timers.set(name, performance.now())
  }

  static endTimer(name: string, context?: string): number {
    const startTime = this.timers.get(name)
    if (startTime === undefined) {
      this.logger.warn(`Timer "${name}" was not started`, context)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)

    this.logger.debug(`Timer "${name}": ${duration.toFixed(2)}ms`, context)
    return duration
  }

  static async measure<T>(
    name: string,
    operation: () => Promise<T> | T,
    context?: string,
  ): Promise<T> {
    this.startTimer(name)
    try {
      const result = await operation()
      this.endTimer(name, context)
      return result
    } catch (error) {
      this.endTimer(name, context)
      throw error
    }
  }
}

// 默认导出
export default Logger
