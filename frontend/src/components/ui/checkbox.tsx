import * as React from 'react';

import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn('h-4 w-4 rounded border-border text-teal-600 focus:ring-teal-500', className)}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };