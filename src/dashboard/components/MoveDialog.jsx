import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { SelectField } from '@/dashboard/components/SelectField.jsx';

/** Target picker for Move: one list of the other windows, then confirm. */
export function MoveDialog({ targets, value, onChange, onConfirm, onClose }) {
  const options = targets.map((target) => ({ value: String(target.id), label: target.label }));
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('moveToWindow')}</DialogTitle>
        </DialogHeader>
        <div className="px-3 pb-2">
          <SelectField value={value} onChange={onChange} options={options} label={t('moveToWindow')} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('action.cancel')}</Button>
          <Button onClick={onConfirm}>{t('action.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
