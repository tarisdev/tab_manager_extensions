import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select.jsx';

/** Select + trigger label come from the same option list, so they can never drift. */
export function SelectField({ value, onChange, options, label, className }) {
  const current = options.find((option) => option.value === value) ?? options[0];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={className}>
        <span className="truncate">{current.label}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
