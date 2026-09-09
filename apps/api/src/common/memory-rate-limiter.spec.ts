import { MemoryRateLimiter } from './memory-rate-limiter';

describe('MemoryRateLimiter', () => {
  it('blocks a burst over the max in the window', () => {
    const limiter = new MemoryRateLimiter(3, 60_000);
    expect(limiter.consume('login:1:a')).toBe(true);
    expect(limiter.consume('login:1:a')).toBe(true);
    expect(limiter.consume('login:1:a')).toBe(true);
    expect(limiter.consume('login:1:a')).toBe(false);
    expect(limiter.consume('login:1:other')).toBe(true);
  });
});
