import * as express from 'express'
import {writeJsonResponse} from '../../utils/expressHelper.js'
//import { ProxyServiceAPI } from '../services/aisService.js'
import logger from '../../utils/logger.js'
import { api as api0, services as services0 } from 'aisbreaker-api-js'
import { api, services } from 'aisbreaker-core-nodejs'


import { getAuthForServiceId, checkRequest } from './webRequestQuotasController.js'
 
export async function process(req: express.Request, res: express.Response): Promise<void> {
  try {
    logger.debug(`process() - started`)

    // check and use authentication (bearer header)
    const requestSecret = extractHttpAuthHeaderSecret(req)

    // check quotas
    const clientIp = getClientIP(req)
    const quotasResult = await checkRequest(clientIp, requestSecret)
    if (quotasResult.errorMsg) {
      writeJsonResponse(res, 429, {error: {type: 'too_many_requests', message: quotasResult.errorMsg}})
      return
    }
    const requestAuthAndQuotas = quotasResult.requestAuthAndQuotas
    if (!requestAuthAndQuotas) {
      writeJsonResponse(res, 500, {error: {type: 'server_error', message: `Server Error (process): invalid CheckRequestQuotasResult`}})
      return
    }

    // get aisNetworkRequest
    const json = req.body
    logger.debug(`process() - json=${JSON.stringify(json)}`)
    const aisNetworkRequest: services0.AIsNetworkRequest = json
    const serviceProps = aisNetworkRequest.service
    const request = aisNetworkRequest.request

    // get auth for the requested service
    const serviceId = serviceProps.serviceId
    const auth = getAuthForServiceId(requestAuthAndQuotas, requestSecret, serviceId)

    // get/create requested service
    const aisService: api.AIsService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)

    // call requested service
    const response = await aisService.process(request)

    writeJsonResponse(res, 200, response)
  } catch (err) {
    logger.error(`process() - error: ${err}`, err)
    writeJsonResponse(res, 500, {error: {type: 'server_error', message: `Server Error (sendMessageViaProxy): ${err}`}})
  }
}

/**
 * @param req
 * @returns the IPv4 or IPv6 address of the client.
 */
function getClientIP(req: express.Request): string {
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
function extractHttpAuthHeaderSecret(req: express.Request): string | undefined {
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
}
