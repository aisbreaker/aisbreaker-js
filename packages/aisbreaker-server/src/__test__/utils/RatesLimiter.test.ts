import { RatesLimiter } from '../../utils/RatesLimiter.js'
import { RequestLimits } from '../../rest-api/index.js'


describe('testing RatesLimiter', () => {
  const requestLimits: RequestLimits = {
    requestsPerMinute: 3,
    requestsPerHour: 5,
    requestsPerDay: 7,
  }
  const limiter = new RatesLimiter(requestLimits)

  const now = new Date()
  const nowPlus5s = new Date(now.getTime() + 5*1000)
  const nowPlus5mins = new Date(now.getTime() + 5*60*1000)
  const nowPlus5hours = new Date(now.getTime() + 5*60*60*1000)
  const nowPlus5days = new Date(now.getTime() + 5*24*60*60*1000)

  test('Request 1 = true  after  5s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5s)).toBe(true)
  })
  test('Request 2 = true  after  5s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5s)).toBe(true)
  })
  test('Request 3 = false after  5s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5s)).toBe(true)
  })
  test('Request 4 = false after  5s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5s)).toBe(false)
  })

  test('Request 5 = true  after  5mins', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5mins)).toBe(true)
  })
  test('Request 6 = true  after  5mins', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5mins)).toBe(true)
  })
  test('Request 7 = true  after  5mins', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5mins)).toBe(false)
  })

  test('Request 5 = true  after  5hours', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5hours)).toBe(true)
  })
  test('Request 6 = true  after  5hours', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5hours)).toBe(true)
  })
  test('Request 7 = true  after  5hours', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5hours)).toBe(false)
  })

  test('Request 8 = true  after  5days', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5days)).toBe(true)
  })
  test('Request 9 = true  after  5days', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5days)).toBe(true)
  })
  test('Request 10= true  after  5days', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5days)).toBe(true)
  })
  test('Request 11= true  after  5days', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5days)).toBe(false)
  })
})
