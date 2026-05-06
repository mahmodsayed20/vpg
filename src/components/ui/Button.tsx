import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm' ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3.5 py-2',
        variant === 'primary'   && 'bg-accent hover:bg-accent-hover text-white',
        variant === 'secondary' && 'bg-bg-card hover:bg-bg-border text-text-secondary hover:text-text-primary border border-bg-border',
        variant === 'ghost'     && 'hover:bg-bg-card text-text-muted hover:text-text-primary',
        variant === 'danger'    && 'hover:bg-red-950/40 text-text-muted hover:text-red-400',
        className
      )}
    >
      {children}
    </button>
  )
}
