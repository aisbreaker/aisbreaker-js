
import { RequestQuotas } from '../rest-api/index.js'
import { RatesLimiter } from './RatesLimiter.js'

const DEBUG = false

/**
 * Implementation of rate limiters for Quotas.
 * 
 * In-memory implementation.
 */
export class RequestQuotasLimiter {
  globalRatesLimiter: RatesLimiter

  /** key: clientId string, value: RatesLimiter */
  perClientRatesLimiters = new Map<string, RatesLimiter>()

  constructor(public quotas: RequestQuotas) {
    this.globalRatesLimiter = new RatesLimiter(quotas.globalRequestLimits)
  }

  /**
   * Check whether a request is allowed or not. If it is allowed, the request will be counted.
   * 
   * @param clientId         usually the client's IPv4 address
   * @param requestWeight    usually 1, but can be higher for requests that are more expensive
   * @param requestTime      the time of the request, default is now 
   *                         (having ths a parameter simplifies testing)
   * @returns undefined if the request is allowed, otherwise an error message
   */
  isRequestDenied(clientId: string, requestWeight: number = 1, requestTime: Date = new Date()): undefined | string {
    // check first
    let errorMsg = this.isRequestDeniedCheckOnly(clientId, requestWeight, requestTime)
    if (errorMsg) {
      // request denied - nothing was counted
      return logResult(errorMsg)
    }

    //
    // limit is not reached: count request
    //

    // global check
    errorMsg = this.globalRatesLimiter.isRequestDenied(requestWeight, requestTime)
    if (errorMsg) {
      // request denied
      return logResult("global(2) " + errorMsg)
    }

    // client specific check: get client specific rate limiter
    let clientRatesLimiter = this.perClientRatesLimiters.get(clientId)
    if (!clientRatesLimiter) {
      // create new client specific rate limiter
      clientRatesLimiter = new RatesLimiter(this.quotas.perClientRequestLimits)
      this.perClientRatesLimiters.set(clientId, clientRatesLimiter)
    }
    // check for this client
    errorMsg = clientRatesLimiter.isRequestDenied(requestWeight, requestTime)
    if (errorMsg) {
      // request denied
      return logResult("client " + errorMsg)
    } else {
      // request allowd
      return logResult(undefined)
    }
  }

  /**
   * Check whether a request is allowed or not. Do not count this request.
   * 
   * @param clientId         usually the client's IPv4 address
   * @param requestWeight    usually 1, but can be higher for requests that are more expensive
   * @param requestTime      the time of the request, default is now 
   *                         (having ths a parameter simplifies testing)
   * @returns undefined if the request is allowed, otherwise an error message
   */
  isRequestDeniedCheckOnly(clientId: string, requestWeight: number = 1, requestTime: Date = new Date()): undefined | string {
    // cleanup (sometimes)
    this.cleanupPerClientRatesLimitersSometimes(requestTime)

    // global check
    let errorMsg: undefined | string
    errorMsg = this.globalRatesLimiter.isRequestDeniedCheckOnly(requestWeight, requestTime)
    if (errorMsg) {
      // request denied
      return "global " + errorMsg
    }

    // client specific check: get client specific rate limiter
    let clientRatesLimiter = this.perClientRatesLimiters.get(clientId)
    if (!clientRatesLimiter) {
      // request allowd
      return undefined
    }
    // check for this client
    errorMsg = clientRatesLimiter.isRequestDeniedCheckOnly(requestWeight, requestTime)
    if (errorMsg) {
      // request denied
      return "client " + errorMsg
    } else {
      // request allowd
      return undefined
    }
  }

  /**
   * Delete entries that are not needed any more - to save memory.
   */
  protected cleanupPerClientRatesLimitersSometimes(requestTime: Date) {
    const PROBABLITY_OF_CLEANUP = 0.01
    if (Math.random() < PROBABLITY_OF_CLEANUP) {
      this.cleanupPerClientRatesLimiters(requestTime)
    }
  }

  /**
   * Delete entries that are not needed any more - to save memory.
   */
  protected cleanupPerClientRatesLimiters(requestTime: Date) {
    for (const [key, value] of this.perClientRatesLimiters.entries()) {
      if (value.isEmpty(requestTime)) {
        this.perClientRatesLimiters.delete(key)
      }
    }
  }


}

function logResult(result: undefined | string): undefined | string {
  if (DEBUG) {
    console.log(result)
  }
  return result
}