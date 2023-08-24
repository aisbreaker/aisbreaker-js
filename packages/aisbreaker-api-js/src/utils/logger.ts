//
// logger - with simple logging interface,
//          to open the possibility to more complex logging in the future,
//          is compatible with winstonjs-based logger in aisbreaker-server/utils/logger
//

// log levels:
type LogLevelsType = {
  [key: string]: number
}
export const LogLevels: LogLevelsType = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
}

type LogLevelsMapType = {
  [key: number]: string
}
const LogLevelsMap: LogLevelsMapType = {
  0: "error",
  1: "warn",
  2: "info",
  3: "http",
  4: "verbose",
  5: "debug",
  6: "silly",
}
  
const CURRENT_LOG_LEVEL = LogLevels.debug


export function log(level: number, message?: any, ...optionalParams: any[]) {
  if (level <= CURRENT_LOG_LEVEL) {
    // do logging
 
    // format message
    const timestamp = new Date().toISOString()
    const label = undefined
    const levelStr = LogLevelsMap[level]
    const extendedMessage = `${timestamp} ${label || '-'} ${levelStr}: ${message}`

    // log
    if (level <= LogLevels.error) {
      console.error(extendedMessage, ...optionalParams)
    } else if (level <= LogLevels.warn) {
      console.warn(extendedMessage, ...optionalParams)
    } else if (level <= LogLevels.info) {
      console.info(extendedMessage, ...optionalParams)
    } else {
      console.debug(extendedMessage, ...optionalParams)
    }
  }
}

export const logger = {
  error: (message?: any, ...optionalParams: any[]) => { log(LogLevels.error, message, ...optionalParams) },
  warn: (message?: any, ...optionalParams: any[]) => { log(LogLevels.warn, message, ...optionalParams) },
  info: (message?: any, ...optionalParams: any[]) => { log(LogLevels.info, message, ...optionalParams) },
  //http: (message?: any, ...optionalParams: any[]) => { log(LogLevels.http, message, ...optionalParams) },
  verbose: (message?: any, ...optionalParams: any[]) => { log(LogLevels.verbose, message, ...optionalParams) },
  debug: (message?: any, ...optionalParams: any[]) => { log(LogLevels.debug, message, ...optionalParams) },
  silly: (message?: any, ...optionalParams: any[]) => { log(LogLevels.silly, message, ...optionalParams) },

  log: log,
}
