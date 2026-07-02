








import { useState, useEffect, useRef, FormEvent } from 'react';
import Modal from '@/redesign/ui/Modal';
import { Loader2, AlertCircle } from '@/icons';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/redesign/ui/ConfirmDialog';
import Button from '@/redesign/ui/Button';
import { maskPhone, validatePhone, maskCui, validateCui, maskIban, validateIban } from '@/lib/inputMasks';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select' | 'file' | 'cui' | 'iban';
  required?: boolean;
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  
  hint?: string;
  
  






  fileFillsFields?: { path?: string; type?: string; size?: string; name?: string; data?: string; mime?: string };
  
  validate?: (value: unknown, all: Record<string, unknown>) => string | null;
  
  section?: string;
  



  min?: number | string;
  max?: number | string;
  
  step?: number | string;
  

  allowNegative?: boolean;
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  





  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
  submitLabel?: string;
  
  toastSuccess?: boolean;
}


function defaultFieldValidate(field: FormField, value: unknown): string | null {
  if (field.required) {
    const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) return 'Câmp obligatoriu';
  }
  if (field.type === 'email' && typeof value === 'string' && value !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalid';
  }
  if (field.type === 'number' && value !== '' && value != null) {
    const n = Number(value);
    if (Number.isNaN(n)) return 'Trebuie să fie un număr';
    
    
    
    const effectiveMin = field.min != null
      ? Number(field.min)
      : (field.allowNegative ? undefined : 0);
    if (effectiveMin != null && n < effectiveMin) return `Trebuie ≥ ${effectiveMin}`;
    if (field.max != null && n > Number(field.max)) return `Trebuie ≤ ${field.max}`;
  }
  if (field.type === 'tel' && typeof value === 'string')  return validatePhone(value);
  if (field.type === 'cui'  && typeof value === 'string') return validateCui(value);
  if (field.type === 'iban' && typeof value === 'string') return validateIban(value);
  return null;
}


function applyMask(field: FormField, raw: string): string {
  if (field.type === 'tel') return maskPhone(raw);
  if (field.type === 'cui') return maskCui(raw);
  if (field.type === 'iban') return maskIban(raw);
  return raw;
}


function parseFieldError(msg: string): { field: string; message: string } | null {
  try {
    const obj = JSON.parse(msg);
    if (obj && typeof obj === 'object' && typeof obj.field === 'string' && typeof obj.message === 'string') {
      return { field: obj.field, message: obj.message };
    }
  } catch {  }
  return null;
}


