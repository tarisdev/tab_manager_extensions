import { CircleCheck, Trash } from 'lucide-react';
import { t } from '@/i18n/index.js';
import { Badge } from '@/components/ui/badge.jsx';

export function DuplicateRow({ group, onSwitch, onCloseCopies }) {
  const meta = group.isGoogleSheets && group.gid !== null ? `${group.domain} · ${t('sheetLabel', { gid: group.gid })}` : group.domain;
  return (
    <div className="space-y-1 rounded-md border border-border/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-xs font-medium">{meta}</div>
          {group.isGoogleSheets && <Badge variant="ok">{t('category.sheets')}</Badge>}
          <Badge>{`×${group.count}`}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onSwitch}
          title={t('action.jumpFirstCopy')}
        >
          <CircleCheck className="h-3.5 w-3.5" />
          {t('action.jumpFirstCopy')}
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onCloseCopies}
        >
          <Trash className="h-3.5 w-3.5" />
          {t('action.closeN', { count: group.count - 1 })}
        </button>
      </div>
    </div>
  );
}