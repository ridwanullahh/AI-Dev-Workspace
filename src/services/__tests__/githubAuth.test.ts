import { describe, it, expect, vi, beforeEach } from 'vitest';
import { githubAuth } from '../githubAuth';

describe('GitHubAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('initiateDeviceFlow', () => {
    it('should initiate device flow and return device code info', async () => {
      const mockResponse = {
        device_code: 'test_device_code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await githubAuth.initiateDeviceFlow();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/device/code',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should throw error if device flow initiation fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      await expect(githubAuth.initiateDeviceFlow()).rejects.toThrow();
    });
  });

  describe('pollForAccessToken', () => {
    it('should poll for token and return access token when authorized', async () => {
      const mockToken = 'gho_test_token';
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ error: 'authorization_pending' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: mockToken,
            token_type: 'bearer',
            scope: 'repo user'
          })
        });

      const result = await githubAuth.pollForAccessToken('device_code_123', 1);

      expect(result).toBe(mockToken);
    });

    it('should handle slow_down error by waiting longer', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ error: 'slow_down' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token' })
        });

      const result = await githubAuth.pollForAccessToken('device_code_123', 1);
      expect(result).toBe('test_token');
    });

    it('should throw error on authorization failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'access_denied',
          error_description: 'User denied access'
        })
      });

      await expect(
        githubAuth.pollForAccessToken('device_code_123', 1)
      ).rejects.toThrow('User denied access');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when valid token exists', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'testuser' })
      });

      vi.spyOn(githubAuth, 'getStoredToken').mockResolvedValue('valid_token');

      const result = await githubAuth.isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when no token exists', async () => {
      vi.spyOn(githubAuth, 'getStoredToken').mockResolvedValue(null);

      const result = await githubAuth.isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
