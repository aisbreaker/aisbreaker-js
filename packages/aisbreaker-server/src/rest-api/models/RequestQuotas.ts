

export interface RequestQuotas {
  /** limits for all requests to the service */
  globalRequestLimits: RequestLimits
  /** limits per client (IP) to the service */
  perClientRequestLimits: RequestLimits
}

export interface RequestLimits {
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
}

//
// User Defined Type Guards
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
//
export function isRequestQuotas(obj: any): obj is RequestQuotas {
  if (!obj) {
    return false
  }
  if (!obj.globalRequestLimits || !isRequestLimits(obj.globalRequestLimits)) {
    return false
  }
  if (!obj.perClientRequestLimits || !isRequestLimits(obj.perClientRequestLimits)) {
    return false
  }
  return true
}

export function isRequestLimits(obj: any): obj is RequestLimits {
  if (!obj) {
    return false
  }
  if (!obj.requestsPerMinute || typeof obj.requestsPerMinute !== 'number') {
    return false
  }
  if (!obj.requestsPerHour || typeof obj.requestsPerHour !== 'number') {
    return false
  }
  if (!obj.requestsPerDay || typeof obj.requestsPerDay !== 'number') {
    return false
  }
  return true
}
