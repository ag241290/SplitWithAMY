import React from 'react'

export const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`rounded-lg bg-white dark:bg-gray-900 shadow-soft ${className}`}>
    {children}
  </div>
)

export const CardHeader: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>
)

export const CardBody: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`px-4 py-4 ${className}`}>{children}</div>
)