function shallowEqual(a: Record<string, any>, b: Record<string, any>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k]; const bv = b[k];
    
    
    const aEmpty = av === '' || av == null;
    const bEmpty = bv === '' || bv == null;
    if (aEmpty && bEmpty) continue;
    if (av !== bv) return false;
  }
  return true;
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  initialData = {},
  submitLabel = 'Salvează',
  toastSuccess = true,
}: FormModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const initialSnapshot = useRef<Record<string, any>>(initialData);

  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setFormError(null);
      setFieldErrors({});
      setTouched({});
      initialSnapshot.current = initialData;
    }
  }, [isOpen]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev }; delete next[name]; return next;
    });
  };

  const handleBlur = (field: FormField) => {
    setTouched((t) => (t[field.name] ? t : { ...t, [field.name]: true }));
    
    
    
    const value = formData[field.name];
    const isEmpty = value == null || value === '';
    if (isEmpty) return;
    const err = defaultFieldValidate(field, value) || (field.validate ? field.validate(value, formData) : null);
    if (err) setFieldErrors((prev) => ({ ...prev, [field.name]: err }));
  };

  function runClientValidation(): Record<string, string> {
    const errs: Record<string, string> = {};
    for (const field of fields) {
      const value = formData[field.name];
      const builtIn = defaultFieldValidate(field, value);
      if (builtIn) { errs[field.name] = builtIn; continue; }
      if (field.validate) {
        const custom = field.validate(value, formData);
        if (custom) errs[field.name] = custom;
      }
    }
    return errs;
  }

  const isDirty = !shallowEqual(formData, initialSnapshot.current);

  const handleClose = async () => {
    if (loading) return;
    if (isDirty) {
      const ok = await confirmDialog({
        title: 'Modificări nesalvate',
        body: 'Ai schimbări nesalvate în acest formular. Ești sigur că vrei să închizi?',
        confirmLabel: 'Închide fără să salvez',
        cancelLabel: 'Continuă editarea',
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const clientErrs = runClientValidation();
    if (Object.keys(clientErrs).length > 0) {
      setFieldErrors(clientErrs);
      
      setTouched((t) => ({ ...t, ...Object.fromEntries(Object.keys(clientErrs).map(k => [k, true])) }));
      
      const first = fields.find(f => clientErrs[f.name]);
      if (first) document.getElementById(first.name)?.focus();
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await onSubmit(formData);
      if (toastSuccess) toast.success('Salvat cu succes');
      
      initialSnapshot.current = formData;
      onClose();
      setFormData({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare la salvare';
      const fieldErr = parseFieldError(msg);
      if (fieldErr && fields.some(f => f.name === fieldErr.field)) {
        setFieldErrors({ [fieldErr.field]: fieldErr.message });
        document.getElementById(fieldErr.field)?.focus();
      } else {
        
        setFormError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  
  
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {fields.map((field, idx) => {
          const fieldError = fieldErrors[field.name];
          const showError = !!fieldError && (touched[field.name] || false);
          const inputClass = `w-full h-10 px-3 bg-surface-primary border ${
            showError ? 'border-status-red' : 'border-line hover:border-line/80'
          } rounded-xl text-pm-sm text-content-primary placeholder:text-content-muted/70 transition-smooth duration-150 focus-visible:outline-none focus:outline-none ${
            showError
              ? 'focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--status-red)_30%,transparent)] focus:border-status-red'
              : 'focus-visible:shadow-[var(--ring-soft)] focus:border-accent'
          }`;
          
          const prev = idx > 0 ? fields[idx - 1] : undefined;
          const showSection = field.section && field.section !== prev?.section;
          
          const htmlType =
            field.type === 'cui' || field.type === 'iban' ? 'text'
            : field.type === 'tel' ? 'tel'
            : field.type;
          return (
            <div key={field.name}>
              {showSection && (
                <h3 className="text-pm-eyebrow text-content-muted mt-2 mb-2 pt-3 border-t border-line/70 first:border-t-0 first:pt-0 first:mt-0">
                  {field.section}
                </h3>
              )}
              <label htmlFor={field.name} className="block text-pm-xs font-semibold uppercase tracking-wider text-content-secondary mb-2">
                {field.label}
                {field.required && <span className="text-status-red ml-0.5" aria-label="obligatoriu">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  onBlur={() => handleBlur(field)}
                  aria-invalid={showError}
                  aria-describedby={showError ? `${field.name}-error` : field.hint ? `${field.name}-hint` : undefined}
                  placeholder={field.placeholder}
                  rows={4}
                  className={`${inputClass} h-auto py-2 leading-relaxed`}
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  onBlur={() => handleBlur(field)}
                  aria-invalid={showError}
                  aria-describedby={showError ? `${field.name}-error` : field.hint ? `${field.name}-hint` : undefined}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">Selectează...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'file' ? (
                <div>
                  <input
                    id={field.name}
                    name={field.name}
                    type="file"
                    aria-invalid={showError}
                    aria-describedby={showError ? `${field.name}-error` : field.hint ? `${field.name}-hint` : undefined}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const fill = field.fileFillsFields ?? {};
                      
                      
                      
                      
                      
                      handleChange(field.name, f.name);
                      if (fill.path && fill.path !== field.name) {
                        handleChange(fill.path, f.name);
                      }
                      if (fill.type) {
                        const ext = f.name.split('.').pop()?.toLowerCase() || '';
                        handleChange(fill.type, ext);
                      }
                      if (fill.size) handleChange(fill.size, f.size);
                      if (fill.name) handleChange(fill.name, f.name);
                      if (fill.mime) handleChange(fill.mime, f.type || 'application/octet-stream');
                      
                      
                      
                      
                      
                      if (fill.data) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            handleChange(fill.data!, reader.result);
                          }
                        };
                        reader.readAsDataURL(f);
                      }
                    }}
                    className="w-full text-pm-xs text-content-secondary file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-accent-muted file:text-accent file:font-semibold file:cursor-pointer hover:file:bg-accent hover:file:text-[var(--color-on-accent)] file:transition-colors file:duration-150"
                  />
                </div>
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={htmlType}
                  value={formData[field.name] ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (field.type === 'number') {
                      handleChange(field.name, raw === '' ? '' : Number(raw));
                    } else if (field.type === 'tel' || field.type === 'cui' || field.type === 'iban') {
                      handleChange(field.name, applyMask(field, raw));
                    } else {
                      handleChange(field.name, raw);
                    }
                  }}
                  onBlur={() => handleBlur(field)}
                  aria-invalid={showError}
                  aria-describedby={showError ? `${field.name}-error` : field.hint ? `${field.name}-hint` : undefined}
                  placeholder={field.placeholder}
                  min={field.type === 'number' || field.type === 'date'
                    ? (field.min ?? (field.type === 'number' && !field.allowNegative ? 0 : undefined))
                    : undefined}
                  max={field.type === 'number' || field.type === 'date' ? field.max : undefined}
                  step={field.type === 'number' ? field.step : undefined}
                  inputMode={field.type === 'cui' ? 'text' : field.type === 'iban' ? 'text' : undefined}
                  autoComplete={field.type === 'iban' ? 'off' : undefined}
                  className={inputClass}
                />
              )}

              {showError && (
                <p id={`${field.name}-error`} className="anim-fade-slide-in mt-2 flex items-center gap-1 text-pm-xs text-status-red">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden /> {fieldError}
                </p>
              )}
              {!showError && field.hint && (
                <p id={`${field.name}-hint`} className="mt-2 text-pm-2xs text-content-muted">{field.hint}</p>
              )}
            </div>
          );
        })}

        {formError && (
          <div className="anim-fade-slide-in flex items-start gap-2 p-4 bg-status-red/10 border border-status-red/30 rounded-xl" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-red" aria-hidden />
            <p className="text-pm-sm text-status-red font-medium leading-relaxed">{formError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            block
            onClick={handleClose}
            disabled={loading}
          >
            Anulează
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={loading}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
