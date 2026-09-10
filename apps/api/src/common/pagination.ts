export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePage(page?: string | number, pageSize?: string | number) {
  const parsedPage = Math.max(1, Math.trunc(Number(page) || 1));
  const parsedSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(Number(pageSize) || DEFAULT_PAGE_SIZE)),
  );
  return {
    page: parsedPage,
    pageSize: parsedSize,
    skip: (parsedPage - 1) * parsedSize,
    take: parsedSize,
  };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}
