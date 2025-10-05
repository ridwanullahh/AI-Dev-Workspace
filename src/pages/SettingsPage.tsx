import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Zap, Github, Palette, Info, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIProviderSettings } from '@/components/AIProviderSettings';
import { ConnectGitHub } from '@/components/ConnectGitHub';
import { githubAuth } from '../services/githubAuth';
import { encryptionService } from '@/database/schema';
import { Input } from '@/components/ui/input';

export function SettingsPage() {
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<any>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [showGitHubConnect, setShowGitHubConnect] = useState(false);

  useEffect(() => {
    checkGitHubConnection();
    checkVaultStatus();
  }, []);

  const checkGitHubConnection = async () => {
    const isAuth = await githubAuth.isAuthenticated();
    setIsGitHubConnected(isAuth);
    
    if (isAuth) {
      const user = await githubAuth.getAuthenticatedUser();
      setGithubUser(user);
    }
  };

  const checkVaultStatus = () => {
    setIsVaultUnlocked(encryptionService.isUnlocked());
  };

  const handleUnlockVault = async () => {
    try {
      await encryptionService.initializeEncryption(vaultPassword);
      setIsVaultUnlocked(true);
      setVaultPassword('');
      alert('Vault unlocked successfully!');
    } catch (error) {
      alert('Failed to unlock vault. Please check your password.');
    }
  };

  const handleLockVault = () => {
    encryptionService.lockVault();
    setIsVaultUnlocked(false);
    alert('Vault locked successfully.');
  };

  const handleGitHubDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect GitHub?')) {
      await githubAuth.revokeAccess();
      setIsGitHubConnected(false);
      setGithubUser(null);
      alert('GitHub disconnected successfully.');
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure your workspace and preferences
        </p>
      </div>

      <Tabs defaultValue="ai-providers" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="ai-providers" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">AI Providers</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="github" className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
            <span className="sm:hidden">Git</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
            <span className="sm:hidden">Sec</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">About</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Providers Tab */}
        <TabsContent value="ai-providers" className="mt-6">
          <AIProviderSettings />
        </TabsContent>

        {/* GitHub Tab */}
        <TabsContent value="github" className="mt-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">GitHub Integration</h2>
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to sync repositories and collaborate
            </p>
          </div>

          {isGitHubConnected && githubUser ? (
            <div className="space-y-4">
              <div className="bg-card rounded-lg p-6 border border-border">
                <div className="flex items-center gap-4 mb-4">
                  {githubUser.avatar_url && (
                    <img
                      src={githubUser.avatar_url}
                      alt={githubUser.name}
                      className="w-16 h-16 rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{githubUser.name}</h3>
                    <p className="text-sm text-muted-foreground">@{githubUser.login}</p>
                    {githubUser.email && (
                      <p className="text-sm text-muted-foreground">{githubUser.email}</p>
                    )}
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Github className="h-5 w-5 text-green-500" />
                    <p className="font-medium text-green-500">Connected</p>
                  </div>
                  <p className="text-sm text-green-200 mt-1">
                    Your GitHub account is connected and active
                  </p>
                </div>

                <Button
                  onClick={handleGitHubDisconnect}
                  variant="destructive"
                  className="w-full"
                >
                  Disconnect GitHub
                </Button>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">Available Features:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Clone and sync repositories</li>
                  <li>Create and manage pull requests</li>
                  <li>Push and pull changes</li>
                  <li>View commit history and branches</li>
                  <li>Set up webhooks for real-time sync</li>
                </ul>
              </div>
            </div>
          ) : (
            <div>
              {showGitHubConnect ? (
                <ConnectGitHub
                  onSuccess={() => {
                    setShowGitHubConnect(false);
                    checkGitHubConnection();
                  }}
                  onCancel={() => setShowGitHubConnect(false)}
                />
              ) : (
                <div className="bg-card rounded-lg p-8 border border-border text-center">
                  <Github className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Not Connected</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your GitHub account to unlock repository features
                  </p>
                  <Button onClick={() => setShowGitHubConnect(true)} size="lg">
                    <Github className="h-5 w-5 mr-2" />
                    Connect GitHub
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Security Vault</h2>
            <p className="text-sm text-muted-foreground">
              Manage your encryption vault for API keys and sensitive data
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border space-y-4">
            {isVaultUnlocked ? (
              <>
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-green-500" />
                    <p className="font-medium text-green-500">Vault Unlocked</p>
                  </div>
                  <p className="text-sm text-green-200 mt-1">
                    Your vault is unlocked and ready to use
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Vault Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>AES-256 encryption for API keys</li>
                    <li>PBKDF2 key derivation with 100,000 iterations</li>
                    <li>Secure storage in browser's IndexedDB</li>
                    <li>Auto-lock on browser close</li>
                  </ul>
                </div>

                <Button onClick={handleLockVault} variant="outline" className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Vault
                </Button>
              </>
            ) : (
              <>
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-yellow-500" />
                    <p className="font-medium text-yellow-500">Vault Locked</p>
                  </div>
                  <p className="text-sm text-yellow-200 mt-1">
                    Enter your password to unlock the vault
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Vault Password</label>
                    <Input
                      type="password"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      placeholder="Enter your vault password"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUnlockVault();
                        }
                      }}
                    />
                  </div>

                  <Button
                    onClick={handleUnlockVault}
                    disabled={!vaultPassword}
                    className="w-full"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Unlock Vault
                  </Button>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <p className="font-medium">Security Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Choose a strong, unique password</li>
                    <li>Your password is never stored or transmitted</li>
                    <li>If you forget your password, you'll need to re-add your accounts</li>
                    <li>The vault auto-locks when you close the browser</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="mt-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">About</h2>
            <p className="text-sm text-muted-foreground">
              Application information and version details
            </p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-3xl">
                🤖
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Dev Workspace</h3>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Mobile-first AI development workspace powered by intelligent agents.
              Code anywhere, on any device, with the full power of AI at your fingertips.
            </p>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium mb-1">Platform</p>
                  <p className="text-muted-foreground">Progressive Web App</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Framework</p>
                  <p className="text-muted-foreground">React + Vite</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Storage</p>
                  <p className="text-muted-foreground">IndexedDB + OPFS</p>
                </div>
                <div>
                  <p className="font-medium mb-1">AI Models</p>
                  <p className="text-muted-foreground">Multi-Provider</p>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium">Key Features:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>6 specialized AI agents (Architect, Coder, Designer, Debugger, DevOps, PM)</li>
                <li>GitHub integration with real-time sync</li>
                <li>Multi-provider AI support (Gemini, OpenAI, Claude, Cohere)</li>
                <li>Offline-first architecture with OPFS filesystem</li>
                <li>End-to-end encryption for sensitive data</li>
                <li>Mobile-optimized touch interface</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open('https://github.com', '_blank')}
              >
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open('https://docs.example.com', '_blank')}
              >
                Documentation
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SettingsPage;
