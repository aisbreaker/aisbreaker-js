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

  test('Request 1 allowed after  5s', () => {
    expect(limiter.isRequestDenied(1, nowPlus5s)).toBeFalsy()
  })
  test('Request 2 allowed after  5s', () => {
    expect(limiter.isRequestDenied(1, nowPlus5s)).toBeFalsy()
  })
  test('Request 3 denied  after  5s', () => {
    expect(limiter.isRequestDenied(1, nowPlus5s)).toBeFalsy()
  })
  test('Request 4 denied  after  5s', () => {
    expect(limiter.isRequestDenied(1, nowPlus5s)).toBeDefined()
  })

  test('Request 5 allowed  after  5mins', () => {
    expect(limiter.isRequestDenied(1, nowPlus5mins)).toBeFalsy()
  })
  test('Request 6 allowed  after  5mins', () => {
    expect(limiter.isRequestDenied(1, nowPlus5mins)).toBeFalsy()
  })
  test('Request 7 denied   after  5mins', () => {
    expect(limiter.isRequestDenied(1, nowPlus5mins)).toBeDefined()
  })

  test('Request 8 allowed  after  5hours', () => {
    expect(limiter.isRequestDenied(1, nowPlus5hours)).toBeFalsy()
  })
  test('Request 9 allowed  after  5hours', () => {
    expect(limiter.isRequestDenied(1, nowPlus5hours)).toBeFalsy()
  })
  test('Request 10 denied  after  5hours', () => {
    expect(limiter.isRequestDenied(1, nowPlus5hours)).toBeDefined()
  })

  test('Request 11 allowed  after  5days', () => {
    expect(limiter.isRequestDenied(1, nowPlus5days)).toBeFalsy()
  })
  test('Request 12 allowed  after  5days', () => {
    expect(limiter.isRequestDenied(1, nowPlus5days)).toBeFalsy()
  })
  test('Request 13 allowed  after  5days', () => {
    expect(limiter.isRequestDenied(1, nowPlus5days)).toBeFalsy()
  })
  test('Request 14 allowed  after  5days', () => {
    expect(limiter.isRequestDenied(1, nowPlus5days)).toBeDefined()
  })
})
