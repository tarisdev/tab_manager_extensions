import { useState } from 'react';
import { MSG } from '@/constants/index.js';
import { t } from '@/i18n/index.js';
import { send } from '@/services/messaging.js';
import { windowOptions } from '../utils.js';

/**
 * "Move to window" flow: which tabs are pending, the candidate windows and the
 * confirmed MOVE_TABS call. `options` is the count used to enable the buttons.
 */
export function useTabMove(tabs, report) {
  const [pending, setPending] = useState(null);
  const [targets, setTargets] = useState([]);
  const [windowId, setWindowId] = useState('');
  const options = windowOptions(tabs, null).length;

  /** Nothing to move to when this is the only open window. */
  const open = (tabIds, excludeWindowId = null) => {
    const candidates = windowOptions(tabs, excludeWindowId);
    if (candidates.length === 0) return;
    setTargets(candidates);
    setWindowId(String(candidates[0].id));
    setPending(tabIds);
  };

  const close = () => setPending(null);

  const confirm = async () => {
    const tabIds = pending;
    if (!tabIds) return;
    setPending(null);
    const result = await send(MSG.MOVE_TABS, { tabIds, windowId: Number(windowId) });
    report(result, t('status.moved', { count: tabIds.length }), t('status.moveFailed'));
  };

  return { pending, targets, windowId, setWindowId, options, open, close, confirm };
}
