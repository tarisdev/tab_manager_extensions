import { KEEP_RULES } from '@/constants/index.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { SelectField } from '@/dashboard/components/SelectField.jsx';

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CheckboxField({ checked, label, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" className="size-3.5 flex-none accent-primary" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

/** Edits a local `draft`; nothing reaches the worker until Save. */
export function SettingsDialog({ open, draft, onChange, onSave, onReset, onClose }) {
  if (!draft) return null;
  const rules = [
    { value: KEEP_RULES.ACTIVE, label: t('settings.keepActive') },
    { value: KEEP_RULES.NEWEST, label: t('settings.keepNewest') },
    { value: KEEP_RULES.OLDEST, label: t('settings.keepOldest') }
  ];
  const themes = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') }
  ];
  const locales = [
    { value: 'auto', label: t('settings.langAuto') },
    { value: 'en', label: t('settings.langEn') },
    { value: 'vi', label: t('settings.langVi') }
  ];
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="w-[min(460px,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3 px-3 pb-3" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <Field label={t('settings.duplicateHandling')}>
            <SelectField
              value={draft.duplicateRule}
              onChange={(value) => onChange({ duplicateRule: value })}
              options={rules}
              label={t('settings.duplicateHandling')}
            />
          </Field>
          <Field label={t('settings.theme')}>
            <SelectField
              value={draft.theme}
              onChange={(value) => onChange({ theme: value })}
              options={themes}
              label={t('settings.theme')}
            />
          </Field>
          <Field label={t('settings.language')}>
            <SelectField
              value={draft.locale}
              onChange={(value) => onChange({ locale: value })}
              options={locales}
              label={t('settings.language')}
            />
          </Field>
          <CheckboxField
            checked={draft.ignoreGoogleTabId}
            label={t('settings.ignoreTabId')}
            onChange={(event) => onChange({ ignoreGoogleTabId: event.target.checked })}
          />
          <CheckboxField
            checked={draft.sameOriginDuplicates}
            label={t('settings.sameOrigin')}
            onChange={(event) => onChange({ sameOriginDuplicates: event.target.checked })}
          />
          <CheckboxField
            checked={draft.warningEnabled}
            label={t('settings.warning')}
            onChange={(event) => onChange({ warningEnabled: event.target.checked })}
          />
          <CheckboxField
            checked={draft.autoCloseDuplicates}
            label={t('settings.autoclose')}
            onChange={(event) => onChange({ autoCloseDuplicates: event.target.checked })}
          />
          <p className="text-[11px] text-muted-foreground">{t('settings.hint')}</p>
          <DialogFooter className="p-0 pt-1">
            <Button variant="danger" type="button" onClick={onReset}>{t('settings.reset')}</Button>
            <Button type="submit">{t('settings.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
