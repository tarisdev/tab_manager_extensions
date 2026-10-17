import { faviconUrl } from '@/services/favicon.js';

export function SearchResult({ tab, onOpen }) {
  return (
    <button
      type="button"
      className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onOpen}
    >
      <img src={faviconUrl(tab.url)} alt="" className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{tab.title || tab.url}</div>
        <div className="truncate text-[11px] text-muted-foreground">{tab.url}</div>
      </div>
    </button>
  );
}