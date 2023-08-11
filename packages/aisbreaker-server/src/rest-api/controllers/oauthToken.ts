import * as express from 'express'
import {getClientIP, writeJsonResponse} from '../../utils/expressHelper.js'
import logger from '../../utils/logger.js'


import { getAuthForServiceId, checkRequest } from './webRequestQuotasController.js'
import { OauthTokenRequest, isRequestAuthAndQuotas, OauthTokenResponse } from '../models/index.js'
import { encryptAisbreakerAccessToken } from '../../utils/AisbreakerAccessKeyEncryptionUtils.js'

const DEFAULT_TOKEN_EXPIRATION_TIME_SPAN = '2h'
const MAX_TOKEN_EXPIRATION_TIME_SPAN = '90d'
/**
 * Create an access token
 * 
 * @param req 
 * @param res 
 */
export async function oauthToken(req: express.Request, res: express.Response): Promise<void> {
  try {
    logger.debug(`oauthToken() - started`)

    // check default quotas (Auth header is ignored here)
    const requestSecret = undefined
    const clientIp = getClientIP(req)
    const quotasResult = await checkRequest(clientIp, req.hostname, requestSecret)
    if (quotasResult.errorMsg) {
      writeJsonResponse(res, 429, {error: {type: 'too_many_requests', message: quotasResult.errorMsg}})
      return
    }
    
    // get request details,
    // clientId and clientSecret are ignored for now
    if (!req.is('application/json')) {
      writeJsonResponse(res, 400, {error: {type: 'server_error', message: `Server Error (token): invalid request content type - application/json expected`}})
      return
    }
    const json = req.body
    logger.debug(`oauthToken() - json(request)=${JSON.stringify(json, null, 2)}`)
    const r: OauthTokenRequest = json
    const requestAuthAndQuotas = r?.requestAuthAndQuotas
    if (!isRequestAuthAndQuotas(requestAuthAndQuotas)) {
      writeJsonResponse(res, 400, {error: {type: 'server_error', message: `Server Error (token): invalid requestAuthAndQuotas`}})
      return
    }
    logger.debug(`oauthToken() - requestAuthAndQuotas=${JSON.stringify(requestAuthAndQuotas)}`)
    const expirationTimeSpan = r?.expirationTimeSpan || DEFAULT_TOKEN_EXPIRATION_TIME_SPAN
    // TODO: check MAX_TOKEN_EXPIRATION_TIME_SPAN

    // create the requested token
    const token = await encryptAisbreakerAccessToken(req.hostname, requestAuthAndQuotas, expirationTimeSpan)
    logger.debug(`oauthToken() - token created='${token.substring(0, 10)}...' (len=${token.length})`)

    // return the token
    const response: OauthTokenResponse = {
      access_token: token,
      token_type: 'Bearer',
    }
    writeJsonResponse(res, 200, response)

  } catch (err) {
    logger.error(`process() - error: ${err}`, err)
    writeJsonResponse(res, 500, {error: {type: 'server_error', message: `Server Error (sendMessageViaProxy): ${err}`}})
  }
}
