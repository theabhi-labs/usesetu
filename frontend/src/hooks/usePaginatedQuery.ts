import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export function usePaginatedQuery<T>(
  queryKey: unknown[],
  fetchFn: (page: number, limit: number, filters: Record<string, unknown>) => Promise<any>,
  listKey: string,
  initialFilters: Record<string, unknown> = {}
) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters);

  const query = useQuery({
    queryKey: [...queryKey, page, limit, filters],
    queryFn: () => fetchFn(page, limit, filters),
    placeholderData: (previousData) => previousData,
  });

  const rawData = query.data;
  const list: T[] = rawData ? (rawData[listKey] as T[]) || [] : [];
  const pagination = rawData?.pagination as {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | undefined;

  return {
    ...query,
    data: list,
    pagination: pagination || { page, limit, total: 0, totalPages: 0 },
    page,
    setPage,
    limit,
    setLimit,
    filters,
    setFilters,
  };
}
