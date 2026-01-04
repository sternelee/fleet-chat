/**
 * usePromise Hook
 *
 * React hook for managing async operations with loading/error states
 * Similar to @raycast/utils usePromise
 */

import { useState, useEffect, useCallback } from 'react';

export interface UsePromiseResult<T, E = Error> {
  data: T | null;
  error: E | null;
  isLoading: boolean;
  revalidate: () => Promise<void>;
}

export interface UsePromiseOptions {
  executeOnMount?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function usePromise<T, E = Error>(
  asyncFn: () => Promise<T>,
  deps: unknown[] = [],
  options?: UsePromiseOptions,
): UsePromiseResult<T, E> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(options?.executeOnMount ?? true);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setData(result);
      options?.onSuccess?.(result);
    } catch (err) {
      const error = err as E;
      setError(error);
      options?.onError?.(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, options]);

  useEffect(() => {
    if (options?.executeOnMount ?? true) {
      void execute();
    }
  }, [...deps, execute]);

  return {
    data,
    error,
    isLoading,
    revalidate: execute,
  };
}
