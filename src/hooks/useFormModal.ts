import { useState } from 'react';

export function useFormModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const openModal = (item?: any) => {
    setEditingItem(item || null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingItem(null);
  };

  return {
    isOpen,
    editingItem,
    openModal,
    closeModal,
    isEditing: !!editingItem,
  };
}
