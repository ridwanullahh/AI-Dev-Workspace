import React, { useState, useEffect } from 'react';
import { oauthService } from '@/services/oauth';
import { enhancedAIProvider } from '@/services/enhancedAIProvider';
import { db, encryptionService } from '@/database/schema';
import type { Account } from '@/database/schema';
import {
  Plus,
  Key,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Trash2,
  RefreshCw,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ProviderConfig {
  id: string;
  name: string;
  type: 'gemini' | 'openai' | 'anthropic' | 'cohere';
  description: string;
  website: string;
  oauthSupported: boolean;
  apiKeySupported: boolean;
  icon: string;
  models: string[];
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'gemini',
    description: 'Google\'s most capable AI model',
    website: 'https://ai.google.dev/',
    oauthSupported: true,
    apiKeySupported: true,
    icon: '🔍',
    models: ['gemini-pro', 'gemini-pro-vision']
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    type: 'openai',
    description: 'Advanced language models by OpenAI',
    website: 'https://platform.openai.com/',
    oauthSupported: false,
    apiKeySupported: true,
    icon: '🤖',
    models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    type: 'anthropic',
    description: 'Constitutional AI by Anthropic',
    website: 'https://www.anthropic.com/',
    oauthSupported: false,
    apiKeySupported: true,
    icon: '🧠',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
  },
  {
    id: 'cohere',
    name: 'Cohere',
    type: 'cohere',
    description: 'Large language models for enterprise',
    website: 'https://cohere.com/',
    oauthSupported: false,
    apiKeySupported: true,
    icon: '📊',
    models: ['command', 'command-light', 'command-nightly']
  }
];

