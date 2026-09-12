import { paginated, parsePage } from './pagination';

describe('pagination', () => {
  it('defaults to page 1 and 20 items', () => {
    expect(parsePage()).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it('caps page size and floors page', () => {
    expect(parsePage(0, 500)).toMatchObject({ page: 1, pageSize: 100, skip: 0 });
    expect(parsePage(3, 10)).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  it('exposes pageCount from totals', () => {
    expect(paginated([1], 21, 1, 20).pageCount).toBe(2);
    expect(paginated([], 0, 1, 20).pageCount).toBe(1);
  });
});
