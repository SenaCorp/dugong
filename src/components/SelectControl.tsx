import type { ComponentProps } from 'react'

export function SelectControl({ children, ...props }: ComponentProps<'select'>) {
  return <span className="select-control">
    <select {...props}>{children}</select>
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />
    </svg>
  </span>
}
