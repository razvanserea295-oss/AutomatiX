import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'primary';
  icon?: ReactNode;
}






export default function ConfirmInline({ label, confirmLabel = 'Confirmă', onConfirm, variant = 'danger', icon }: Props) {
  const [armed, setArmed] = useState(false);

  const arm = () => {
    setArmed(true);
    setTimeout(() => setArmed(false), 3000);
  };

  if (armed) {
    return (
      <Button variant={variant} size="sm" onClick={() => { setArmed(false); onConfirm(); }}>
        {icon}{confirmLabel}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={arm}>
      {icon}{label}
    </Button>
  );
}
