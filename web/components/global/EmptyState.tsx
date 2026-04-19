import { cn } from '@/lib/utils';

function EmptyState({
  heading = 'No items found.',
  className,
}: {
  heading?: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn('mt-2 text-xl text-muted-foreground', className)}>
      {heading}
    </h2>
  );
}

export default EmptyState;
