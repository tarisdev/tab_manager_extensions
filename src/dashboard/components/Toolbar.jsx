import { ArrowDownUp, Search } from 'lucide-react';
import { GROUP_MODES, SORT_MODES } from '@/constants/index.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/utils/cn.js';
import { SelectField } from './SelectField.jsx';

const CHIP_BASE = 'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background';

/** Search, filter chips, grouping rule and the sort trigger. */
export function Toolbar({
  query, onQueryChange, chips, filter, onFilterChange, groupBy, sortBy, onUpdate, sorting, onApplySort
}) {
  const groupOptions = [
    { value: GROUP_MODES.DOMAIN, label: t('groupBy.domain') },
    { value: GROUP_MODES.WINDOW, label: t('groupBy.window') },
    { value: GROUP_MODES.SPREADSHEET, label: t('groupBy.spreadsheet') }
  ];
  const sortOptions = [
    { value: SORT_MODES.GROUP, label: t('sort.group') },
    { value: SORT_MODES.TITLE, label: t('sort.title') },
    { value: SORT_MODES.DOMAIN, label: t('sort.domain') },
    { value: SORT_MODES.RECENT, label: t('sort.recent') }
  ];
  return (
    <section className="flex flex-wrap items-center gap-2 px-4 py-3">
      <div className="relative min-w-45 flex-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search" autoComplete="off"
          value={query} onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('searchPlaceholder')} aria-label={t('searchTabs')}
          className="pl-7"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('filter.label')}>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={filter === chip.key}
            onClick={() => onFilterChange(chip.key)}
            className={cn(CHIP_BASE, filter === chip.key
              ? 'border-primary bg-accent text-accent-foreground'
              : 'border-input text-muted-foreground hover:bg-secondary')}
          >
            {chip.label} {chip.count}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{t('groupBy')}</span>
        <SelectField
          className="w-37.5" value={groupBy} options={groupOptions} label={t('groupBy')}
          onChange={(value) => onUpdate({ groupBy: value }, true)}
        />
        <span className="text-[11px] text-muted-foreground">{t('sortBy')}</span>
        <SelectField
          className="w-37.5" value={sortBy} options={sortOptions} label={t('sortBy')}
          onChange={(value) => onUpdate({ sortBy: value }, true)}
        />
        <Button variant="outline" size="sm" disabled={sorting} onClick={onApplySort}>
          <ArrowDownUp />{t('action.sortTabs')}
        </Button>
      </div>
    </section>
  );
}
