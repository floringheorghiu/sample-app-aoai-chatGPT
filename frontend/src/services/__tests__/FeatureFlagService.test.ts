/**
 * Feature Flag Service Tests
 * 
 * Tests for the FeatureFlagService to ensure proper functionality and safety
 */

import { FeatureFlagService, getFeatureFlagService, isDynamicOnboardingEnabled, isFeatureEnabled } from '../FeatureFlagService'

// Mock the feature flags config
jest.mock('../../config/featureFlags', () => ({
  FEATURE_FLAGS: {
    dynamicOnboardingConfig: false,
    debugFeatureFlags: false
  }
}))

describe('FeatureFlagService', () => {
  let service: FeatureFlagService

  beforeEach(() => {
    // Reset singleton instance for each test
    ;(FeatureFlagService as any).instance = undefined
    service = FeatureFlagService.getInstance()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = FeatureFlagService.getInstance()
      const instance2 = FeatureFlagService.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should return the same instance from convenience function', () => {
      const instance1 = FeatureFlagService.getInstance()
      const instance2 = getFeatureFlagService()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('isDynamicOnboardingEnabled', () => {
    it('should return false by default', () => {
      expect(service.isDynamicOnboardingEnabled()).toBe(false)
    })

    it('should return false from convenience function by default', () => {
      expect(isDynamicOnboardingEnabled()).toBe(false)
    })

    it('should handle errors gracefully and return false', () => {
      // Mock the flags property to throw an error
      jest.spyOn(service as any, 'flags', 'get').mockImplementation(() => {
        throw new Error('Test error')
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      expect(service.isDynamicOnboardingEnabled()).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FeatureFlagService] Error checking dynamic onboarding flag'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('isDebugEnabled', () => {
    it('should return false by default', () => {
      expect(service.isDebugEnabled()).toBe(false)
    })

    it('should handle errors gracefully and return false', () => {
      // Mock the flags property to throw an error
      jest.spyOn(service as any, 'flags', 'get').mockImplementation(() => {
        throw new Error('Test error')
      })
      
      expect(service.isDebugEnabled()).toBe(false)
    })
  })

  describe('isFeatureEnabled', () => {
    it('should return false for dynamicOnboardingConfig by default', () => {
      expect(service.isFeatureEnabled('dynamicOnboardingConfig')).toBe(false)
    })

    it('should return false for debugFeatureFlags by default', () => {
      expect(service.isFeatureEnabled('debugFeatureFlags')).toBe(false)
    })

    it('should work with convenience function', () => {
      expect(isFeatureEnabled('dynamicOnboardingConfig')).toBe(false)
      expect(isFeatureEnabled('debugFeatureFlags')).toBe(false)
    })

    it('should handle errors gracefully and return false', () => {
      // Mock the flags property to throw an error
      jest.spyOn(service as any, 'flags', 'get').mockImplementation(() => {
        throw new Error('Test error')
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      expect(service.isFeatureEnabled('dynamicOnboardingConfig')).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[FeatureFlagService] Error checking feature flag 'dynamicOnboardingConfig'"),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('getAllFlags', () => {
    it('should return null when debug is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      expect(service.getAllFlags()).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        '[FeatureFlagService] getAllFlags() called but debug mode is disabled'
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('refreshFlags', () => {
    it('should not throw errors when called', () => {
      expect(() => service.refreshFlags()).not.toThrow()
    })

    it('should handle errors gracefully', () => {
      // Mock console.log to throw an error
      const originalLog = console.log
      console.log = jest.fn().mockImplementation(() => {
        throw new Error('Test error')
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      expect(() => service.refreshFlags()).not.toThrow()
      
      console.log = originalLog
      consoleSpy.mockRestore()
    })
  })
})

describe('Feature Flag Service with Enabled Flags', () => {
  beforeEach(() => {
    // Mock enabled flags
    jest.doMock('../../config/featureFlags', () => ({
      FEATURE_FLAGS: {
        dynamicOnboardingConfig: true,
        debugFeatureFlags: true
      }
    }))
  })

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('should return enabled flags when mocked as enabled', async () => {
    // Re-import the service with mocked flags
    const { FeatureFlagService: EnabledService } = await import('../FeatureFlagService')
    const enabledServiceInstance = EnabledService.getInstance()
    
    expect(enabledServiceInstance.isDynamicOnboardingEnabled()).toBe(true)
    expect(enabledServiceInstance.isDebugEnabled()).toBe(true)
  })
})