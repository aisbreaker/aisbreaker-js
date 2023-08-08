

interface X {
    overallQuota: Quotas
    perRemoteIpQuota: Quotas
}

interface Quotas {
    requestsPerMinute: Limit
    requestsPerHour: Limit
    requestsPerDay: Limit
}

interface Limit { 
    maxRequests: number
}

// sliding window counter