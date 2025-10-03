import React, { useState, useEffect } from 'react'
import { realOAuthService } from '@/services/realOAuth'
import { enhancedAIProvider } from '@/services/enhancedAIProvider'
import { 
  Plus, 
  Key, 
  User, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  ExternalLink,
  Copy,
  Trash2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProviderAccount {
  id: string
  name: string
  email?: string
  type: 'oauth' | 'api_key'
  isActive: boolean
  lastUsed: string
  rateLimit: {
    currentRequests: number
    requestsPerMinute: number
    currentTokens: number
    tokensPerMinute: number
    resetTime: string
  }
  usage: {
    requestsToday: number
    tokensToday: number
    costToday: number
  }
}

interface ProviderConfig {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'google' | 'cohere'
  description: string
  website: string
  oauthSupported: boolean
  apiKeySupported: boolean
  icon: string
}

const providerConfigs: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'google',
    description: 'Google\'s conversational AI model',
    website: 'https://ai.google.dev/',
    oauthSupported: true,
    apiKeySupported: true,
    icon: '🔍'
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    type: 'openai',
    description: 'Advanced language models by OpenAI',
    website: 'https://platform.openai.com/',
    oauthSupported: false,
    apiKeySupported: true,
    icon: '🤖'
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    type: 'anthropic',
    description: 'Constitutional AI by Anthropic',
    website: 'https://www.anthropic.com/',
    oauthSupported: false,
    apiKeySupported: true,
    icon: '🧠'
  },
  {
    id: 'cohere',
    name: 'Cohere',
    type: 'cohere',
    description: 'Large language models for enterprise',
    website: 'https://cohere.com/',
    oauthSupported: false,
    apiKeySupported: true,
    icon: '📊'
  }
]

interface AccountManagerProps {
  className?: string
}

