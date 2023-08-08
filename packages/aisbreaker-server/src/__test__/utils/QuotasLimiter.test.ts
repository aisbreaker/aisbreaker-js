import { QuotasLimiter } from '../../utils/QuotasLimiter.js'
import { Quotas } from '../../rest-api/index.js'


describe('testing QuotasLimiter', () => {
  const quotas: Quotas = {
    globalRequestLimits: {
      requestsPerMinute: 2,
      requestsPerHour: 4,
      requestsPerDay: 6,
    },
    perClientRequestLimits: {
      requestsPerMinute: 1,
      requestsPerHour: 3,
      requestsPerDay: 5,
    }
  }
  const limiter = new QuotasLimiter(quotas)

  const ip1 = "1.1.1.1"
  const ip2 = "2.2.2.2"
  const ip3 = "3.3.3.3"

  const now = new Date()
  const nowPlus5s = new Date(now.getTime() + 5*1000)
  const nowPlus5mins = new Date(now.getTime() + 5*60*1000)
  const nowPlus7mins = new Date(now.getTime() + 7*60*1000)
  const nowPlus9mins = new Date(now.getTime() + 9*60*1000)
  const nowPlus5hours = new Date(now.getTime() + 5*60*60*1000)
  const nowPlus7hours = new Date(now.getTime() + 7*60*60*1000)
  const nowPlus9hours = new Date(now.getTime() + 9*60*60*1000)
  const nowPlus5days = new Date(now.getTime() + 5*24*60*60*1000)

  test('Request 1 allowed  after  5s', () => {
    expect(limiter.isRequestDenied(ip1, 1, nowPlus5s)).toBeFalsy()
  })
  test('Request 2 denied after  5s', () => {
    expect(limiter.isRequestDenied(ip1, 1, nowPlus5s)).toBeDefined()
  })
  test('Request 3 allowed  after  5s', () => {
    expect(limiter.isRequestDenied(ip2, 1, nowPlus5s)).toBeFalsy()
  })
  test('Request 4 denied after  5s', () => {
    expect(limiter.isRequestDenied(ip2, 1, nowPlus5s)).toBeDefined()
  })
  test('Request 5 denied after  5s', () => {
    expect(limiter.isRequestDenied(ip3, 1, nowPlus5s)).toBeDefined() // global 3rd of the minute (global limit 2)
  })
  test('Request 6 denied after  5s', () => {
    expect(limiter.isRequestDenied(ip3, 1, nowPlus5s)).toBeDefined()
  })

  test('Request 7 allowed after  5min', () => {
    expect(limiter.isRequestDenied(ip1, 1, nowPlus5mins)).toBeFalsy() // global 3rd of the hour
  })
  test('Request 8 allowed after  7min', () => {
    expect(limiter.isRequestDenied(ip2, 1, nowPlus7mins)).toBeFalsy() // global 4th of the hour
  })
  test('Request 9 denied  after  9min', () => {
    expect(limiter.isRequestDenied(ip3, 1, nowPlus9mins)).toBeDefined() // global 5th of the hour (global limit 4)
  })

  test('Request 10 allowed  after  5hours', () => {
    expect(limiter.isRequestDenied(ip1, 1, nowPlus5hours)).toBeFalsy() // global 5th of the day
  })
  test('Request 11 allowed  after  7hours', () => {
    expect(limiter.isRequestDenied(ip2, 1, nowPlus7hours)).toBeFalsy() // global 6th of the day
  })
  test('Request 12 denied   after  9hours', () => {
    expect(limiter.isRequestDenied(ip3, 1, nowPlus9hours)).toBeDefined() // global 7th of the day (global limit 6)
  })

  test('Request 13 allowed  after  5days', () => {
    expect(limiter.isRequestDenied(ip1, 1, nowPlus5days)).toBeFalsy()
  })

})
