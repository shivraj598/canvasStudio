import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            '!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-xl',
          description: '!text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
