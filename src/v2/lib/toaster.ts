/** Shared Sonner config — aligned with design-system toast motion */
import type { ToasterProps } from 'sonner';

export const V2_TOASTER_PROPS: ToasterProps = {
  position: 'bottom-right',
  offset: 16,
  gap: 8,
  richColors: false,
  closeButton: true,
  toastOptions: {
    classNames: {
      toast: 'ds-toast',
      title: 'text-ds-sm font-semibold',
      description: 'text-ds-sm text-ds-secondary',
    },
  },
};
