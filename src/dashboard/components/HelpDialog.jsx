import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';

const POINTS = ['help.badge', 'help.popup', 'help.dashboard', 'help.groups', 'help.clean', 'help.sheets', 'help.settings'];

export function HelpDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="w-[min(560px,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>{t('help.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-3 pb-1 text-xs text-muted-foreground">
          <p>{t('help.intro')}</p>
          <ul className="ml-4 list-disc space-y-1.5">
            {POINTS.map((key) => <li key={key}>{t(key)}</li>)}
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{t('action.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
