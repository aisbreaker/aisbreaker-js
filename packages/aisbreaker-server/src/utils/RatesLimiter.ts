
import { RequestLimits } from '../rest-api/index.js'
import { SingleRateLimiter } from './SingleRateLimiter.js'

/**
 * Implementation of rate limiters for RequestLimits.
 * 
 * In-memory implementation.
 */
export class RatesLimiter {
    requestsPerMinuteRateLimiter: SingleRateLimiter
    requestsPerHourRateLimiter: SingleRateLimiter
    requestsPerDayRateLimiter: SingleRateLimiter

    constructor(public requestLimits: RequestLimits) {
        this.requestsPerMinuteRateLimiter =
            new SingleRateLimiter(requestLimits.requestsPerMinute, 60)
        this.requestsPerHourRateLimiter =
            new SingleRateLimiter(requestLimits.requestsPerHour, 60*60)
        this.requestsPerDayRateLimiter =
            new SingleRateLimiter(requestLimits.requestsPerDay, 24*60*60)
    }

  /**
   * Check whether a request is allowed or not. If it is allowed, the request will be counted.
   * 
   * @param requestWeight    usually 1, but can be higher for requests that are more expensive
   * @param requestTime      the time of the request, default is now 
   *                         (having ths a parameter simplifies testing)
   * @returns undefined if the request is allowed, otherwise an error message
   */
  isRequestDenied(requestWeight: number = 1, requestTime: Date = new Date()): undefined | string {
    // check first
    const errorMsg = this.isRequestDeniedCheckOnly(requestWeight, requestTime)
    if (errorMsg) {
      // request denied - nothing was counted
      return errorMsg
    }

    // limit is not reached: count request
    const e1 = this.requestsPerMinuteRateLimiter.isRequestDenied(requestWeight, requestTime)
    const e2 = this.requestsPerHourRateLimiter.isRequestDenied(requestWeight, requestTime)
    const e3 = this.requestsPerDayRateLimiter.isRequestDenied(requestWeight, requestTime)
    return e1 || e2 || e3
  }

  /**
   * Check whether a request is allowed or not. Do not count this request.
   * 
   * @param requestWeight    usually 1, but can be higher for requests that are more expensive
   * @param requestTime      the time of the request, default is now 
   *                         (having ths a parameter simplifies testing)
   * @returns undefined if the request is allowed, otherwise an error message
   */
  isRequestDeniedCheckOnly(requestWeight: number = 1, requestTime: Date = new Date()): undefined | string {
    let errorMsg: undefined | string
    errorMsg = this.requestsPerMinuteRateLimiter.isRequestDeniedCheckOnly(requestWeight, requestTime)
    if (errorMsg) {
      // request denied
      return "requests per minute "+errorMsg
    }
    errorMsg = this.requestsPerHourRateLimiter.isRequestDeniedCheckOnly(requestWeight, requestTime)
    if (errorMsg) {
      // request denied
      return "requests per hour "+errorMsg
    }
    errorMsg = this.requestsPerDayRateLimiter.isRequestDeniedCheckOnly(requestWeight, requestTime)
    if (errorMsg) {
      // request denied
      return "requests per day "+errorMsg
    }

    // request allowed
    return undefined
  }

  /** Check for empty - needed for cleanup */
  isEmpty(requestTime: Date): boolean {
    return this.requestsPerMinuteRateLimiter.isEmpty(requestTime) &&
           this.requestsPerHourRateLimiter.isEmpty(requestTime) &&
           this.requestsPerDayRateLimiter.isEmpty(requestTime)
  }
}
