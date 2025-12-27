import React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }

export const Input: React.FC<Props> = ({ label, hint, className = '', ...rest }) => (
  <label className="block space-y-1">
    {label && <span className="text-sm text-gray-700">{label}</span>}
    <input
      {...rest}
      className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${className}`}
    />
    {hint && <span className="text-xs text-gray-500">{hint}</span>}
  </label>
)
