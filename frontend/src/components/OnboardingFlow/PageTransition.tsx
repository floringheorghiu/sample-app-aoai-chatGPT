import React from 'react'
import styles from './PageTransition.module.css'

interface PageTransitionProps {
  children: React.ReactNode
  transitionKey: string
  direction?: 'forward' | 'backward'
  className?: string
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  transitionKey,
  className = ''
}) => {
  return (
    <div 
      className={`${styles.pageTransition} ${styles.visible} ${className}`}
      key={transitionKey}
    >
      {children}
    </div>
  )
}