import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/redesign/ui/Select';
import { cn } from '@/lib/cn';

const EMPTY_VALUE = '__titlebar_select_empty__';

export interface TitlebarSelectOption {
  value: string;
  label: string;
}

export interface TitlebarSelectProps {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  options: TitlebarSelectOption[];
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export default function TitlebarSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Selectează...',
  allowEmpty = false,
  className,
  id,
  'aria-label': ariaLabel,
}: TitlebarSelectProps) {
  const selectValue = value ?? (allowEmpty ? EMPTY_VALUE : undefined);

  const handleChange = (next: string) => {
    onValueChange(next === EMPTY_VALUE ? null : next);
  };

  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn('titlebar-select-trigger', className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="titlebar-select-content"
        position="popper"
        sideOffset={4}
        align="start"
      >
        {allowEmpty && (
          <SelectItem value={EMPTY_VALUE} className="titlebar-select-item titlebar-select-item--placeholder">
            {placeholder}
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="titlebar-select-item">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
