import CryptoJS from 'crypto-js';
import { db, encryptionService } from '../database/schema';

export interface SecretEntry {
  id: string;
  name: string;
  category: 'api_key' | 'token' | 'password' | 'certificate' | 'other';
  encryptedValue: string;
  metadata: {
    description?: string;
    expiresAt?: Date;
    lastAccessed?: Date;
    accessCount: number;
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultSession {
  isLocked: boolean;
  sessionId: string;
  lastActivity: Date;
  autoLockTimeout: number; // minutes
}

export class SecurityVaultService {
  private session: VaultSession | null = null;
  private autoLockTimer: NodeJS.Timeout | null = null;
  private sessionKey: string | null = null;

  constructor() {
    this.initializeSession();
  }

  private initializeSession(): void {
    this.session = {
      isLocked: true,
      sessionId: this.generateSessionId(),
      lastActivity: new Date(),
      autoLockTimeout: 15 // 15 minutes default
    };
  }

  // Authentication and session management
  async unlockVault(passphrase: string): Promise<boolean> {
    try {
      // Initialize encryption with the passphrase
      await encryptionService.initializeEncryption(passphrase);
      
      // Test decryption with a known value
      const testEncrypted = await this.getTestValue();
      if (testEncrypted) {
        try {
          encryptionService.decrypt(testEncrypted);
        } catch {
          return false; // Wrong passphrase
        }
      } else {
        // First time setup - create test value
        await this.createTestValue();
      }

      this.session!.isLocked = false;
      this.session!.lastActivity = new Date();
      this.sessionKey = this.deriveSessionKey(passphrase);
      
      this.startAutoLockTimer();
      return true;
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      return false;
    }
  }

  lockVault(): void {
    if (this.session) {
      this.session.isLocked = true;
      this.session.lastActivity = new Date();
    }
    
    this.sessionKey = null;
    encryptionService.lockVault();
    this.clearAutoLockTimer();
    
    // Clear sensitive data from memory
    this.secureClearMemory();
  }

  isLocked(): boolean {
    return this.session?.isLocked !== false;
  }

  // Secret management
  async storeSecret(
    name: string, 
    value: string, 
    category: SecretEntry['category'],
    metadata: Partial<SecretEntry['metadata']> = {}
  ): Promise<string> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    const secretId = `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entry: SecretEntry = {
      id: secretId,
      name,
      category,
      encryptedValue: encryptionService.encrypt(value),
      metadata: {
        description: metadata.description,
        expiresAt: metadata.expiresAt,
        lastAccessed: new Date(),
        accessCount: 0,
        tags: metadata.tags || [],
        ...metadata
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.settings.put({
      id: `vault_secret_${secretId}`,
      category: 'vault',
      key: name,
      value: entry,
      encrypted: true,
      updatedAt: new Date()
    });

    this.updateActivity();
    return secretId;
  }

  async getSecret(secretId: string): Promise<string> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    const setting = await db.settings.get(`vault_secret_${secretId}`);
    if (!setting) {
      throw new Error('Secret not found');
    }

    const entry = setting.value as SecretEntry;
    
    // Check expiration
    if (entry.metadata.expiresAt && new Date() > entry.metadata.expiresAt) {
      throw new Error('Secret has expired');
    }

    // Update access tracking
    entry.metadata.lastAccessed = new Date();
    entry.metadata.accessCount++;
    entry.updatedAt = new Date();

    await db.settings.update(`vault_secret_${secretId}`, {
      value: entry,
      updatedAt: new Date()
    });

    this.updateActivity();
    return encryptionService.decrypt(entry.encryptedValue);
  }

  async getSecretByName(name: string): Promise<string> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    const settings = await db.settings
      .where('category').equals('vault')
      .and(setting => setting.key === name)
      .toArray();

    if (settings.length === 0) {
      throw new Error('Secret not found');
    }

    const setting = settings[0];
    const entry = setting.value as SecretEntry;
    
    return await this.getSecret(entry.id);
  }

  async updateSecret(
    secretId: string, 
    updates: {
      value?: string;
      metadata?: Partial<SecretEntry['metadata']>;
    }
  ): Promise<void> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    const setting = await db.settings.get(`vault_secret_${secretId}`);
    if (!setting) {
      throw new Error('Secret not found');
    }

    const entry = setting.value as SecretEntry;
    
    if (updates.value) {
      entry.encryptedValue = encryptionService.encrypt(updates.value);
    }

    if (updates.metadata) {
      entry.metadata = { ...entry.metadata, ...updates.metadata };
    }

    entry.updatedAt = new Date();

    await db.settings.update(`vault_secret_${secretId}`, {
      value: entry,
      updatedAt: new Date()
    });

    this.updateActivity();
  }

  async deleteSecret(secretId: string): Promise<void> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    await db.settings.delete(`vault_secret_${secretId}`);
    this.updateActivity();
  }

  async listSecrets(category?: SecretEntry['category']): Promise<Omit<SecretEntry, 'encryptedValue'>[]> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    const settings = await db.settings
      .where('category').equals('vault')
      .toArray();

    let entries = settings.map(setting => setting.value as SecretEntry);

    if (category) {
      entries = entries.filter(entry => entry.category === category);
    }

    this.updateActivity();

    // Return without encrypted values for security
    return entries.map(({ encryptedValue, ...entry }) => entry);
  }

  // Security features
  async rotateSecret(secretId: string, newValue: string): Promise<void> {
    await this.updateSecret(secretId, { 
      value: newValue,
      metadata: { lastAccessed: new Date() }
    });
  }

  async generateSecurePassword(
    length: number = 16,
    options: {
      includeUppercase?: boolean;
      includeLowercase?: boolean;
      includeNumbers?: boolean;
      includeSymbols?: boolean;
      excludeSimilar?: boolean;
    } = {}
  ): Promise<string> {
    const defaults = {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeSimilar: false
    };

    const opts = { ...defaults, ...options };
    
    let charset = '';
    if (opts.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (opts.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (opts.includeNumbers) charset += '0123456789';
    if (opts.includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (opts.excludeSimilar) {
      charset = charset.replace(/[il1Lo0O]/g, '');
    }

    let password = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    return password;
  }

  // Clipboard protection
  async copyToClipboard(secretId: string): Promise<void> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    const value = await this.getSecret(secretId);
    
    try {
      await navigator.clipboard.writeText(value);
      
      // Auto-clear clipboard after 30 seconds
      setTimeout(async () => {
        try {
          const currentClipboard = await navigator.clipboard.readText();
          if (currentClipboard === value) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // Ignore clipboard read errors
        }
      }, 30000);
    } catch (error) {
      throw new Error('Failed to copy to clipboard');
    }
  }

  // Auto-lock management
  setAutoLockTimeout(minutes: number): void {
    if (this.session) {
      this.session.autoLockTimeout = minutes;
    }
    
    if (!this.isLocked()) {
      this.startAutoLockTimer();
    }
  }

  private startAutoLockTimer(): void {
    this.clearAutoLockTimer();
    
    if (this.session) {
      this.autoLockTimer = setTimeout(() => {
        this.lockVault();
      }, this.session.autoLockTimeout * 60 * 1000);
    }
  }

  private clearAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  private updateActivity(): void {
    if (this.session) {
      this.session.lastActivity = new Date();
      
      if (!this.isLocked()) {
        this.startAutoLockTimer(); // Reset timer
      }
    }
  }

  // Backup and restore
  async exportVault(passphrase: string): Promise<string> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    const secrets = await db.settings
      .where('category').equals('vault')
      .toArray();

    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      secrets: secrets.map(setting => setting.value)
    };

    // Encrypt export with provided passphrase
    const exportKey = CryptoJS.PBKDF2(passphrase, 'export_salt', {
      keySize: 256/32,
      iterations: 100000
    }).toString();

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(exportData), 
      exportKey
    ).toString();

    return encrypted;
  }

  async importVault(encryptedData: string, passphrase: string): Promise<number> {
    if (this.isLocked()) {
      throw new Error('Vault is locked');
    }

    try {
      const exportKey = CryptoJS.PBKDF2(passphrase, 'export_salt', {
        keySize: 256/32,
        iterations: 100000
      }).toString();

      const decrypted = CryptoJS.AES.decrypt(encryptedData, exportKey);
      const exportData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

      let importedCount = 0;
      
      for (const secret of exportData.secrets) {
        try {
          await db.settings.put({
            id: `vault_secret_${secret.id}`,
            category: 'vault',
            key: secret.name,
            value: secret,
            encrypted: true,
            updatedAt: new Date()
          });
          importedCount++;
        } catch (error) {
          console.warn('Failed to import secret:', secret.name, error);
        }
      }

      return importedCount;
    } catch (error) {
      throw new Error('Failed to import vault: Invalid passphrase or corrupted data');
    }
  }

  // Audit and monitoring
  async getAuditLog(): Promise<Array<{
    action: string;
    secretId?: string;
    timestamp: Date;
    metadata?: any;
  }>> {
    // This would maintain an audit log of vault operations
    // For now, return empty array
    return [];
  }

  async getSecurityMetrics(): Promise<{
    totalSecrets: number;
    expiredSecrets: number;
    lastAccess: Date | null;
    sessionDuration: number;
    autoLockEnabled: boolean;
  }> {
    const secrets = await this.listSecrets();
    const now = new Date();
    const expired = secrets.filter(s => 
      s.metadata.expiresAt && s.metadata.expiresAt < now
    );

    return {
      totalSecrets: secrets.length,
      expiredSecrets: expired.length,
      lastAccess: this.session?.lastActivity || null,
      sessionDuration: this.session 
        ? now.getTime() - this.session.lastActivity.getTime()
        : 0,
      autoLockEnabled: (this.session?.autoLockTimeout || 0) > 0
    };
  }

  // Utility methods
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private deriveSessionKey(passphrase: string): string {
    return CryptoJS.PBKDF2(passphrase, this.session!.sessionId, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  private async getTestValue(): Promise<string | null> {
    try {
      const setting = await db.settings.get('vault_test');
      return setting?.value || null;
    } catch {
      return null;
    }
  }

  private async createTestValue(): Promise<void> {
    const testValue = encryptionService.encrypt('vault_test_value');
    await db.settings.put({
      id: 'vault_test',
      category: 'vault',
      key: 'test',
      value: testValue,
      encrypted: true,
      updatedAt: new Date()
    });
  }

  private secureClearMemory(): void {
    // Clear sensitive data from memory
    if (this.sessionKey) {
      // Overwrite session key
      this.sessionKey = '0'.repeat(this.sessionKey.length);
      this.sessionKey = null;
    }
  }

  // Cleanup
  cleanup(): void {
    this.lockVault();
    this.clearAutoLockTimer();
  }
}

export const securityVault = new SecurityVaultService();