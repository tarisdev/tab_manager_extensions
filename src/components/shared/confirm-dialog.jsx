import { t } from '@/i18n/index.js';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';

export function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      {/* Escape and a click on the backdrop cancel, exactly like the old confirm(). */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('action.confirm')}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t('action.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('action.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}