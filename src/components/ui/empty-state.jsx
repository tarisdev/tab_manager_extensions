import { CircleCheck } from 'lucide-react';

/** Empty-state row: an icon plus a message, so a list never renders blank. */
export function EmptyState({ message, icon: Icon = CircleCheck }) {
  return (
    <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ok">
      <Icon />
      {message}
    </p>
  );
}