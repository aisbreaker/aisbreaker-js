

export interface Quotas {
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
