type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const configuredLevel: LogLevel = (() => {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return "info";
})();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

export function logDebug(context: string, message: string): void {
  if (!shouldLog("debug")) return;
  console.log(formatMessage("debug", context, message));
}

export function logInfo(context: string, message: string): void {
  if (!shouldLog("info")) return;
  console.log(formatMessage("info", context, message));
}

export function logWarn(context: string, message: string): void {
  if (!shouldLog("warn")) return;
  console.warn(formatMessage("warn", context, message));
}

export function logError(context: string, message: string): void {
  if (!shouldLog("error")) return;
  console.error(formatMessage("error", context, message));
}
