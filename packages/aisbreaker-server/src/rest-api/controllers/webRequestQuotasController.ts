import logger from '../../utils/logger.js'

import { RequestAuthAndQuotas, RequestQuotas, isRequestAuthAndQuotas, isRequestQuotas } from '../models/index.js'
import { RequestQuotasLimiter } from '../../utils/RequestQuotasLimiter.js'

import * as config from './config.js'
import { api, utils } from 'aisbreaker-api-js'
import { ACCESS_TOKEN_PREFIX, getObjectCryptoId } from '../../utils/index.js'

import NodeCache from 'node-cache'

import { decryptAisbreakerAccessToken } from '../../utils/index.js'



//
// Check request quotas and extract Auth
//

export interface CheckRequestQuotasResult {
  // either errorMsg or requestAuthAndQuotas is set
  errorMsg?: string
  requestAuthAndQuotas?: RequestAuthAndQuotas
}

/**
 * Check RequestAuthAndQuotas request quotas (quotas per Auth)
 * 
 * @param clientIp        usually the client's IPv4 address
 * @param serverHostname  hostname of the web server
 * @param requestSecret   authentication (bearer header)
 * @param requestTime     the time of the request, default is now 
 *                        (having ths a parameter simplifies testing)
 * @return combined result
 */
export async function checkRequest(
  clientIp: string,
  serverHostname: string,
  requestSecret: string | undefined,
  requestTime: Date = new Date()
): Promise<CheckRequestQuotasResult> {
  try {
    // check API request quotas
    const denyErrorMsg1 = await isRequestDeniedByApiRequestQuotas(clientIp, requestTime)
    if (denyErrorMsg1) {
      return {errorMsg: denyErrorMsg1}
    }

    // check auth-based request quotas
    const requestAuthAndQuotas = await extractRequestAuthAndQuotas(serverHostname, requestSecret)
    const denyErrorMsg2 = isRequestDeniedByRequestAuthAndQuotas(requestAuthAndQuotas, clientIp, requestTime)
    if (denyErrorMsg2) {
      return {errorMsg: denyErrorMsg2}
    }

    // access allowed
    return {requestAuthAndQuotas: requestAuthAndQuotas}
  } catch (err) {
    logger.error(`process() - error: ${err}`, err)
    const errorMsg = `Server Error (isRequestDeniedByRequestAuthAndQuotas0): ${err}`
    return {errorMsg: errorMsg}
  }
}


/**
 * Check API request quotas (API overall quotas)
 * 
 * @param clientIp         usually the client's IPv4 address
 * @param requestTime      the time of the request, default is now 
 *                         (having ths a parameter simplifies testing)
 * @returns undefined if the request is allowed, otherwise an error message
  */
export async function isRequestDeniedByApiRequestQuotas(
    clientIp: string,
    requestTime: Date = new Date()
  ): Promise<string | undefined> {
  try {
    const quotasLimiter = await getApiRequestQuotasLimiter()
    
    // check
    let errorMsg = quotasLimiter.isRequestDenied(clientIp, 1, requestTime)
    if (errorMsg) {
       // access denied
      errorMsg = `API request quota exceeded: ${errorMsg}`
      return errorMsg
    }

    // access allowed
    return undefined

  } catch (err) {
    logger.error(`process() - error: ${err}`, err)
    return `Server Error (isRequestDeniedByApiRequestQuotas): ${err}`
  }
}
let apiRequestQuotasLimiter: RequestQuotasLimiter | undefined
async function getApiRequestQuotasLimiter(): Promise<RequestQuotasLimiter> {
  if (!apiRequestQuotasLimiter) {
    const quotas = await config.getApiRequestQuotas()
    apiRequestQuotasLimiter = new RequestQuotasLimiter(quotas)
  }
  return apiRequestQuotasLimiter
}


/**
 * Extract RequestAuthAndQuotas from access token, or take default.
 * 
 * @param serverHostname  hostname of the web server
 * @param requestSecret   authentication (bearer header)
 * @returns a valid RequestAuthAndQuotas object
 */
async function extractRequestAuthAndQuotas(
  serverHostname: string,
  requestSecret: string | undefined): Promise<RequestAuthAndQuotas> {
  // get valid RequestAuthAndQuotas
  let r: RequestAuthAndQuotas
  let opt = await tryToExtractRequestAuthAndQuotasFromAccessToken(serverHostname, requestSecret)
  if (opt) {
    // auth contains RequestAuthAndQuotas
    r = opt
  } else {
    // auth does not contain RequestAuthAndQuotas: use default
    r = await config.getDefaultRequestAuthAndQuotas()
  }
  return r
}


/**
 * In memory storage of one RequestQuotasLimiter per RequestAuthAndQuotas
 * key: quotaId
 * value: RequestQuotasLimiter
 */
