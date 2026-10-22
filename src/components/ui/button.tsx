import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const styles = cva('inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', {
  variants: {
    variant: { default: 'bg-brand text-white hover:bg-[#91001A]', outline: 'border border-slate-300 bg-white text-ink hover:bg-slate-50', ghost: 'text-ink hover:bg-slate-100' },
    size: { default: 'h-10 px-4 py-2', sm: 'h-9 px-3', icon: 'h-10 w-10' },
  }, defaultVariants: { variant: 'default', size: 'default' },
})
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles> & { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, Props>(({ className, variant, size, asChild, ...props }, ref) => {
  const Component = asChild ? Slot : 'button'
  return <Component ref={ref} className={twMerge(clsx(styles({ variant, size }), className))} {...props} />
})
Button.displayName = 'Button'
