import * as React from 'react';
import { cn } from '@/utils/cn.js';

const variants = {
  default: 'bg-secondary text-secondary-foreground',
  outline: 'border border-input text-foreground',
  destructive: 'bg-destructive/15 text-destructive',
  ok: 'bg-ok/15 text-ok'
};

export const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] leading-tight',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';