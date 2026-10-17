import { ChevronsDownUp, CircleHelp, Eraser, RefreshCw, Settings as SettingsIcon, SunMoon, Trash } from 'lucide-react';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button.jsx';
import { RepoLink } from '@/components/ui/repo-link.jsx';

/** Title, icon buttons and the bulk actions on the tab strip. */
export function HeaderBar({
  onToggleTheme, onHelp, onSettings, onRefresh, onCollapseAll, onCleanDuplicates, onCloseAllDuplicates
}) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2">
      <div className="flex items-center gap-1">
        <h1 className="text-base font-semibold tracking-wider">TAB MANAGER</h1>
        <Button
          variant="ghost" size="icon-sm"
          title={t('themeToggle')} aria-label={t('themeToggle')}
          onClick={onToggleTheme}
        >
          <SunMoon />
        </Button>
        <Button variant="ghost" size="icon-sm" title={t('help')} aria-label={t('help')} onClick={onHelp}>
          <CircleHelp />
        </Button>
        <Button variant="ghost" size="icon-sm" title={t('settings')} aria-label={t('settings')} onClick={onSettings}>
          <SettingsIcon />
        </Button>
        <RepoLink />
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw />{t('refresh')}</Button>
        <Button variant="outline" size="sm" onClick={onCollapseAll}><ChevronsDownUp />{t('collapseAll')}</Button>
        <Button size="sm" onClick={onCleanDuplicates}><Eraser />{t('cleanDuplicates')}</Button>
        <Button variant="danger" size="sm" onClick={onCloseAllDuplicates}><Trash />{t('closeAllDuplicates')}</Button>
      </div>
    </header>
  );
}
