import { cn } from '@/utils/cn.js';

export function Toast({ toast }) {
  if (!toast) return null;
  const styles = {
    info: 'border border-border bg-card text-foreground',
    success: 'border border-ok/40 bg-card text-foreground',
    error: 'border border-destructive/40 bg-card text-foreground'
  }[toast.type] || 'border border-border bg-card text-foreground';

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className={cn('rounded-md px-3 py-1.5 text-xs shadow-md', styles)}>
        {toast.message}
      </div>
    </div>
  );
}