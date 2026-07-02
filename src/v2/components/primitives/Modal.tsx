import React from 'react';
import PageDrawer, { type PageDrawerSize } from '@/v2/components/primitives/PageDrawer';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <PageDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size as PageDrawerSize}
      panelClassName="surface-glass-strong rounded-l-2xl border-line/60 shadow-[var(--elevation-4)]"
      bodyClassName="p-5"
    >
      {children}
    </PageDrawer>
  );
}
