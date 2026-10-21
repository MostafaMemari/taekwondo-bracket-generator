import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'subtle' | 'ghost' | 'danger'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-mat-600 text-white hover:bg-mat-700 active:bg-mat-800',
  subtle: 'bg-surface text-ink-800 border border-line-strong hover:border-mat-600',
  ghost: 'bg-transparent text-muted hover:bg-ink-900/5 hover:text-ink-900',
  danger: 'bg-surface text-hogu-600 border border-hogu-100 hover:bg-hogu-100',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40'
  return <button className={`${base} ${variantClasses[variant]} ${className}`} {...props} />
}
