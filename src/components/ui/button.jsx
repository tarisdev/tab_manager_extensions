import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/utils/cn.js';

const base = [
  'inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'disabled:pointer-events-none disabled:opacity-50',
  '[&_svg]:size-3.5 [&_svg]:shrink-0'
].join(' ');

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  danger: 'border border-destructive/40 text-destructive hover:bg-destructive/10',
  subtle: 'bg-secondary/70 text-secondary-foreground hover:bg-secondary'
};

const sizes = {
  sm: 'h-7 px-2',
  md: 'h-8 px-2.5',
  lg: 'h-9 px-3',
  icon: 'size-8 px-0',
  'icon-sm': 'size-7 px-0'
};

export const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';