

import { SingleRateLimiter } from '../../utils/SingleRateLimiter.js'


describe('testing SingleRateLimiter', () => {
  const maxRequestsPerInterval = 2
  const intervalSeconds = 60
  const limiter = new SingleRateLimiter(maxRequestsPerInterval, intervalSeconds)

  const now = new Date()
  const nowPlus5s = new Date(now.getTime() + 5*1000)
  const nowPlus10s = new Date(now.getTime() + 10*1000)
  const nowPlus15s = new Date(now.getTime() + 15*1000)
  const nowPlus70s = new Date(now.getTime() + 70*1000)

  test('1/2 request allowed after  5s', () => {
    expect(limiter.isRequestDenied(1, nowPlus5s)).toBeFalsy()
  });
  test('2/2 request allowed after 15s', () => {
    expect(limiter.isRequestDenied(1, nowPlus15s)).toBeFalsy()
  });
  test('3/2 request denied  after 15s', () => {
    expect(limiter.isRequestDenied(1, nowPlus15s)).toBeDefined()
  });
  test('4/2 request allowed after 70s', () => {
    expect(limiter.isRequestDenied(1, nowPlus70s)).toBeFalsy()
  });
  test('5/2 request denied  after 70s', () => {
    expect(limiter.isRequestDenied(1, nowPlus70s)).toBeDefined()
  });
});
