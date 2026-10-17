import { useState, useEffect } from 'react';
import { CircleCheck, Eraser, LayoutDashboard, RefreshCw, Search, SunMoon, Trash } from 'lucide-react';
import { KEEP_RULES, MSG } from '@/constants/index.js';
import { faviconUrl } from '@/services/favicon.js';
import { applyTranslations, resolveLocale, t } from '@/i18n/index.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ConfirmDialog } from '@/components/shared/confirm-dialog.jsx';
import { EmptyState } from '@/components/ui/empty-state.jsx';
import { Input } from '@/components/ui/input.jsx';
import { RepoLink } from '@/components/ui/repo-link.jsx';
import { Stat } from '@/components/ui/stat.jsx';
import { useConfirm } from '@/hooks/useConfirm.js';
import { useTabState } from '@/hooks/useTabState.js';
import { nextTheme, useTheme } from '@/hooks/useTheme.js';
import { send } from '@/services/messaging.js';
const MAX_RESULTS=25;
function SearchResult({tab,onOpen}){
  return (
    <button type="button" className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onOpen}>
      <img src={faviconUrl(tab.url)} alt="" className="h-4 w-4 flex-shrink-0"/>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{tab.title||tab.url}</div>
        <div className="truncate text-[11px] text-muted-foreground">{tab.url}</div>
      </div>
    </button>
  );
}
function DuplicateRow({group,onSwitch,onCloseCopies}){
  const meta=group.isGoogleSheets&&group.gid!==null?`${group.domain} · ${t('sheetLabel',{gid:group.gid})}`:group.domain;
  return (
    <div className="space-y-1 rounded-md border border-border/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-xs font-medium">{meta}</div>
          {group.isGoogleSheets&&<Badge variant="ok">{t('category.sheets')}</Badge>}
          <Badge>{`×${group.count}`}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onSwitch} title={t('action.jumpFirstCopy')}><CircleCheck className="h-3.5 w-3.5"/>{t('action.jumpFirstCopy')}</button>
        <button type="button" className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onCloseCopies}><Trash className="h-3.5 w-3.5"/>{t('action.closeN',{count:group.count-1})}</button>
      </div>
    </div>
  );
}
export function Popup(){
  const { state, settings, refresh, updateSettings } = useTabState();
  const confirmState = useConfirm();
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('');
  const [statusError,setStatusError]=useState(false);
  resolveLocale(settings?.locale);
  useTheme(settings?.theme);
  applyTranslations();
  useEffect(()=>{
    const listener=(message)=>{ if(message?.type===MSG.STATE_CHANGED){ refresh(); } };
    if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage){ chrome.runtime.onMessage.addListener(listener); }
    return ()=>{ if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage){ chrome.runtime.onMessage.removeListener(listener); } };
  },[refresh]);
  const search=query.trim().toLowerCase();
  const matches=search?state.tabs.filter(t=>t.searchable?.includes(search)).slice(0,MAX_RESULTS):[];
  const stats=state.stats||{};
  return (
    <>
    <div className="flex flex-col gap-3 p-3">
      <header className="flex items-center justify-between border-b border-border pb-2">
        <h1 className="text-xs font-semibold tracking-wider">TAB MANAGER</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" title={t('themeToggle')} onClick={()=>updateSettings({theme:nextTheme(settings?.theme)},true)}><SunMoon/></Button>
          <Button variant="ghost" size="icon-sm" title={t('refresh')} onClick={async()=>{await refresh();setStatus(t('status.refreshed'));setStatusError(false);}}><RefreshCw/></Button>
          <RepoLink/>
        </div>
      </header>
      <section className="grid grid-cols-4 gap-1.5">
        <Stat value={stats.totalTabs??0} label={t('stat.tabs')} tone="default"/>
        <Stat value={stats.totalWindows??0} label={t('stat.windows')} tone="default"/>
        <Stat value={stats.duplicateTabs??0} label={t('stat.dup')} tone="dup"/>
        <Stat value={stats.sheetsTabs??0} label={t('stat.sheets')} tone="sheets"/>
      </section>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
        <Input id="search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchTabs')} className="pl-8"/>
      </div>
      <section className="max-h-70 space-y-2 overflow-auto pr-1">
        {search?(matches.length===0?<EmptyState icon={Search} message={t('status.noResults')}/>:<div className="space-y-1">{matches.map(tab=><SearchResult key={tab.id} tab={tab} onOpen={async()=>{await send(MSG.ACTIVATE_TAB,{tabId:tab.id,windowId:tab.windowId});window.close();}}/>)}</div>):(state.duplicateGroups.length===0?<EmptyState icon={CircleCheck} message={t('status.noDupes')}/>:<div className="space-y-2">{state.duplicateGroups.slice(0,8).map(g=><DuplicateRow key={g.key} group={g} onSwitch={async()=>{const target=g.tabIds[0];const tab=state.tabs.find(x=>x.id===target);await send(MSG.ACTIVATE_TAB,{tabId:target,windowId:tab?.windowId});window.close();}} onCloseCopies={async()=>{const target=g.tabIds[0];const res=await send(MSG.CLOSE_OTHER_TABS,{tabId:target});setStatus(res.ok&&res.closed?t('status.sheetsClosed',{count:res.closed}):t('status.nothingToClose'));setStatusError(!res.ok);refresh();}}/>)}</div>)}
      </section>
      <section className="mt-auto flex flex-col gap-1.5 border-t border-border pt-2">
        <Button onClick={async()=>{const rule=settings?.duplicateRule||KEEP_RULES.ACTIVE;const preview=await send(MSG.CLEAN_DUPLICATES,{rule,dryRun:true});if(!preview.ok){setStatus(preview.error||t('status.cleanupFailed'));setStatusError(true);return;} if(preview.total===0){setStatus(t('status.nothingToClean'));setStatusError(false);return;} const ok=await confirmState.ask(t('confirm.clean',{count:preview.total}));if(!ok)return;const res=await send(MSG.CLEAN_DUPLICATES,{rule,dryRun:false});setStatus(res.ok&&res.closed?t('status.dupesClosed',{count:res.closed}):t('status.nothingClosed'));setStatusError(!res.ok);refresh();}} size="sm" className="w-full justify-start"><Eraser className="mr-1.5 h-4 w-4"/>{t('cleanDuplicates')}</Button>
        <Button onClick={async()=>{const total=state.stats?.duplicateTabs||0;if(total===0){setStatus(t('status.noDupesToClose'));setStatusError(false);return;} const ok=await confirmState.ask(t('confirm.closeAll',{count:total}));if(!ok)return;const ids=state.duplicateGroups.flatMap(g=>g.tabIds.slice(1));const res=await send(MSG.CLOSE_TABS,{tabIds:ids});setStatus(res.ok&&res.closed?t('status.tabsClosed',{count:res.closed}):t('status.nothingClosed'));setStatusError(!res.ok);refresh();}} variant="outline" size="sm" className="w-full justify-start"><Trash className="mr-1.5 h-4 w-4"/>{t('closeAllDuplicates')}</Button>
        <Button onClick={async()=>{await send(MSG.OPEN_DASHBOARD);window.close();}} variant="ghost" size="sm" className="w-full justify-start"><LayoutDashboard className="mr-1.5 h-4 w-4"/>{t('openDashboard')}</Button>
      </section>
      <p className={`text-[11px] ${statusError?'text-destructive':'text-muted-foreground'}`} role="status">{status}</p>
    </div>
    <ConfirmDialog open={confirmState.open} message={confirmState.message} onConfirm={confirmState.confirm} onCancel={confirmState.cancel} />
    </>
  );
}
