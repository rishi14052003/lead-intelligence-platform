import { useState, useEffect } from "react";

interface UseFetchOptions<T> {
  fetcher: () => Promise<T>;
  immediate?: boolean;
}

export function useFetch<T>({ fetcher, immediate = true }: UseFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return { data, loading, error, execute };
}