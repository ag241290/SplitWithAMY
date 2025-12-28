import React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  labelClassName?: string
}

export const Input: React.FC<Props> = ({ label, hint, className = '', labelClassName = '', ...rest }) => (
  <label className="block space-y-1">
    {label && (
      <span className={`text-sm text-gray-700 dark:text-gray-300 ${labelClassName}`}>{label}</span>
    )}
    <input
      {...rest}
      className={`w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${className}`}
    />
    {hint && <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
  </label>
)
