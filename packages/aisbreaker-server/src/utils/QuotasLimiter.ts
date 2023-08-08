
import { Quotas } from '../rest-api/index.js'
import { RatesLimiter } from './RatesLimiter.js'

/**
 * Implementation of rate limiters for Quotas.
 * 
 * In-memory implementation.
 */
export class QuotasLimiter {
  globalRatesLimiter: RatesLimiter

  /** key: clientIPv4 string, value: RatesLimiter */
  perClientRatesLimiters = new Map<string, RatesLimiter>()

  constructor(public quotas: Quotas) {
    this.globalRatesLimiter = new RatesLimiter(quotas.globalRequestLimits)
  }

  /**
   * Check whether a request is allowed or not. If it is allowed, the request will be counted.
   * 
   * @param clientIPv4       the client's IPv4 address
   * @param requestWeight    usually 1, but can be higher for requests that are more expensive
   * @param requestTime      the time of the request, default is now 
   *                         (having ths a parameter simplifies testing)
   * @returns true if the request is allowed, false otherwise
   */
  isRequestAllowed(clientIPv4: string, requestWeight: number = 1, requestTime: Date = new Date()): boolean {
    // check first
    if (!this.isRequestAllowedCheckOnly(clientIPv4, requestWeight, requestTime)) {
      // request not allowed - nothing was counted
      return false
    }

    //
    // limit is not reached: count request
    //

    // global check
    if (!this.globalRatesLimiter.isRequestAllowed(requestWeight, requestTime)) {
      return false
    }

    // client specific check: get client specific rate limiter
    let clientRatesLimiter = this.perClientRatesLimiters.get(clientIPv4)
    if (!clientRatesLimiter) {
      // create new client specific rate limiter
      clientRatesLimiter = new RatesLimiter(this.quotas.perClientRequestLimits)
      this.perClientRatesLimiters.set(clientIPv4, clientRatesLimiter)
    }
    // check for this client
    return clientRatesLimiter.isRequestAllowed(requestWeight, requestTime)
  }

  /**
   * Check whether a request is allowed or not. Do not count this request.
   * 
   * @param clientIPv4       the client's IPv4 address
   * @param requestWeight    usually 1, but can be higher for requests that are more expensive
   * @param requestTime      the time of the request, default is now 
   *                         (having ths a parameter simplifies testing)
   * @returns true if the request is allowed, false otherwise
   */
  isRequestAllowedCheckOnly(clientIPv4: string, requestWeight: number = 1, requestTime: Date = new Date()): boolean {
    // cleanup (sometimes)
    this.cleanupPerClientRatesLimitersSometimes(requestTime)

    // global check
    if (!this.globalRatesLimiter.isRequestAllowedCheckOnly(requestWeight, requestTime)) {
      return false
    }

    // client specific check: get client specific rate limiter
    let clientRatesLimiter = this.perClientRatesLimiters.get(clientIPv4)
    if (!clientRatesLimiter) {
      return true
    }
    // check for this client
    return clientRatesLimiter.isRequestAllowedCheckOnly(requestWeight, requestTime)
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
