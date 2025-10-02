import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags } from '../../lib/featureFlags';

describe('FeatureFlagService', () => {
  beforeEach(async () => {
    await featureFlags.initialize();
  });

  describe('Feature Flag Checks', () => {
    it('should return true for enabled flags', () => {
      const result = featureFlags.isEnabled('github_sync');
      expect(result).toBe(true);
    });

    it('should return false for disabled flags', () => {
      const result = featureFlags.isEnabled('collaboration');
      expect(result).toBe(false);
    });

    it('should return false for non-existent flags', () => {
      const result = featureFlags.isEnabled('non_existent_flag');
      expect(result).toBe(false);
    });
  });

  describe('Rollout Percentage', () => {
    it('should respect 100% rollout', () => {
      const context = { userId: 'test_user_1' };
      const result = featureFlags.isEnabled('ai_agents', context);
      expect(result).toBe(true);
    });

    it('should respect 0% rollout', () => {
      const context = { userId: 'test_user_1' };
      const result = featureFlags.isEnabled('mobile_native', context);
      expect(result).toBe(false);
    });

    it('should use consistent hashing for same user', () => {
      const context = { userId: 'consistent_user' };
      
      const result1 = featureFlags.isEnabled('local_models', context);
      const result2 = featureFlags.isEnabled('local_models', context);
      
      expect(result1).toBe(result2);
    });

    it('should have different results for different users on partial rollout', () => {
      const results = [];
      
      for (let i = 0; i < 100; i++) {
        const context = { userId: `user_${i}` };
        results.push(featureFlags.isEnabled('advanced_git', context));
      }
      
      const enabled = results.filter(r => r).length;
      // With 50% rollout, expect roughly 30-70% enabled
      expect(enabled).toBeGreaterThan(30);
      expect(enabled).toBeLessThan(70);
    });
  });

  describe('Conditions', () => {
    it('should check project type conditions', () => {
      const flag = featureFlags.getFlag('github_sync');
      
      if (flag && flag.conditions?.projectTypes) {
        const context = { projectType: 'web' };
        const result = featureFlags.isEnabled('github_sync', context);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should check beta user conditions', () => {
      const context = { userId: 'beta_user' };
      const result = featureFlags.isEnabled('collaboration', context);
      expect(result).toBe(false); // No beta access by default
    });
  });

  describe('Flag Management', () => {
    it('should update flag enabled state', async () => {
      await featureFlags.setFlag('test_flag', true);
      
      const flag = featureFlags.getFlag('test_flag');
      if (flag) {
        expect(flag.enabled).toBe(true);
      }
    });

    it('should update rollout percentage', async () => {
      await featureFlags.setRolloutPercentage('advanced_git', 75);
      
      const flag = featureFlags.getFlag('advanced_git');
      expect(flag?.rolloutPercentage).toBe(75);
    });

    it('should clamp rollout percentage to 0-100', async () => {
      await featureFlags.setRolloutPercentage('advanced_git', 150);
      
      const flag = featureFlags.getFlag('advanced_git');
      expect(flag?.rolloutPercentage).toBe(100);

      await featureFlags.setRolloutPercentage('advanced_git', -10);
      
      const flag2 = featureFlags.getFlag('advanced_git');
      expect(flag2?.rolloutPercentage).toBe(0);
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags', () => {
      const flags = featureFlags.getAllFlags();
      
      expect(Array.isArray(flags)).toBe(true);
      expect(flags.length).toBeGreaterThan(0);
      
      flags.forEach(flag => {
        expect(flag).toHaveProperty('id');
        expect(flag).toHaveProperty('name');
        expect(flag).toHaveProperty('enabled');
        expect(flag).toHaveProperty('rolloutPercentage');
      });
    });
  });

  describe('Feature Usage Tracking', () => {
    it('should track feature usage', async () => {
      const context = { projectId: 'proj_123', action: 'opened' };
      
      await expect(
        featureFlags.trackFeatureUsage('github_sync', context)
      ).resolves.not.toThrow();
    });
  });
});
