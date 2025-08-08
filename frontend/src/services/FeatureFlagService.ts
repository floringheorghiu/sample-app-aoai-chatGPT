/**
 * Feature Flag Service
 * 
 * Provides a centralized service for checking feature flag status throughout the application.
 * This service ensures safe access to feature flags with proper error handling and logging.
 */

import { FEATURE_FLAGS, type FeatureFlags } from '../config/featureFlags'

export class FeatureFlagService {
  private static instance: FeatureFlagService
  private flags: FeatureFlags

  private constructor() {
    this.flags = FEATURE_FLAGS
  }

  /**
   * Get singleton instance of FeatureFlagService
   */
  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService()
    }
    return FeatureFlagService.instance
  }

  /**
   * Check if dynamic onboarding configuration is enabled
   * This is the primary method for checking the dynamic onboarding feature
   */
  public isDynamicOnboardingEnabled(): boolean {
    try {
      const isEnabled = this.flags.dynamicOnboardingConfig
      
      if (this.flags.debugFeatureFlags) {
        console.log('[FeatureFlagService] Dynamic onboarding config enabled:', isEnabled)
      }
      
      return isEnabled
    } catch (error) {
      // Always fail safe - return false if there's any error
      console.warn('[FeatureFlagService] Error checking dynamic onboarding flag, defaulting to false:', error)
      return false
    }
  }

  /**
   * Check if debug logging for feature flags is enabled
   */
  public isDebugEnabled(): boolean {
    try {
      return this.flags.debugFeatureFlags
    } catch (error) {
      // Fail safe - no debug logging if there's an error
      return false
    }
  }

  /**
   * Get all feature flags (for debugging purposes)
   * Only available when debug flag is enabled
   */
  public getAllFlags(): FeatureFlags | null {
    if (!this.isDebugEnabled()) {
      console.warn('[FeatureFlagService] getAllFlags() called but debug mode is disabled')
      return null
    }
    
    return { ...this.flags }
  }

  /**
   * Check if a specific feature flag is enabled
   * Generic method for checking any feature flag
   */
  public isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
    try {
      const isEnabled = this.flags[featureName]
      
      if (this.flags.debugFeatureFlags) {
        console.log(`[FeatureFlagService] Feature '${featureName}' enabled:`, isEnabled)
      }
      
      return isEnabled
    } catch (error) {
      // Always fail safe - return false if there's any error
      console.warn(`[FeatureFlagService] Error checking feature flag '${featureName}', defaulting to false:`, error)
      return false
    }
  }

  /**
   * Refresh feature flags from environment (useful for testing)
   * Note: This won't work in production builds where env vars are baked in
   */
  public refreshFlags(): void {
    try {
      // In a real implementation, this would reload from environment
      // For now, we'll just log that refresh was requested
      if (this.flags.debugFeatureFlags) {
        console.log('[FeatureFlagService] Flag refresh requested - current flags:', this.flags)
      }
    } catch (error) {
      console.warn('[FeatureFlagService] Error refreshing flags:', error)
    }
  }
}

/**
 * Convenience function to get the feature flag service instance
 */
export const getFeatureFlagService = (): FeatureFlagService => {
  return FeatureFlagService.getInstance()
}

/**
 * Convenience function to check if dynamic onboarding is enabled
 * This is the primary function that components should use
 */
export const isDynamicOnboardingEnabled = (): boolean => {
  return getFeatureFlagService().isDynamicOnboardingEnabled()
}

/**
 * Convenience function to check any feature flag
 */
export const isFeatureEnabled = (featureName: keyof FeatureFlags): boolean => {
  return getFeatureFlagService().isFeatureEnabled(featureName)
}