export function AIProviderSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [addMethod, setAddMethod] = useState<'oauth' | 'api_key'>('oauth');
  const [apiKey, setApiKey] = useState('');
  const [accountName, setAccountName] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [isVaultLocked, setIsVaultLocked] = useState(true);

  useEffect(() => {
    loadAccounts();
    loadStats();
    checkVaultStatus();
  }, []);

  const checkVaultStatus = () => {
    setIsVaultLocked(!encryptionService.isUnlocked());
  };

  const loadAccounts = async () => {
    try {
      const allAccounts = await oauthService.getAccounts();
      setAccounts(allAccounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await enhancedAIProvider.getAccountStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleOAuthFlow = async (providerId: string) => {
    if (isVaultLocked) {
      alert('Please unlock your vault first in Security Settings');
      return;
    }

    try {
      const authUrl = oauthService.createAuthorizationUrl(providerId);
      window.open(authUrl, 'oauth', 'width=600,height=700,scrollbars=yes');
      
      setShowAddModal(false);
      
      // Note: OAuth callback handling is done in App.tsx or a callback route
    } catch (error) {
      console.error('OAuth flow failed:', error);
      alert('Failed to start OAuth flow');
    }
  };

  const handleAddAPIKey = async () => {
    if (!selectedProvider || !apiKey.trim() || !accountName.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (isVaultLocked) {
      alert('Please unlock your vault first in Security Settings');
      return;
    }

    try {
      setIsLoading(true);

      const encryptedTokens = encryptionService.encrypt(JSON.stringify({
        access_token: apiKey.trim(),
        token_type: 'Bearer'
      }));

      const account: Account = {
        id: `${selectedProvider}_${Date.now()}`,
        providerId: selectedProvider,
        email: accountName.trim(),
        name: accountName.trim(),
        encryptedTokens,
        priority: 1,
        weight: 1,
        isActive: true,
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          tokensPerMinute: 150000
        },
        usage: {
          requestsToday: 0,
          tokensToday: 0,
          lastReset: new Date()
        },
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          errorCount: 0,
          circuitBreakerOpen: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.accounts.put(account);
      
      setApiKey('');
      setAccountName('');
      setShowAddModal(false);
      await loadAccounts();
      
      alert('API key account added successfully!');
    } catch (error) {
      console.error('Failed to add API key:', error);
      alert('Failed to add API key account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to remove this account?')) return;

    try {
      await oauthService.removeAccount(accountId);
      await loadAccounts();
      alert('Account removed successfully');
    } catch (error) {
      console.error('Failed to remove account:', error);
      alert('Failed to remove account');
    }
  };

  const handleToggleAccount = async (accountId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await oauthService.deactivateAccount(accountId);
      } else {
        await db.accounts.update(accountId, {
          isActive: true,
          updatedAt: new Date()
        });
      }
      await loadAccounts();
    } catch (error) {
      console.error('Failed to toggle account:', error);
    }
  };

  const handleTestConnection = async (account: Account) => {
    try {
      setIsLoading(true);
      const isHealthy = await oauthService.healthCheckAccount(account);
      
      if (isHealthy) {
        alert('Connection test successful!');
      } else {
        alert('Connection test failed. Please check your credentials.');
      }
      
      await loadAccounts();
    } catch (error) {
      console.error('Connection test failed:', error);
      alert('Connection test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderAccounts = (providerId: string) => {
    return accounts.filter(acc => acc.providerId === providerId);
  };

  const formatLastUsed = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AI Provider Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your AI service provider accounts and API keys
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} disabled={isVaultLocked}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Vault Warning */}
      {isVaultLocked && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-500">Vault Locked</h3>
              <p className="text-sm text-yellow-200 mt-1">
                Please unlock your vault in Security Settings to add or manage AI provider accounts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card p-4 rounded-lg border border-border">
            <Activity className="h-5 w-5 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{accounts.length}</p>
            <p className="text-xs text-muted-foreground">Total Accounts</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <CheckCircle className="h-5 w-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{accounts.filter(a => a.isActive).length}</p>
            <p className="text-xs text-muted-foreground">Active Accounts</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <TrendingUp className="h-5 w-5 text-purple-500 mb-2" />
            <p className="text-2xl font-bold">
              {stats.reduce((sum: number, s: any) => sum + s.requests, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Requests Today</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <Zap className="h-5 w-5 text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">
              {stats.reduce((sum: number, s: any) => sum + s.tokens, 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Tokens Used</p>
          </div>
        </div>
      )}

      {/* Provider Tabs */}
      <Tabs defaultValue={PROVIDER_CONFIGS[0].id} className="w-full">
        <TabsList className="w-full">
          {PROVIDER_CONFIGS.map(provider => (
            <TabsTrigger key={provider.id} value={provider.id} className="flex-1">
              <span className="mr-2">{provider.icon}</span>
              {provider.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROVIDER_CONFIGS.map(provider => {
          const providerAccounts = getProviderAccounts(provider.id);
          
          return (
            <TabsContent key={provider.id} value={provider.id} className="space-y-4">
              {/* Provider Info */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{provider.icon}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(provider.website, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {/* Models */}
                <div className="flex flex-wrap gap-2">
                  {provider.models.map(model => (
                    <Badge key={model} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Accounts */}
              {providerAccounts.length > 0 ? (
                <div className="space-y-3">
                  {providerAccounts.map(account => (
                    <div
                      key={account.id}
                      className="bg-card rounded-lg p-4 border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            account.encryptedTokens.includes('refresh_token') ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {account.encryptedTokens.includes('refresh_token') ? (
                              <User className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Key className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{account.name}</p>
                              {account.isActive ? (
                                <Badge variant="default" className="bg-green-500 text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  account.health.status === 'healthy'
                                    ? 'border-green-500 text-green-500'
                                    : account.health.status === 'degraded'
                                    ? 'border-yellow-500 text-yellow-500'
                                    : 'border-red-500 text-red-500'
                                }`}
                              >
                                {account.health.status}
                              </Badge>
                            </div>
                            {account.email && (
                              <p className="text-sm text-muted-foreground">{account.email}</p>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              <p>Requests today: {account.usage.requestsToday}</p>
                              <p>Tokens used: {account.usage.tokensToday.toLocaleString()}</p>
                              <p>Last check: {formatLastUsed(account.health.lastCheck)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(account)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Activity className="h-4 w-4 mr-2" />
                                Test
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAccount(account.id, account.isActive)}
                          >
                            {account.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveAccount(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted rounded-lg p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No accounts configured for {provider.name}
                  </p>
                  <Button
                    onClick={() => {
                      setSelectedProvider(provider.id);
                      setShowAddModal(true);
                    }}
                    disabled={isVaultLocked}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {provider.name} Account
                  </Button>
                </div>
              )}

              {/* Add Account Button */}
              {providerAccounts.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedProvider(provider.id);
                    setShowAddModal(true);
                  }}
                  disabled={isVaultLocked}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Account
                </Button>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Add Account Modal */}
      {showAddModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-xl font-bold">Add Account</h3>
              <p className="text-muted-foreground">
                {PROVIDER_CONFIGS.find(p => p.id === selectedProvider)?.name}
              </p>
            </div>

            {/* Add Method Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Method</label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDER_CONFIGS.find(p => p.id === selectedProvider)?.oauthSupported && (
                  <Button
                    variant={addMethod === 'oauth' ? 'default' : 'outline'}
                    onClick={() => setAddMethod('oauth')}
                    className="flex flex-col h-20"
                  >
                    <User className="h-6 w-6 mb-1" />
                    <span className="text-xs">OAuth</span>
                  </Button>
                )}
                {PROVIDER_CONFIGS.find(p => p.id === selectedProvider)?.apiKeySupported && (
                  <Button
                    variant={addMethod === 'api_key' ? 'default' : 'outline'}
                    onClick={() => setAddMethod('api_key')}
                    className="flex flex-col h-20"
                  >
                    <Key className="h-6 w-6 mb-1" />
                    <span className="text-xs">API Key</span>
                  </Button>
                )}
              </div>
            </div>

            {/* OAuth Flow */}
            {addMethod === 'oauth' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">OAuth Authentication</p>
                      <p>
                        You'll be redirected to{' '}
                        {PROVIDER_CONFIGS.find(p => p.id === selectedProvider)?.name} to sign in.
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleOAuthFlow(selectedProvider)}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Connect with OAuth
                </Button>
              </div>
            )}

            {/* API Key Form */}
            {addMethod === 'api_key' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Account Name</label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="My API Account"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">API Key</label>
                  <Textarea
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium">Security Note</p>
                      <p>Your API key is encrypted and stored securely.</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleAddAPIKey}
                  disabled={!accountName.trim() || !apiKey.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Account
                </Button>
              </div>
            )}

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setAccountName('');
                setApiKey('');
                setAddMethod('oauth');
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
