import { useCallback, useEffect, useState } from 'react';
import { MSG } from '@/constants/index.js';
import { send } from '@/services/messaging.js';

const EMPTY_STATE = { tabs: [], duplicateGroups: [], duplicateTabIds: [], stats: {} };

/**
 * Single source of truth for the UI. The service worker owns every chrome.*
 * call; this hook mirrors the state it broadcasts and applies settings.
 */
export function useTabState() {
  const [state, setState] = useState(EMPTY_STATE);
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let alive = true;
    const onMessage = (message) => {
      if (message?.type === MSG.STATE_CHANGED) setState(message.state);
    };
    chrome.runtime.onMessage.addListener(onMessage);
    send(MSG.GET_STATE).then((result) => {
      if (!alive) return;
      if (result.ok) {
        setState(result.state);
        setSettings(result.settings);
      } else {
        setLoadError(result.error || 'Cannot reach the background worker.');
      }
    });
    return () => {
      alive = false;
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  const refresh = useCallback(async () => {
    const result = await send(MSG.GET_STATE);
    if (result.ok) {
      setState(result.state);
      setSettings(result.settings);
    }
    return result;
  }, []);

  const updateSettings = useCallback(async (patch, optimistic = false) => {
    // Optimistic: paint the new value before the worker round-trips (it
    // broadcasts a state broadcast before answering, which would otherwise
    // snap a just-changed select back to the previous rule).
    if (optimistic) setSettings((prev) => ({ ...prev, ...patch }));
    const result = await send(MSG.SET_SETTINGS, { patch });
    if (result.ok) setSettings(result.settings);
    return result;
  }, []);

  const resetSettings = useCallback(async () => {
    const result = await send(MSG.RESET_SETTINGS);
    if (result.ok) setSettings(result.settings);
    return result;
  }, []);

  return { state, settings, loadError, refresh, updateSettings, resetSettings };
}