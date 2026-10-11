import { useCallback, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'info', timeout = 1800) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), timeout);
  }, []);
  const clear = useCallback(() => setToast(null), []);
  return { toast, show, clear };
}