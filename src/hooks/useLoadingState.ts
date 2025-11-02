import { useState, useCallback } from "react";

export const useLoadingState = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const startLoading = useCallback((message?: string) => {
    setIsLoading(true);
    setLoadingMessage(message || null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(null);
  }, []);

  const withLoading = useCallback(
    async <T,>(operation: () => Promise<T>, message?: string): Promise<T> => {
      startLoading(message);
      try {
        return await operation();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    loadingMessage,
    startLoading,
    stopLoading,
    withLoading,
  };
};
