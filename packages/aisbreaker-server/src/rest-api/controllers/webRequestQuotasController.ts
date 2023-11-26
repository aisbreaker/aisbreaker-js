import logger from '../../utils/logger.js'

import { RequestAuthAndQuotas, RequestQuotas, isRequestAuthAndQuotas, isRequestQuotas } from '../models/index.js'
import { RequestQuotasLimiter } from '../../utils/RequestQuotasLimiter.js'

import * as config from './config.js'
import { api, extern, utils } from 'aisbreaker-api-js'
import { API_KEY_PREFIX, getObjectCryptoId } from '../../utils/index.js'

import NodeCache from 'node-cache'

import { decryptAisbreakerApiKey } from '../../utils/index.js'



//
// Check request quotas and extract Auth
//

export interface CheckRequestQuotasResult {
  // either errorMsg or requestAuthAndQuotas is set
  errorMsg?: string
  requestAuthAndQuotas?: RequestAuthAndQuotas
  warnings?: string[]
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

    // no auth-based request - use defaults?
    var warnings: string[] = []
    if (!requestSecret) {
      // yes, use defaults
      requestSecret = await config.getDefaultAisbreakerApiKey()
      warnings.push(`No auth provided - using default AIsBreaker API key/access token`)
    }

    // check auth-based request quotas
    const requestAuthAndQuotas = await extractRequestAuthAndQuotas(serverHostname, requestSecret)
    const denyErrorMsg2 = isRequestDeniedByRequestAuthAndQuotas(requestAuthAndQuotas, clientIp, requestTime)
    if (denyErrorMsg2) {
      return {errorMsg: denyErrorMsg2}
    }

    // access allowed
    return {
      requestAuthAndQuotas: requestAuthAndQuotas,
      warnings: warnings,
    }
  } catch (err) {
    logger.warn(`process() - error: ${err}`, err)
    if (err instanceof api.AIsError) {
      throw err
    }
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
    const requestWeight = 1 // TODO: use higher requestWeight for more expensive requests (e.g. with images)
    let errorMsg = quotasLimiter.isRequestDenied(clientIp, requestWeight, requestTime)
    if (errorMsg) {
       // access denied
      errorMsg = `API request quota exceeded: ${errorMsg}`
      return errorMsg
    }

    // access allowed
    return undefined

  } catch (err) {
    logger.warn(`process() - error: ${err}`, err)
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
  let opt = await tryToExtractRequestAuthAndQuotasFromApiKey(serverHostname, requestSecret)
  if (opt) {
    // auth contains valid RequestAuthAndQuotas
    r = opt
  } else {
    // no valid auth;
    // does it look like an aisbreaker API key/access token, but is invalid?
    if (requestSecret && requestSecret.startsWith(API_KEY_PREFIX)) {
      // yes: it looks like an aisbreaker API key/access token, but is invalid
      const msg = `extractRequestAuthAndQuotas(): Invalid aisbreaker access token: '${requestSecret.substring(0, 10)}...' (len=${requestSecret.length})`
      console.log(msg)
      throw new api.AIsError(msg, extern.ERROR_401_Unauthorized)
    }
    // if does'n look like an aisbreaker API key/access token
  
    // auth does not contain RequestAuthAndQuotas: use defaults
    console.log("extractRequestAuthAndQuotas(): use defaults")
    r = await config.getDefaultRequestAuthAndQuotas(serverHostname)
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
  if (!isRequestSecretFrom3rdParty(requestSecret) && secret === '{{secret}}') {
    // special aisbreaker authSecret '{{secret}}': pass through the aisbreaker secret
    secret = requestSecret
  }

  // fallback to (3rd party) requestSecret?
  if (!secret) {
    if (isRequestSecretFrom3rdParty(requestSecret)) {
      // no other secret found, and requestSecret is from 3rd party
      secret = requestSecret
    } else {
      // no other secret found, and requestSecret is not from 3rd party
      // => do not use requestSecret
    }
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
  if (requestSecret.startsWith(API_KEY_PREFIX)) {
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
 * Extract RequestAuthAndQuotas from API key/access token.
 * 
 * @param serverHostname  hostname of the web server
 * @param requestSecret   authentication (bearer header)
 * @returns a valid RequestAuthAndQuotas object, or undefined if it cannot be extracted
 */
async function tryToExtractRequestAuthAndQuotasFromApiKey(
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

  // try to decrypt and parse the secret / aisbreaker API key / access token
  try {
    const apiKey = requestSecret
    const requestAuthAndQuotas = await decryptAisbreakerApiKey(serverHostname, apiKey)
    if (isRequestAuthAndQuotas(requestAuthAndQuotas)) {
      return requestAuthAndQuotas
    }
  } catch (err) {
    // ignore
  }

  // cound not extract anything
  return undefined
}
