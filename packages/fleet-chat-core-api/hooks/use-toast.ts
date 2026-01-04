/**
 * useToast Hook
 *
 * React hook for showing toast notifications
 */

import { useState, useCallback } from 'react';

export interface ToastOptions {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface Toast extends ToastOptions {
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = {
      id,
      ...options,
    };

    setToasts((prev) => [...prev, toast]);

    if (options.duration ?? 3000 > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, options.duration ?? 3000);
    }

    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
    clearToasts,
  };
}
