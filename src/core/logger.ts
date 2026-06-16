





type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  stack?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  


  debug(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.log('debug', message, context);
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  


  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
    console.info(`[INFO] ${message}`, context);
  }

  


  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
    console.warn(`[WARN] ${message}`, context);
  }

  



  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const stack = error instanceof Error ? error.stack : undefined;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.log('error', message, { 
      ...context, 
      originalError: errorMessage 
    }, stack);
    
    console.error(
      `[ERROR] ${message}`,
      { error, context }
    );

    
    
    
    
  }

  


  trackAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      return fn().catch(error => {
        this.error(`${operation} failed`, error, context);
        throw error;
      });
    } catch (error) {
      this.error(`${operation} failed`, error, context);
      throw error;
    }
  }

  


  getLogs(): LogEntry[] {
    return this.logs;
  }

  


  clearLogs(): void {
    this.logs = [];
  }

  


  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  


  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    stack?: string
  ): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      stack,
    };

    this.logs.push(entry);

    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
}








export const logger = new Logger();
