import { useCallback, useRef, useState } from 'react';

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const resolver = useRef(null);

  const ask = useCallback((text) => {
    setMessage(text);
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const confirm = useCallback(() => {
    setOpen(false);
    if (resolver.current) resolver.current(true);
    resolver.current = null;
  }, []);

  const cancel = useCallback(() => {
    setOpen(false);
    if (resolver.current) resolver.current(false);
    resolver.current = null;
  }, []);

  return { open, message, ask, confirm, cancel };
}