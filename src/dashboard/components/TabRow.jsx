import { EllipsisVertical } from 'lucide-react';
import { t } from '@/i18n/index.js';
import { faviconUrl } from '@/services/favicon.js';
import { Button } from '@/components/ui/button.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import { cn } from '@/utils/cn.js';

export function TabRow({ tab, duplicate, selected, targets, onSelect, onActivate, onClose, onCloseOthers, onMove, onCopy }) {
  const parts = [tab.domain || tab.url, `${tab.windowLabel} • ${t('tabId', { id: tab.id })}`];
  if (tab.isGoogleSheets && tab.gid !== null) parts.push(t('sheetLabel', { gid: tab.gid }));
  if (tab.active) parts.unshift(t('activeTag'));

  return (
    <li className={cn(
      'flex items-center gap-2 border-t border-border px-3 py-2 transition-colors hover:bg-secondary/60',
      tab.active && 'shadow-[inset_3px_0_0_var(--ok)]',
      duplicate && 'bg-destructive/5'
    )}>
      <input
        type="checkbox"
        className="size-3.5 flex-none accent-primary"
        checked={selected}
        onChange={onSelect}
        aria-label={t('selectTab', { title: tab.title || tab.url })}
      />
      <img src={faviconUrl(tab.url)} alt="" className="size-4 flex-none rounded-sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{tab.title || tab.url}</div>
        <div className="truncate text-[11px] text-muted-foreground">{parts.join(' • ')}</div>
      </div>
      <div className="flex flex-none items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={tab.active} onClick={onActivate}>
          {tab.active ? t('action.active') : t('action.open')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>{t('action.close')}</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" title={t('action.more')} aria-label={t('action.more')}>
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onActivate}>{t('action.activate')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={onClose}>{t('action.close')}</DropdownMenuItem>
            {duplicate && <DropdownMenuItem onSelect={onCloseOthers}>{t('action.closeOthers')}</DropdownMenuItem>}
            {targets.length > 0 && <DropdownMenuItem onSelect={onMove}>{t('moveToWindow')}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onCopy(tab.url, t('status.urlCopied'))}>{t('action.copyUrl')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopy(`${tab.title}\n${tab.url}`, t('status.titleUrlCopied'))}>{t('action.copyTitleUrl')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}