type LogLevel = 'info' | 'warn' | 'error';

interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  requestId: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface StructuredLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

function logEntry(entry: StructuredLogEntry): void {
  console.log(JSON.stringify(entry));
}

function buildLogger(functionName: string, requestId: string): StructuredLogger {
  const base = { function: functionName, requestId };
  return {
    info(message, context) {
      logEntry({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        context,
        ...base
      });
    },
    warn(message, context) {
      logEntry({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message,
        context,
        ...base
      });
    },
    error(message, context) {
      logEntry({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        context,
        ...base
      });
    }
  };
}

export function initStructuredLog(functionName: string, req: Request) {
  const headerId = req.headers.get('x-request-id')?.trim();
  const requestId = headerId && headerId !== '' ? headerId : crypto.randomUUID();
  const logger = buildLogger(functionName, requestId);
  return { requestId, log: logger };
}
