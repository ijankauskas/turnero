import { bumpEmailRetry } from './retry';

describe('bumpEmailRetry (NTF-006)', () => {
  it('keeps the job pending until the third failure', () => {
    const first = bumpEmailRetry({ to: 'ana@t.test' });
    expect(first.retries).toBe(1);
    expect(first.giveUp).toBe(false);
    const second = bumpEmailRetry(first.payload);
    expect(second.retries).toBe(2);
    expect(second.giveUp).toBe(false);
    const third = bumpEmailRetry(second.payload);
    expect(third.retries).toBe(3);
    expect(third.giveUp).toBe(true);
    expect(third.payload.to).toBe('ana@t.test');
  });
});
