import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-2xl bg-gradient-to-r from-teal-50 via-white to-teal-50 bg-[length:200%_100%]', className)} {...props} />;
}

export { Skeleton };