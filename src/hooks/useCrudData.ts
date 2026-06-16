import { useState, useEffect, useCallback } from 'react';
import { apiCommand } from '@/api/commands';

interface UseCrudDataOptions {
  
  params?: Record<string, unknown>;
  
  skip?: boolean;
}

interface UseCrudDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}








export function useCrudData<T>(
  command: string,
  options?: UseCrudDataOptions
): UseCrudDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCommand<T[]>(command, options?.params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la incarcarea datelor');
    } finally {
      setLoading(false);
    }
  }, [command, options?.params]);

  useEffect(() => {
    if (!options?.skip) {
      void refetch();
    }
  }, [refetch, options?.skip]);

  return { data, loading, error, refetch };
}
