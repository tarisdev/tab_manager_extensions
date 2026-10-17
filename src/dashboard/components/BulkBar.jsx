import { MoveRight, Trash, X } from 'lucide-react';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button.jsx';

/** Selection actions. Rendered only while at least one tab is selected. */
export function BulkBar({ count, moveDisabled, onClose, onMove, onClear }) {
  return (
    <section className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/60 px-4 py-2">
      <span className="text-xs font-medium">{t('bulk.selected', { count })}</span>
      <Button variant="danger" size="sm" onClick={onClose}><Trash />{t('bulk.close')}</Button>
      <Button variant="outline" size="sm" disabled={moveDisabled} onClick={onMove}>
        <MoveRight />{t('bulk.move')}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}><X />{t('bulk.clear')}</Button>
    </section>
  );
}
