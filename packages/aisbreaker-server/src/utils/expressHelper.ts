import * as express from 'express'
import {OutgoingHttpHeaders} from 'http'
import logger from '../utils/logger.js'


/**
 * Helper to write JSON response
 * 
 * @param res
 * @param statusCode  response code, e.g. 200
 * @param payload     the JSON response
 * @param headers 
 */
export function writeJsonResponse(res: express.Response, statusCode: number, payload: any, headers?: OutgoingHttpHeaders | undefined): void {
  let data: any = undefined

  if (typeof payload === 'object') {
    // normal case
    data = JSON.stringify(payload, null, 2)

  } else if (typeof payload === "boolean") {
    //data =`{ "result": ${payload} }`
    data = `${payload}`
  } else if (typeof payload === "number" || typeof payload === "bigint") {
    //data =`{ "result": ${payload} }`
    data =`${payload}`
  } else if (typeof payload === "string") {
    //data =`{ "result": ${JSON.stringify(payload)} }`
    data =`${JSON.stringify(payload)}`
    //data =`${payload}`

  } else {
    // unknonw case
    logger.warn(`writeJsonResponse() with unknown type of payload=${typeof payload}`)
    data = payload
  }
  res.writeHead(statusCode, {...headers, 'Content-Type': 'application/json'})
  res.end(data)
}

/**
 * Support of async handler functions in NodeJS/Express.
 * It wraps such async handler to make sync version out of it.
 * 
 * Inspired by but different to
 *   https://zellwk.com/blog/async-await-express/
 *   https://github.com/Abazhenov/express-async-handler
 * 
 * @param req 
 * @param res 
 * @param fn     asnyc version of the NodeJS/Express handler
 */
export function asyncHandler(req: express.Request, res: express.Response, fn: ()=>Promise<any>) {
  fn().then(() => {
    logger.debug("asyncHandler() - success")
  })
  .catch(err => {
    logger.error(`asyncHandler() - error: ${err}`, err)
    writeJsonResponse(res, 500, {error: {type: 'internal_server_error', message: `Internal Server Error (asyncHandler): ${err}`}})
  })
}
