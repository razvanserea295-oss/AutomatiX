import React from 'react';
import PageDrawer, { type PageDrawerSize } from '@/redesign/ui/PageDrawer';

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
      panelClassName="bg-surface-secondary shadow-[var(--elevation-3)] border-l border-line/60"
      bodyClassName="p-4"
    >
      {children}
    </PageDrawer>
  );
}
