import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/utils/cn.js';
import { t } from '@/i18n/index.js';
import { X } from 'lucide-react';
import { forwardRef } from 'react';

export const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card text-card-foreground shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none">
        <X className="h-4 w-4" />
        <span className="sr-only">{t('action.close')}</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1.5 p-3 pb-2', className)} {...props} />
);
export const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn('text-sm font-semibold', className)} {...props} />
);
export const DialogDescription = ({ className, ...props }) => (
  // pre-line: the cleanup plan is a multi-line string, so keep its newlines.
  <DialogPrimitive.Description className={cn('whitespace-pre-line text-xs text-muted-foreground', className)} {...props} />
);
export const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-wrap items-center justify-end gap-2 p-3 pt-2', className)} {...props} />
);