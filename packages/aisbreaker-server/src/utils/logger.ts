import winston from 'winston'

import config from '../config.js'

//
// logger - winstonjs-based logger
//          with colored log (level) output,
//          intended to be campatible with interface of aisbreaker-api-js/utils/logger
//


// npm debug levels (winston default):
// {
//   error: 0,
//   warn: 1,
//   info: 2,
//   http: 3
//   verbose: 4,
//   debug: 5,
//   silly: 6
// }

const prettyJson = winston.format.printf(info => {
  if (info.message.constructor === Object) {
    info.message = JSON.stringify(info.message, null, 4)
  }
  return `${info.timestamp} ${info.label || '-'} ${info.level}: ${info.message}`
})

const logger = winston.createLogger({
  level: config.loggerLevel === 'silent' ? undefined : config.loggerLevel,
  silent: config.loggerLevel === 'silent',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.prettyPrint(),
    winston.format.splat(),
    winston.format.simple(),
    //winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    // enforce ISO 8601 format with UTC (YYYY-MM-DDTHH:mm:ss.sssZ):
    winston.format.timestamp({ format: () => new Date().toISOString() }),
    prettyJson
  ),
  defaultMeta: { service: 'aisbreaker.org' },
  transports: [new winston.transports.Console({})]
})

export default logger

