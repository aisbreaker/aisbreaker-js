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
  const nowPlus5hours = new Date(now.getTime() + 5*60*60*1000)
  const nowPlus5days = new Date(now.getTime() + 5*24*60*60*1000)

  test('Request 1 = true  after  5s', () => {
    expect(limiter.isRequestAllowed(ip1, 1, nowPlus5s)).toBe(true)
  })
  test('Request 2 = false after  5s', () => {
    expect(limiter.isRequestAllowed(ip1, 1, nowPlus5s)).toBe(false)
  })
  test('Request 3 = true  after  5s', () => {
    expect(limiter.isRequestAllowed(ip2, 1, nowPlus5s)).toBe(true)
  })
  test('Request 4 = false after  5s', () => {
    expect(limiter.isRequestAllowed(ip2, 1, nowPlus5s)).toBe(false)
  })
  test('Request 5 = false after  5s', () => {
    expect(limiter.isRequestAllowed(ip3, 1, nowPlus5s)).toBe(false) // global 3rd of the minute (global limit 2)
  })
  test('Request 6 = false after  5s', () => {
    expect(limiter.isRequestAllowed(ip3, 1, nowPlus5s)).toBe(false)
  })

  test('Request 7 = true  after  5min', () => {
    expect(limiter.isRequestAllowed(ip1, 1, nowPlus5mins)).toBe(true) // global 3rd of the hour
  })
  test('Request 8 = true  after  5min', () => {
    expect(limiter.isRequestAllowed(ip2, 1, nowPlus5mins)).toBe(true) // global 4th of the hour
  })
  test('Request 9 = true  after  5min', () => {
    expect(limiter.isRequestAllowed(ip3, 1, nowPlus5mins)).toBe(false) // global 5th of the hour (global limit 4)
  })

  test('Request 10 = true  after  5hours', () => {
    expect(limiter.isRequestAllowed(ip1, 1, nowPlus5hours)).toBe(true) // global 5th of the day
  })
  test('Request 11 = true  after  5hours', () => {
    expect(limiter.isRequestAllowed(ip2, 1, nowPlus5hours)).toBe(true) // global 6th of the day
  })
  test('Request 12 = true  after  5hours', () => {
    expect(limiter.isRequestAllowed(ip3, 1, nowPlus5hours)).toBe(false) // global 7th of the day (global limit 6)
  })
})