const allRequestQuotasLimiters = new NodeCache({
  stdTTL: 1*24*60*60, // 1 day (because max. quotas time window is 1 day)
  useClones: false    // important (because we modify the value inside)!!!
})
/**
 * Check whether a request is allowed or not.
 * 
 * @param clientIp         usually the client's IPv4 address
 * @param requestTime      the time of the request, default is now 
 *                         (having ths a parameter simplifies testing)
 * @returns undefined if the request is allowed, otherwise an error message
 */
function isRequestDeniedByRequestAuthAndQuotas(
  requestAuthAndQuotas: RequestAuthAndQuotas,
  clientIp: string,
  requestTime: Date = new Date()): string | undefined {

  // check quotas: get limiter
  const quotaId = getObjectCryptoId(requestAuthAndQuotas)
  let limiter = allRequestQuotasLimiters.get<RequestQuotasLimiter>(quotaId)
  if (!limiter) {
    const requestQuotas = requestAuthAndQuotas.requestQuotas
    if (!requestQuotas) {
      // access denied
      const errorMsg = `RequestAuthAndQuotas.requestQuotas is undefined`
      return errorMsg
    }
    limiter = new RequestQuotasLimiter(requestQuotas)
    allRequestQuotasLimiters.set(quotaId, limiter)
  }

  // check quotas: check limiter
  let errorMsg = limiter.isRequestDenied(clientIp, 1, requestTime)
  if (errorMsg) {
    // access denied
    errorMsg = `Request quota exceeded: ${errorMsg}`
    return errorMsg
  }

  // access allowed
  return undefined
}


//
// service-specific Auth handling
//

/**
 * Get the service-specific Auth for a given serviceId from requestAuthAndQuotas.
 * As fallback, use the reqestSecret.
 * 
 * @param requestAuthAndQuotas 
 * @param requestSecret         HTTP Auth header value (bearer token) 
 * @param serviceId 
 */
export function getAuthForServiceId(
  requestAuthAndQuotas: RequestAuthAndQuotas,
  requestSecret: string | undefined, 
  serviceId: string): api.Auth | undefined {

  // get service-specific Auth
  let secret: string | undefined
  /* OLD/with map requestAuthAndQuotas.serviceAuthSecrets:
  if (requestAuthAndQuotas.serviceAuthSecrets) {
    const serviceAuthSecrets = requestAuthAndQuotas.serviceAuthSecrets
    if (serviceId in serviceAuthSecrets) {
      const serviceSecret = serviceAuthSecrets[serviceId]
      secret = serviceSecret
    }
  }
  */

  // check all serviceSecrets (from requestAuthAndQuotas)
  if (requestAuthAndQuotas.serviceSecrets) {
    const serviceSecrets = requestAuthAndQuotas.serviceSecrets
    if (serviceSecrets) {
      for (let serviceSecret of serviceSecrets) {
        if (serviceSecret.serviceId.startsWith(serviceId)) {
          // found a match
          secret = serviceSecret.authSecret
          break;
        }
      }
    }
  }

  // fallback to requestSecret?
  if (!secret && isRequestSecretFrom3rdParty(requestSecret)) {
    // no other secret found, and requestSecret is from 3rd party
    secret = requestSecret
  }

  // result
  if (secret) {
    return {
      secret: secret
    } as api.Auth
  } else {
    return undefined
  }
}

function isRequestSecretFrom3rdParty(requestSecret: string | undefined): boolean {
  // trivial check
  if (!requestSecret) {
    return false
  }
  // check
  if (requestSecret.startsWith(ACCESS_TOKEN_PREFIX)) {
    // no 3rd party access token
    return false
  } else {
    // 3rd party access token
    return true
  }
}

//
// decode/decrypt Auth secret
//

/**
 * Extract RequestAuthAndQuotas from access token.
 * 
 * @param serverHostname  hostname of the web server
 * @param requestSecret   authentication (bearer header)
 * @returns a valid RequestAuthAndQuotas object, or undefined if it cannot be extracted
 */
async function tryToExtractRequestAuthAndQuotasFromAccessToken(
  serverHostname: string,
  requestSecret: string | undefined
  ): Promise<RequestAuthAndQuotas | undefined> {
  // trivial check
  if (!requestSecret) {
    return undefined
  }

  /*
  // try to parse directly
  try {
    const obj = JSON.parse(requestSecret)
    if (isRequestAuthAndQuotas(obj)) {
      return obj
    }
  } catch (err) {
    // ignore
  }

  // try to decode base64 and parse
  try {
    const objString = utils.base64ToString(requestSecret)
    const obj = JSON.parse(objString)
    if (isRequestAuthAndQuotas(obj)) {
      return obj
    }
  } catch (err) {
    // ignore
  }
  */

  // try to decrypt and parse the secret / aisbreaker access key
  try {
    const accessToken = requestSecret
    const requestAuthAndQuotas = await decryptAisbreakerAccessToken(serverHostname, accessToken)
    if (isRequestAuthAndQuotas(requestAuthAndQuotas)) {
      return requestAuthAndQuotas
    }
  } catch (err) {
    // ignore
  }

  // cound not extract anything
  return undefined
}
