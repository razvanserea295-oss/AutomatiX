import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@/icons';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn('ds-dialog-overlay', className)} {...props} />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizeClass: Record<DialogSize, string> = {
  sm: 'ds-dialog-content--sm',
  md: 'ds-dialog-content--md',
  lg: 'ds-dialog-content--lg',
  xl: 'ds-dialog-content--xl',
  full: 'ds-dialog-content--full',
};

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: DialogSize;
  showClose?: boolean;
}

const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, size = 'md', showClose = true, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn('ds-dialog-content', sizeClass[size], className)}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-ds-muted transition-opacity hover:text-ds-primary focus-visible:outline-none focus-visible:shadow-[var(--ring-default)]"
            aria-label="Închide"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('density-dialog-header flex flex-col gap-1 border-b border-line-subtle', className)}
    {...props}
  />
);

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-ds-md font-semibold text-ds-primary', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-ds-sm text-ds-secondary', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

const DialogBody = ({ className, stagger = true, ...props }: HTMLAttributes<HTMLDivElement> & { stagger?: boolean }) => (
  <div
    className={cn(
      'ds-dialog-body density-dialog-body',
      stagger && 'ds-dialog-stagger space-y-[var(--density-field-gap)]',
      className,
    )}
    {...props}
  />
);

const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'density-dialog-footer flex flex-col-reverse gap-2 border-t border-line-subtle sm:flex-row sm:justify-end',
      className,
    )}
    {...props}
  />
);

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
};

export default Dialog;
