import { cn } from '@/utils/cn.js';

const tones = {
  default: '',
  dup: '[&_.stat-value]:text-destructive',
  sheets: '[&_.stat-value]:text-ok'
};

export function Stat({ value, label, tone = 'default' }) {
  return (
    <div className={cn('rounded-md border border-border bg-card px-2 py-1.5', tones[tone])}>
      <div className="stat-value text-base font-semibold leading-tight">{String(value ?? 0)}</div>
      <div className="stat-label text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}