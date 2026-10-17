import { ChevronDown, ChevronRight } from 'lucide-react';
import { t } from '@/i18n/index.js';
import { Badge } from '@/components/ui/badge.jsx';

export function GroupSection({ group, collapsed, onToggle, children }) {
  return (
    <section className="rounded-md border border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-t-md bg-secondary/60 px-3 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:ring-offset-0"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span className="flex w-3 flex-none justify-center text-muted-foreground">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{group.label}</span>
        <span className="flex-none text-[11px] font-normal text-muted-foreground">
          {t('tabCount', { count: group.count })}
        </span>
        {group.duplicateCount > 0 && (
          <Badge variant="destructive">{t('dupCount', { count: group.duplicateCount })}</Badge>
        )}
        {group.sheetCount > 1 && (
          <span className="flex-none text-[11px] font-normal text-muted-foreground">
            {t('sheetCount', { count: group.sheetCount })}
          </span>
        )}
      </button>
      {!collapsed && <ul className="m-0 list-none p-0">{children}</ul>}
    </section>
  );
}