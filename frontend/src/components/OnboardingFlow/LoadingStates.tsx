import React from 'react'
import { Persona } from '../../types/persona'
import styles from './LoadingStates.module.css'

interface SkeletonCardProps {
  persona?: Persona
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ persona }) => {
  return (
    <div className={`${styles.skeletonCard} ${persona ? styles[persona] : ''}`}>
      <div className={styles.skeletonRadio}></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonText}></div>
      </div>
    </div>
  )
}

interface LoadingSpinnerProps {
  persona?: Persona
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  persona, 
  size = 'medium',
  className = '' 
}) => {
  const getSpinnerColor = (persona?: Persona): string => {
    switch (persona) {
      case 'elev':
        return '#D0337D'
      case 'părinte':
        return '#ff4773'
      case 'profesor':
        return '#9a6ae1'
      default:
        return '#e91e63'
    }
  }

  return (
    <div 
      className={`${styles.spinner} ${styles[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div 
        className={styles.spinnerCircle}
        style={{ borderTopColor: getSpinnerColor(persona) }}
      ></div>
      <span className={styles.srOnly}>Loading...</span>
    </div>
  )
}

interface LoadingOverlayProps {
  isVisible: boolean
  persona?: Persona
  message?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  persona,
  message = 'Loading...' 
}) => {
  if (!isVisible) return null

  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loadingContent}>
        <LoadingSpinner persona={persona} size="large" />
        <p className={styles.loadingMessage}>{message}</p>
      </div>
    </div>
  )
}

interface SkeletonGridProps {
  persona?: Persona
  count?: number
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ persona, count = 4 }) => {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} persona={persona} />
      ))}
    </div>
  )
}