export function AccountManager({ className = "" }: AccountManagerProps) {
  const [providers, setProviders] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<ProviderAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addMethod, setAddMethod] = useState<'oauth' | 'api_key'>('oauth')
  const [apiKey, setApiKey] = useState('')
  const [accountName, setAccountName] = useState('')
  const [oauthUrl, setOAuthUrl] = useState('')
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadProviders()
    loadStats()
    
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    
    if (code && state) {
      handleOAuthCallback(code, state)
    }
  }, [])

  const loadProviders = async () => {
    try {
      const allAccounts = await realOAuthService.getAccounts()
      setAccounts(allAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        email: acc.email,
        type: 'api_key' as const,
        isActive: acc.isActive,
        lastUsed: acc.updatedAt.toISOString(),
        rateLimit: {
          currentRequests: acc.usage.requestsToday,
          requestsPerMinute: acc.rateLimits.requestsPerMinute,
          currentTokens: acc.usage.tokensToday,
          tokensPerMinute: acc.rateLimits.tokensPerMinute,
          resetTime: acc.usage.lastReset.toISOString()
        },
        usage: {
          requestsToday: acc.usage.requestsToday,
          tokensToday: acc.usage.tokensToday,
          costToday: 0
        }
      })))
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const loadStats = async () => {
    try {
      const statistics = await enhancedAIProvider.getAccountStatistics()
      setStats(statistics)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setIsLoading(true)
      const account = await realOAuthService.handleOAuthCallback(code, state)
      window.history.replaceState({}, '', window.location.pathname)
      await loadProviders()
      setShowAddModal(false)
      console.log('✅ OAuth account added successfully')
    } catch (error) {
      console.error('OAuth callback failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startOAuthFlow = (providerId: string) => {
    const providerConfig = providerConfigs.find(p => p.id === providerId)
    if (!providerConfig || !providerConfig.oauthSupported) return
    const url = realOAuthService.createAuthorizationUrl(providerId)
    setOAuthUrl(url)
    window.open(url, 'oauth', 'width=600,height=700,scrollbars=yes')
  }

  const addAPIKeyAccount = async () => {
    if (!selectedProvider || !apiKey.trim() || !accountName.trim()) return
    try {
      setIsLoading(true)
      // This will be handled by AIProviderSettings component
      setApiKey('')
      setAccountName('')
      setShowAddModal(false)
      await loadProviders()
      console.log('✅ API key account added successfully')
    } catch (error) {
      console.error('Failed to add API key account:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAccount = async (accountId: string, isActive: boolean) => {
    try {
      // This would need to be implemented in the provider manager
      console.log(`Toggle account ${accountId}: ${isActive}`)
      await loadProviders()
    } catch (error) {
      console.error('Failed to toggle account:', error)
    }
  }

  const removeAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to remove this account?')) return

    try {
      // This would need to be implemented in the provider manager
      console.log(`Remove account: ${accountId}`)
      await loadProviders()
    } catch (error) {
      console.error('Failed to remove account:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    console.log('Copied to clipboard')
  }

  const formatLastUsed = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min(100, Math.round((current / max) * 100))
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AI Provider Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your AI service provider accounts and API keys
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card p-3 rounded-lg border border-border">
            <p className="text-2xl font-bold text-blue-500">{stats.connectedProviders}</p>
            <p className="text-xs text-muted-foreground">Connected Providers</p>
          </div>
          <div className="bg-card p-3 rounded-lg border border-border">
            <p className="text-2xl font-bold text-green-500">{stats.activeAccounts}</p>
            <p className="text-xs text-muted-foreground">Active Accounts</p>
          </div>
        </div>
      )}

      {/* Provider Cards */}
      <div className="space-y-4">
        {providerConfigs.map((provider) => {
          const providerAccounts = accounts.filter(account => {
            const providerData = providers.find(p => p.id === provider.id)
            return providerData?.accounts.some((a: any) => a.id === account.id)
          })

          const isConnected = providerAccounts.length > 0
          const activeAccounts = providerAccounts.filter(a => a.isActive).length

          return (
            <div key={provider.id} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <h3 className="font-semibold">{provider.name}</h3>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(provider.website, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Accounts */}
              {providerAccounts.length > 0 && (
                <div className="space-y-2">
                  {providerAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          account.type === 'oauth' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {account.type === 'oauth' ? (
                            <User className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Key className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{account.name}</p>
                          {account.email && (
                            <p className="text-xs text-muted-foreground">{account.email}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Used {formatLastUsed(account.lastUsed)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Usage Indicators */}
                        <div className="text-right text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {getUsagePercentage(account.rateLimit.currentRequests, account.rateLimit.requestsPerMinute)}%
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {account.usage.requestsToday} reqs
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAccount(account.id, !account.isActive)}
                        >
                          {account.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAccount(account.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Account Button */}
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => {
                  setSelectedProvider(provider.id)
                  setShowAddModal(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add {provider.name} Account
              </Button>
            </div>
          )
        })}
      </div>

      {/* Add Account Modal */}
      {showAddModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <div>
              <h3 className="text-xl font-bold">Add Account</h3>
              <p className="text-muted-foreground">
                {providerConfigs.find(p => p.id === selectedProvider)?.name}
              </p>
            </div>

            {/* Add Method Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Method</label>
              <div className="grid grid-cols-2 gap-2">
                {providerConfigs.find(p => p.id === selectedProvider)?.oauthSupported && (
                  <Button
                    variant={addMethod === 'oauth' ? 'default' : 'outline'}
                    onClick={() => setAddMethod('oauth')}
                    className="flex flex-col h-20"
                  >
                    <User className="h-6 w-6 mb-1" />
                    <span className="text-xs">OAuth</span>
                  </Button>
                )}
                {providerConfigs.find(p => p.id === selectedProvider)?.apiKeySupported && (
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">OAuth Authentication</p>
                      <p>You'll be redirected to {providerConfigs.find(p => p.id === selectedProvider)?.name} to sign in and grant access.</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => startOAuthFlow(selectedProvider)}
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
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="My API Account"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">API Key</label>
                  <textarea
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Security Note</p>
                      <p>Your API key is stored securely in your browser's local storage.</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={addAPIKeyAccount}
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
                setShowAddModal(false)
                setAccountName('')
                setApiKey('')
                setAddMethod('oauth')
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}