import * as express from 'express'
import {OutgoingHttpHeaders} from 'http'
import logger from '../utils/logger.js'
import { AssertionError } from 'assert'
import { api, utils } from 'aisbreaker-api-js'


/**
 * Helper to write JSON response
 * 
 * @param res
 * @param statusCode  response code, e.g. 200
 * @param payload     the JSON response
 * @param headers 
 */
export function writeJsonResponse(
  res: express.Response,
  statusCode: number,
  payload: any,
  skipWriteHeaders: boolean = false,
  headers?: OutgoingHttpHeaders | undefined
  ): void {

  // send headers if not skipped
  if (!skipWriteHeaders) {
    writeJsonResponseHeaders(res, statusCode, headers)
  }

  // prepare and send data
  let data: any = stringify(payload, null, 2)
  res.end(data)
}

/**
 * Helper to write JSON response
 * 
 * @param res
 * @param statusCode  response code, e.g. 200
 * @param payload     the JSON response
 * @param headers 
 */
export function writeJsonResponseAIsErrorAndEnd(
  res: express.Response,
  aisError: api.AIsErrorData,
  skipWriteHeaders: boolean = false,
  headers?: OutgoingHttpHeaders | undefined
  ): void {

  // send headers if not skipped
  if (!skipWriteHeaders) {
    writeJsonResponseHeaders(res, aisError.statusCode || utils.ERROR_500_Internal_Server_Error, headers)
  }

  // prepare and send data
  const errorObj = api.AIsError.fromAIsErrorData(aisError).getErrorObject()
  let data: any = stringify(errorObj, null, 2)
  console.log(`writeJsonResponseAIsError() - data=${data}`)
  res.end(data)
}


export function writeJsonResponseHeaders(res: express.Response, statusCode: number, headers?: OutgoingHttpHeaders | undefined): void {
  res.writeHead(statusCode, {...headers, 'Content-Type': 'application/json'})
}

export function writeEventStreamResponseHeaders(res: express.Response, statusCode: number, headers?: OutgoingHttpHeaders | undefined): void {
  res.writeHead(statusCode, {...headers, 'Content-Type': 'text/event-stream'})
}

export function writeJsonServerSideEventProgressResponse(res: express.Response, payload: any) {
  res.write(`event: progress\n`)
  res.write(`data: ${stringify(payload)}\n\n`)
}

export function writeJsonServerSideEventFinalResponseAndEnd(res: express.Response, payload: any) {
  res.write(`event: final\n`)
  res.end(`data: ${stringify(payload)}\n\n`)
}

export function writeJsonServerSideEventErrorResponseAndEnd(res: express.Response, payload: any) {
  res.write(`event: error\n`)
  res.end(`data: ${stringify(payload)}\n\n`)
}

export function writeJsonServerSideEventAIsErrorResponseAndEnd(res: express.Response, aisError: api.AIsErrorData) {
  const errorObj = api.AIsError.fromAIsErrorData(aisError).getErrorObject()
  writeJsonServerSideEventErrorResponseAndEnd(res, errorObj)
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


/**
 * @param req
 * @returns the IPv4 or IPv6 address of the client.
 */
export function getClientIP(req: express.Request): string {
  const IP_FROM_REQUEST_HEADER_NAME: string | undefined = 'x-forwarded-for'

  let clientIp: string | undefined  
  // get client IP from request header - because of Gateway (if configured)
  if (IP_FROM_REQUEST_HEADER_NAME) {
    const clientIpFromHeader = req.headers[IP_FROM_REQUEST_HEADER_NAME] 
    if (clientIpFromHeader) {
      if (typeof clientIpFromHeader === 'string') {
        clientIp = clientIpFromHeader
      } else {
        clientIp = clientIpFromHeader[0]
      }
    }
  }

  // get client IP from request (as fallback)
  if (!clientIp) {
    clientIp = req.socket.remoteAddress || 'unknown-client-ip'
  }

  return clientIp
}


/**
 * Extract bearer token from request header
 * 
 * @param req 
 * @returns the token if available, otherwise undefined
 */
export function extractHttpAuthHeaderSecret(req: express.Request): string | undefined {
  // extract access token
  const authHeader = req.headers.authorization
  logger.debug("authHeader: "+authHeader) 
  if (!authHeader) {
    // throw new Error(`Authorization header missing in request`)
    return undefined
  }
  const bearer = authHeader.split(' ')
  if (bearer.length !== 2) {
    throw new Error(`Authorization header invalid in request`)
  }
  const accessTokenSecret = bearer[1]
  if (!accessTokenSecret) {
    throw new Error(`Access token missing in request`)
  }
  return accessTokenSecret
}


//
// JSON formatter for HTTP responses
//
function stringify(value: any, replacer?: (number | string)[] | null, space?: string | number): string {
  let data: string
  if (typeof value === 'object') {
    // normal case
    data = JSON.stringify(value, replacer, space)

  } else if (typeof value === "boolean") {
    //data =`{ "result": ${value} }`
    data = `${value}`
  } else if (typeof value === "number" || typeof value === "bigint") {
    //data =`{ "result": ${value} }`
    data =`${value}`
  } else if (typeof value === "string") {
    //data =`{ "result": ${JSON.stringify(value)} }`
    data =`${JSON.stringify(value)}`
    //data =`${paylvalueoad}`

  } else {
    // unknonw case
    logger.warn(`stringify() with unknown type of value=${typeof value}`)
    data = `{stringify() with unknown type of value=${typeof value}}`
  }
  return data
}
