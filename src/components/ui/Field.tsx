import { useMemo } from 'react';
import type { ReactElement } from 'react';

interface FieldProps {
  /** Label text */
  label: string;
  /** Helper text shown below the label */
  hint?: string;
  /** Error message */
  error?: string | null;
  /** Required field indicator */
  required?: boolean;
  /** Child input element (must have matching id or will be generated) */
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
  className?: string;
}

/**
 * Accessible field wrapper that associates labels with inputs.
 * Usage:
 *   <Field label="Username" required>
 *     <input placeholder="Enter username" />
 *   </Field>
 */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  // Generate a stable ID using useMemo
  const generatedId = useMemo(() => `field-${Math.random().toString(36).slice(2)}-${label.toLowerCase().replace(/\s+/g, '-')}`, [label]);
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;
  
  // Clone the child element to add id and aria attributes
  const child = children;
  const childId = child.props?.id ?? generatedId;
  
  const updatedChild = {
    ...child,
    props: {
      ...child.props,
      id: childId,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': hint ? `${childId}-${hintId}` : error ? errorId : undefined,
    }
  };
  
  return (
    <div className={className}>
      <label htmlFor={childId} className="block text-pm-sm font-medium text-content-primary mb-1">
        {label}
        {required && <span className="text-status-red ml-0.5">*</span>}
      </label>
      {hint && (
        <p id={`${childId}-${hintId}`} className="text-pm-2xs text-content-muted mb-1.5">
          {hint}
        </p>
      )}
      {updatedChild}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1 text-pm-2xs text-status-red">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;