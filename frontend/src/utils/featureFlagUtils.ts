/**
 * Feature Flag Utilities
 * 
 * Utility functions for safely working with feature flags throughout the application.
 * These utilities provide additional safety layers and convenience methods.
 */

import { isDynamicOnboardingEnabled, isFeatureEnabled } from '../services/FeatureFlagService'
import type { FeatureFlags } from '../config/featureFlags'

/**
 * Safely execute a function only if dynamic onboarding is enabled
 * If the feature is disabled, returns the fallback value
 * 
 * @param enabledFn - Function to execute when feature is enabled
 * @param fallbackValue - Value to return when feature is disabled
 * @returns Result of enabledFn or fallbackValue
 */
export function withDynamicOnboarding<T>(
  enabledFn: () => T,
  fallbackValue: T
): T {
  try {
    if (isDynamicOnboardingEnabled()) {
      return enabledFn()
    }
    return fallbackValue
  } catch (error) {
    console.warn('[FeatureFlagUtils] Error in withDynamicOnboarding, using fallback:', error)
    return fallbackValue
  }
}

/**
 * Safely execute an async function only if dynamic onboarding is enabled
 * If the feature is disabled, returns the fallback value
 * 
 * @param enabledFn - Async function to execute when feature is enabled
 * @param fallbackValue - Value to return when feature is disabled
 * @returns Promise resolving to result of enabledFn or fallbackValue
 */
export async function withDynamicOnboardingAsync<T>(
  enabledFn: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    if (isDynamicOnboardingEnabled()) {
      return await enabledFn()
    }
    return fallbackValue
  } catch (error) {
    console.warn('[FeatureFlagUtils] Error in withDynamicOnboardingAsync, using fallback:', error)
    return fallbackValue
  }
}

/**
 * Safely execute a function only if a specific feature is enabled
 * Generic version of withDynamicOnboarding for any feature flag
 * 
 * @param featureName - Name of the feature flag to check
 * @param enabledFn - Function to execute when feature is enabled
 * @param fallbackValue - Value to return when feature is disabled
 * @returns Result of enabledFn or fallbackValue
 */
export function withFeature<T>(
  featureName: keyof FeatureFlags,
  enabledFn: () => T,
  fallbackValue: T
): T {
  try {
    if (isFeatureEnabled(featureName)) {
      return enabledFn()
    }
    return fallbackValue
  } catch (error) {
    console.warn(`[FeatureFlagUtils] Error in withFeature('${featureName}'), using fallback:`, error)
    return fallbackValue
  }
}

/**
 * Create a feature-flagged version of a function
 * Returns a new function that only executes the original if the feature is enabled
 * 
 * @param featureName - Name of the feature flag to check
 * @param originalFn - Original function to wrap
 * @param fallbackFn - Function to call when feature is disabled
 * @returns Feature-flagged function
 */
export function createFeatureFlaggedFunction<TArgs extends any[], TReturn>(
  featureName: keyof FeatureFlags,
  originalFn: (...args: TArgs) => TReturn,
  fallbackFn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  return (...args: TArgs): TReturn => {
    try {
      if (isFeatureEnabled(featureName)) {
        return originalFn(...args)
      }
      return fallbackFn(...args)
    } catch (error) {
      console.warn(`[FeatureFlagUtils] Error in feature-flagged function ('${featureName}'), using fallback:`, error)
      return fallbackFn(...args)
    }
  }
}

/**
 * Create a feature-flagged version of an async function
 * Returns a new function that only executes the original if the feature is enabled
 * 
 * @param featureName - Name of the feature flag to check
 * @param originalFn - Original async function to wrap
 * @param fallbackFn - Async function to call when feature is disabled
 * @returns Feature-flagged async function
 */
export function createFeatureFlaggedAsyncFunction<TArgs extends any[], TReturn>(
  featureName: keyof FeatureFlags,
  originalFn: (...args: TArgs) => Promise<TReturn>,
  fallbackFn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      if (isFeatureEnabled(featureName)) {
        return await originalFn(...args)
      }
      return await fallbackFn(...args)
    } catch (error) {
      console.warn(`[FeatureFlagUtils] Error in feature-flagged async function ('${featureName}'), using fallback:`, error)
      return await fallbackFn(...args)
    }
  }
}

/**
 * Check if we should use static configuration (opposite of dynamic)
 * Convenience function for components that need to know when to use static config
 */
export function shouldUseStaticConfiguration(): boolean {
  return !isDynamicOnboardingEnabled()
}

/**
 * Get a safe boolean value for any feature flag
 * Always returns false if there's any error or if the flag doesn't exist
 * 
 * @param featureName - Name of the feature flag to check
 * @returns Boolean value of the feature flag, or false if error/not found
 */
export function getSafeFeatureFlag(featureName: keyof FeatureFlags): boolean {
  try {
    return isFeatureEnabled(featureName)
  } catch (error) {
    console.warn(`[FeatureFlagUtils] Error getting feature flag '${featureName}', defaulting to false:`, error)
    return false
  }
}

/**
 * Development helper to log current feature flag status
 * Only works when debug feature flag is enabled
 */
export function logFeatureFlagStatus(): void {
  try {
    if (isFeatureEnabled('debugFeatureFlags')) {
      console.log('[FeatureFlagUtils] Current feature flag status:', {
        dynamicOnboardingConfig: isDynamicOnboardingEnabled(),
        debugFeatureFlags: isFeatureEnabled('debugFeatureFlags')
      })
    }
  } catch (error) {
    // Silently fail for logging function
  }
}