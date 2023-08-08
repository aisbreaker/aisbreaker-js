

import { SingleRateLimiter } from '../../utils/SingleRateLimiter'; /* NOT .js */
//import { SingleRateLimiter } from '../../../build/utils/SingleRateLimiter.js';


test('trivial test 1+1=2', () => {
  expect(1+1).toBe(2);
});

describe('testing SingleRateLimiter', () => {
  const maxRequestsPerInterval = 2
  const intervalSeconds = 60
  const limiter = new SingleRateLimiter(maxRequestsPerInterval, intervalSeconds)

  const now = new Date()
  const nowPlus5s = new Date(now.getTime() + 5*1000)
  const nowPlus10s = new Date(now.getTime() + 10*1000)
  const nowPlus15s = new Date(now.getTime() + 15*1000)
  const nowPlus70s = new Date(now.getTime() + 70*1000)

  test('1/2 request = true  after  5s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus5s)).toBe(true);
  });
  test('2/2 request = true  after 15s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus15s)).toBe(true);
  });
  test('3/2 request = false after 15s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus15s)).toBe(false);
  });
  test('4/2 request = true  after 70s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus70s)).toBe(true);
  });
  test('5/2 request = false after 70s', () => {
    expect(limiter.isRequestAllowed(1, nowPlus70s)).toBe(false);
  });
});
