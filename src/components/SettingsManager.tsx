import React, { useState, useEffect } from 'react';
import { db, encryptionService } from '../database/schema';
import type { Settings, Account } from '../database/schema';
import { realOAuthService } from '../services/realOAuth';
import { githubAuth } from '../services/githubAuth';
import { Settings as SettingsIcon, Key, Shield, Palette, Database, Zap } from 'lucide-react';

interface SettingsManagerProps {
  onClose?: () => void;
}

export function SettingsManager({ onClose }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'git' | 'ui' | 'security' | 'data'>('ai');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [githubConnected, setGithubConnected] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const allAccounts = await db.accounts.toArray();
    setAccounts(allAccounts);

    const isGithubAuth = await githubAuth.isAuthenticated();
    setGithubConnected(isGithubAuth);

    const allSettings = await db.settings.toArray();
    const settingsMap: Record<string, any> = {};
    allSettings.forEach(s => {
      settingsMap[`${s.category}_${s.key}`] = s.value;
    });
    setSettings(settingsMap);
  };

  const handleAddAIAccount = async (provider: string) => {
    if (provider === 'gemini') {
      const authUrl = realOAuthService.createAuthorizationUrl(provider);
      window.open(authUrl, '_blank');
    }
  };

  const handleConnectGitHub = async () => {
    const deviceFlow = await githubAuth.initiateDeviceFlow();
    
    alert(`Go to ${deviceFlow.verification_uri} and enter code: ${deviceFlow.user_code}`);
    
    try {
      await githubAuth.pollForAccessToken(deviceFlow.device_code, deviceFlow.interval);
      setGithubConnected(true);
    } catch (error) {
      alert('GitHub authentication failed');
    }
  };

  const handleUpdateSetting = async (category: Settings['category'], key: string, value: any) => {
    await db.settings.put({
      id: `${category}_${key}`,
      category,
      key,
      value,
      encrypted: false,
      updatedAt: new Date()
    });
    
    setSettings(prev => ({
      ...prev,
      [`${category}_${key}`]: value
    }));
  };

  const renderAISettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">AI Provider Accounts</h3>
        <div className="space-y-3">
          {accounts.map(account => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <div className="font-medium">{account.name}</div>
                <div className="text-sm text-gray-400">{account.providerId}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {account.usage.requestsToday} requests today
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  account.health.status === 'healthy' ? 'bg-green-500' :
                  account.health.status === 'degraded' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <button
                  onClick={() => realOAuthService.deactivateAccount(account.id)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <button
            onClick={() => handleAddAIAccount('gemini')}
            className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
          >
            + Add AI Provider Account
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Default Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-2">Default Model</label>
            <select
              value={settings.ai_default_model || 'gemini-pro'}
              onChange={(e) => handleUpdateSetting('ai', 'default_model', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
            >
              <option value="gemini-pro">Gemini Pro</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Temperature: {settings.ai_temperature || 0.7}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.ai_temperature || 0.7}
              onChange={(e) => handleUpdateSetting('ai', 'temperature', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Max Tokens</label>
            <input
              type="number"
              value={settings.ai_max_tokens || 4096}
              onChange={(e) => handleUpdateSetting('ai', 'max_tokens', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderGitSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">GitHub Integration</h3>
        {githubConnected ? (
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-green-400">Connected to GitHub</div>
                <div className="text-sm text-gray-400 mt-1">
                  You can sync repositories and create pull requests
                </div>
              </div>
              <button
                onClick={async () => {
                  await githubAuth.revokeAccess();
                  setGithubConnected(false);
                }}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnectGitHub}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Connect GitHub Account
          </button>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Git Configuration</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-2">Commit Author Name</label>
            <input
              type="text"
              value={settings.git_author_name || 'AI Dev Workspace'}
              onChange={(e) => handleUpdateSetting('git', 'author_name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Commit Author Email</label>
            <input
              type="email"
              value={settings.git_author_email || 'dev@aiworkspace.app'}
              onChange={(e) => handleUpdateSetting('git', 'author_email', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.git_auto_sync || false}
                onChange={(e) => handleUpdateSetting('git', 'auto_sync', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Enable automatic synchronization</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUISettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Appearance</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-2">Theme</label>
            <select
              value={settings.ui_theme || 'dark'}
              onChange={(e) => handleUpdateSetting('ui', 'theme', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Font Size</label>
            <select
              value={settings.ui_font_size || 'medium'}
              onChange={(e) => handleUpdateSetting('ui', 'font_size', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.ui_compact_mode || false}
                onChange={(e) => handleUpdateSetting('ui', 'compact_mode', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Compact mode</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Security</h3>
        <div className="space-y-3">
          <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <div className="text-yellow-400 font-medium mb-2">Encryption Status</div>
            <div className="text-sm text-gray-400">
              {encryptionService.isUnlocked() ? 'Vault is unlocked' : 'Vault is locked'}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.security_auto_lock || true}
                onChange={(e) => handleUpdateSetting('security', 'auto_lock', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Auto-lock after inactivity</span>
            </label>
          </div>

          <div>
            <label className="block text-sm mb-2">Auto-lock timeout (minutes)</label>
            <input
              type="number"
              value={settings.security_lock_timeout || 15}
              onChange={(e) => handleUpdateSetting('security', 'lock_timeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Data Management</h3>
        <div className="space-y-3">
          <button
            onClick={async () => {
              const data = await db.exportData();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ai-workspace-backup-${Date.now()}.json`;
              a.click();
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Export All Data
          </button>

          <button
            onClick={() => {
              if (confirm('This will delete all data. Are you sure?')) {
                db.delete().then(() => window.location.reload());
              }
            }}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'ai' as const, label: 'AI Providers', icon: <Zap size={16} /> },
    { id: 'git' as const, label: 'Git', icon: <Key size={16} /> },
    { id: 'ui' as const, label: 'UI', icon: <Palette size={16} /> },
    { id: 'security' as const, label: 'Security', icon: <Shield size={16} /> },
    { id: 'data' as const, label: 'Data', icon: <Database size={16} /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <SettingsIcon size={24} />
            <h2 className="text-2xl font-bold">Settings</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r border-gray-700 overflow-y-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-900/30 text-blue-400 border-r-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {tab.icon}
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'ai' && renderAISettings()}
            {activeTab === 'git' && renderGitSettings()}
            {activeTab === 'ui' && renderUISettings()}
            {activeTab === 'security' && renderSecuritySettings()}
            {activeTab === 'data' && renderDataSettings()}
          </div>
        </div>
      </div>
    </div>
  );
}
