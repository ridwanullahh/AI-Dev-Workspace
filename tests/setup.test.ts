import { describe, it, expect, beforeEach } from 'vitest';
import { oauthService } from '../src/services/oauth';
import { securityVault } from '../src/services/securityVault';
import { enhancedAIProvider } from '../src/services/enhancedAIProvider';
import { performanceMonitoring } from '../src/services/performanceMonitoring';

// Mock IndexedDB for tests
global.indexedDB = require('fake-indexeddb');
global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

describe('Core Services Integration', () => {
  beforeEach(async () => {
    // Reset services before each test
    securityVault.lockVault();
  });

  describe('Security Vault', () => {
    it('should unlock with correct passphrase', async () => {
      const result = await securityVault.unlockVault('test-passphrase-123');
      expect(result).toBe(true);
      expect(securityVault.isLocked()).toBe(false);
    });

    it('should store and retrieve secrets', async () => {
      await securityVault.unlockVault('test-passphrase-123');
      
      const secretId = await securityVault.storeSecret(
        'test-api-key',
        'sk-test-123456',
        'api_key'
      );
      
      expect(secretId).toBeDefined();
      
      const retrievedSecret = await securityVault.getSecret(secretId);
      expect(retrievedSecret).toBe('sk-test-123456');
    });

    it('should auto-lock after timeout', async () => {
      await securityVault.unlockVault('test-passphrase-123');
      securityVault.setAutoLockTimeout(0.01); // 0.6 seconds
      
      // Wait for auto-lock
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(securityVault.isLocked()).toBe(true);
    });
  });

  describe('OAuth Service', () => {
    it('should generate valid authorization URL', () => {
      const url = oauthService.createAuthorizationUrl('gemini');
      expect(url).toContain('accounts.google.com');
      expect(url).toContain('client_id');
      expect(url).toContain('scope');
    });

    it('should handle OAuth state validation', async () => {
      const state = 'test-state-123';
      sessionStorage.setItem('oauth_state', state);
      
      try {
        await oauthService.handleOAuthCallback('test-code', 'wrong-state');
        expect.fail('Should have thrown error for invalid state');
      } catch (error) {
        expect(error.message).toContain('Invalid OAuth state');
      }
    });
  });

  describe('Enhanced AI Provider', () => {
    it('should handle rate limiting', async () => {
      // Mock rate limit exceeded scenario
      const start = Date.now();
      
      try {
        // This should throw due to no available accounts
        await enhancedAIProvider.sendMessage({
          messages: [{ role: 'user', content: 'test' }],
          model: 'gemini-pro'
        });
        expect.fail('Should have thrown error for no accounts');
      } catch (error) {
        expect(error.message).toContain('No available accounts');
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should fail fast
    });

    it('should calculate costs correctly', async () => {
      const service = enhancedAIProvider as any;
      const cost = service.calculateCost('gemini-pro', 1000);
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });
  });

  describe('Performance Monitoring', () => {
    it('should initialize without errors', async () => {
      await expect(performanceMonitoring.initialize()).resolves.not.toThrow();
    });

    it('should record AI metrics', async () => {
      await performanceMonitoring.recordAIMetrics('gemini', 'gemini-pro', {
        responseTime: 1500,
        tokens: 150,
        cost: 0.001,
        success: true
      });
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should check performance budgets', async () => {
      const budgetCheck = await performanceMonitoring.checkPerformanceBudget();
      expect(budgetCheck).toHaveProperty('passed');
      expect(budgetCheck).toHaveProperty('violations');
      expect(Array.isArray(budgetCheck.violations)).toBe(true);
    });
  });
});

describe('Integration Scenarios', () => {
  it('should complete full setup flow', async () => {
    // 1. Initialize security
    const unlocked = await securityVault.unlockVault('integration-test-pass');
    expect(unlocked).toBe(true);
    
    // 2. Store API key
    const keyId = await securityVault.storeSecret(
      'gemini-key',
      'test-api-key',
      'api_key'
    );
    expect(keyId).toBeDefined();
    
    // 3. Initialize performance monitoring
    await performanceMonitoring.initialize();
    
    // 4. Verify setup is complete
    const metrics = await performanceMonitoring.checkPerformanceBudget();
    expect(metrics.passed).toBeDefined();
  });

  it('should handle offline scenarios', async () => {
    // Mock offline condition
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    
    // Services should still work offline
    await securityVault.unlockVault('offline-test');
    expect(securityVault.isLocked()).toBe(false);
    
    // Restore online state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });
});