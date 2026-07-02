import React from 'react';
import PageDrawer, { type PageDrawerSize } from '@/redesign/ui/PageDrawer';

interface CenteredDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** If true, clicking the backdrop closes the dialog */
  closeOnBackdrop?: boolean;
  /** Custom header content (replaces title bar) */
  header?: React.ReactNode;
  /** Custom footer content */
  footer?: React.ReactNode;
  /** Show default close button (only if no custom header) */
  showCloseButton?: boolean;
}

export default function CenteredDialog({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  header,
  footer,
  showCloseButton = true,
}: CenteredDialogProps) {
  return (
    <PageDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size as PageDrawerSize}
      closeOnBackdrop={closeOnBackdrop}
      header={header}
      footer={footer}
      showCloseButton={showCloseButton}
      panelClassName="bg-surface-elevated shadow-[var(--elevation-4)]"
    >
      {children}
    </PageDrawer>
  );
}
