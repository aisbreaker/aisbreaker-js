
import { RequestLimits } from '../rest-api/index.js'
import { SingleRateLimiter } from './SingleRateLimiter.js'

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
   * @returns true if the request is allowed, false otherwise
   */
  isRequestAllowed(requestWeight: number = 1, requestTime: Date = new Date()): boolean {
    // check first
    if (!this.isRequestAllowedCheckOnly(requestWeight, requestTime)) {
      // request not allowed - nothing was counted
      return false
    }

    // limit is not reached: count request
    return this.requestsPerMinuteRateLimiter.isRequestAllowed(requestWeight, requestTime) &&
           this.requestsPerHourRateLimiter.isRequestAllowed(requestWeight, requestTime) &&
           this.requestsPerDayRateLimiter.isRequestAllowed(requestWeight, requestTime)
  }

  /**
   * Check whether a request is allowed or not. Do not count this request.
   * 
   * @param requestWeight    usually 1, but can be higher for requests that are more expensive
   * @param requestTime      the time of the request, default is now 
   *                         (having ths a parameter simplifies testing)
   * @returns true if the request is allowed, false otherwise
   */
  isRequestAllowedCheckOnly(requestWeight: number = 1, requestTime: Date = new Date()): boolean {
    return this.requestsPerMinuteRateLimiter.isRequestAllowedCheckOnly(requestWeight, requestTime) &&
           this.requestsPerHourRateLimiter.isRequestAllowedCheckOnly(requestWeight, requestTime) &&
           this.requestsPerDayRateLimiter.isRequestAllowedCheckOnly(requestWeight, requestTime)
  }

}

