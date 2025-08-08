/**
 * Feature Flag Utils Tests
 * 
 * Tests for feature flag utility functions to ensure proper functionality and safety
 */

import {
  withDynamicOnboarding,
  withDynamicOnboardingAsync,
  withFeature,
  createFeatureFlaggedFunction,
  createFeatureFlaggedAsyncFunction,
  shouldUseStaticConfiguration,
  getSafeFeatureFlag,
  logFeatureFlagStatus
} from '../featureFlagUtils'

// Mock the FeatureFlagService
jest.mock('../../services/FeatureFlagService', () => ({
  isDynamicOnboardingEnabled: jest.fn(() => false),
  isFeatureEnabled: jest.fn((featureName: string) => {
    if (featureName === 'debugFeatureFlags') return false
    return false
  })
}))

import { isDynamicOnboardingEnabled, isFeatureEnabled } from '../../services/FeatureFlagService'

const mockIsDynamicOnboardingEnabled = isDynamicOnboardingEnabled as jest.MockedFunction<typeof isDynamicOnboardingEnabled>
const mockIsFeatureEnabled = isFeatureEnabled as jest.MockedFunction<typeof isFeatureEnabled>

describe('featureFlagUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset to default disabled state
    mockIsDynamicOnboardingEnabled.mockReturnValue(false)
    mockIsFeatureEnabled.mockReturnValue(false)
  })

  describe('withDynamicOnboarding', () => {
    it('should return fallback value when feature is disabled', () => {
      const enabledFn = jest.fn(() => 'enabled-result')
      const fallbackValue = 'fallback-result'

      const result = withDynamicOnboarding(enabledFn, fallbackValue)

      expect(result).toBe('fallback-result')
      expect(enabledFn).not.toHaveBeenCalled()
    })

    it('should execute enabled function when feature is enabled', () => {
      mockIsDynamicOnboardingEnabled.mockReturnValue(true)
      
      const enabledFn = jest.fn(() => 'enabled-result')
      const fallbackValue = 'fallback-result'

      const result = withDynamicOnboarding(enabledFn, fallbackValue)

      expect(result).toBe('enabled-result')
      expect(enabledFn).toHaveBeenCalledTimes(1)
    })

    it('should return fallback value when enabled function throws error', () => {
      mockIsDynamicOnboardingEnabled.mockReturnValue(true)
      
      const enabledFn = jest.fn(() => {
        throw new Error('Test error')
      })
      const fallbackValue = 'fallback-result'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = withDynamicOnboarding(enabledFn, fallbackValue)

      expect(result).toBe('fallback-result')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FeatureFlagUtils] Error in withDynamicOnboarding'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('withDynamicOnboardingAsync', () => {
    it('should return fallback value when feature is disabled', async () => {
      const enabledFn = jest.fn(async () => 'enabled-result')
      const fallbackValue = 'fallback-result'

      const result = await withDynamicOnboardingAsync(enabledFn, fallbackValue)

      expect(result).toBe('fallback-result')
      expect(enabledFn).not.toHaveBeenCalled()
    })

    it('should execute enabled function when feature is enabled', async () => {
      mockIsDynamicOnboardingEnabled.mockReturnValue(true)
      
      const enabledFn = jest.fn(async () => 'enabled-result')
      const fallbackValue = 'fallback-result'

      const result = await withDynamicOnboardingAsync(enabledFn, fallbackValue)

      expect(result).toBe('enabled-result')
      expect(enabledFn).toHaveBeenCalledTimes(1)
    })

    it('should return fallback value when enabled function throws error', async () => {
      mockIsDynamicOnboardingEnabled.mockReturnValue(true)
      
      const enabledFn = jest.fn(async () => {
        throw new Error('Test error')
      })
      const fallbackValue = 'fallback-result'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await withDynamicOnboardingAsync(enabledFn, fallbackValue)

      expect(result).toBe('fallback-result')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FeatureFlagUtils] Error in withDynamicOnboardingAsync'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('withFeature', () => {
    it('should return fallback value when feature is disabled', () => {
      const enabledFn = jest.fn(() => 'enabled-result')
      const fallbackValue = 'fallback-result'

      const result = withFeature('dynamicOnboardingConfig', enabledFn, fallbackValue)

      expect(result).toBe('fallback-result')
      expect(enabledFn).not.toHaveBeenCalled()
    })

    it('should execute enabled function when feature is enabled', () => {
      mockIsFeatureEnabled.mockReturnValue(true)
      
      const enabledFn = jest.fn(() => 'enabled-result')
      const fallbackValue = 'fallback-result'

      const result = withFeature('dynamicOnboardingConfig', enabledFn, fallbackValue)

      expect(result).toBe('enabled-result')
      expect(enabledFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('createFeatureFlaggedFunction', () => {
    it('should create function that uses fallback when feature is disabled', () => {
      const originalFn = jest.fn((x: number) => x * 2)
      const fallbackFn = jest.fn((x: number) => x)
      
      const flaggedFn = createFeatureFlaggedFunction('dynamicOnboardingConfig', originalFn, fallbackFn)
      const result = flaggedFn(5)

      expect(result).toBe(5)
      expect(originalFn).not.toHaveBeenCalled()
      expect(fallbackFn).toHaveBeenCalledWith(5)
    })

    it('should create function that uses original when feature is enabled', () => {
      mockIsFeatureEnabled.mockReturnValue(true)
      
      const originalFn = jest.fn((x: number) => x * 2)
      const fallbackFn = jest.fn((x: number) => x)
      
      const flaggedFn = createFeatureFlaggedFunction('dynamicOnboardingConfig', originalFn, fallbackFn)
      const result = flaggedFn(5)

      expect(result).toBe(10)
      expect(originalFn).toHaveBeenCalledWith(5)
      expect(fallbackFn).not.toHaveBeenCalled()
    })
  })

  describe('createFeatureFlaggedAsyncFunction', () => {
    it('should create async function that uses fallback when feature is disabled', async () => {
      const originalFn = jest.fn(async (x: number) => x * 2)
      const fallbackFn = jest.fn(async (x: number) => x)
      
      const flaggedFn = createFeatureFlaggedAsyncFunction('dynamicOnboardingConfig', originalFn, fallbackFn)
      const result = await flaggedFn(5)

      expect(result).toBe(5)
      expect(originalFn).not.toHaveBeenCalled()
      expect(fallbackFn).toHaveBeenCalledWith(5)
    })

    it('should create async function that uses original when feature is enabled', async () => {
      mockIsFeatureEnabled.mockReturnValue(true)
      
      const originalFn = jest.fn(async (x: number) => x * 2)
      const fallbackFn = jest.fn(async (x: number) => x)
      
      const flaggedFn = createFeatureFlaggedAsyncFunction('dynamicOnboardingConfig', originalFn, fallbackFn)
      const result = await flaggedFn(5)

      expect(result).toBe(10)
      expect(originalFn).toHaveBeenCalledWith(5)
      expect(fallbackFn).not.toHaveBeenCalled()
    })
  })

  describe('shouldUseStaticConfiguration', () => {
    it('should return true when dynamic onboarding is disabled', () => {
      expect(shouldUseStaticConfiguration()).toBe(true)
    })

    it('should return false when dynamic onboarding is enabled', () => {
      mockIsDynamicOnboardingEnabled.mockReturnValue(true)
      expect(shouldUseStaticConfiguration()).toBe(false)
    })
  })

  describe('getSafeFeatureFlag', () => {
    it('should return false for disabled feature', () => {
      expect(getSafeFeatureFlag('dynamicOnboardingConfig')).toBe(false)
    })

    it('should return true for enabled feature', () => {
      mockIsFeatureEnabled.mockReturnValue(true)
      expect(getSafeFeatureFlag('dynamicOnboardingConfig')).toBe(true)
    })

    it('should return false when service throws error', () => {
      mockIsFeatureEnabled.mockImplementation(() => {
        throw new Error('Test error')
      })
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      expect(getSafeFeatureFlag('dynamicOnboardingConfig')).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[FeatureFlagUtils] Error getting feature flag 'dynamicOnboardingConfig'"),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('logFeatureFlagStatus', () => {
    it('should not log when debug is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      logFeatureFlagStatus()
      
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should log when debug is enabled', () => {
      mockIsFeatureEnabled.mockImplementation((featureName) => {
        return featureName === 'debugFeatureFlags'
      })
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      logFeatureFlagStatus()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[FeatureFlagUtils] Current feature flag status:',
        expect.objectContaining({
          dynamicOnboardingConfig: expect.any(Boolean),
          debugFeatureFlags: expect.any(Boolean)
        })
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle errors gracefully', () => {
      mockIsFeatureEnabled.mockImplementation(() => {
        throw new Error('Test error')
      })
      
      expect(() => logFeatureFlagStatus()).not.toThrow()
    })
  })
})