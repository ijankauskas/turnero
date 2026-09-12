import { apiJson } from './session';

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function queryString(
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function apiPage<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
) {
  return apiJson<PageResult<T>>(`${path}${queryString(params)}`);
}

export async function apiItems<T>(path: string, pageSize = 100) {
  const page = await apiPage<T>(path, { page: 1, pageSize });
  return page.items;
}
