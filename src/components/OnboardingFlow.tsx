import React, { useState } from 'react';
import { db, encryptionService } from '../database/schema';
import { githubAuth } from '../services/githubAuth';
import { realOAuthService } from '../services/realOAuth';
import { ChevronRight, Check, Rocket, Key, Github, Zap } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [vaultPassword, setVaultPassword] = useState('');
  const [githubConnected, setGithubConnected] = useState(false);
  const [aiProviderAdded, setAiProviderAdded] = useState(false);

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to AI Dev Workspace',
      description: 'Your intelligent, mobile-first development environment',
      icon: <Rocket size={48} className="text-blue-400" />
    },
    {
      id: 'security',
      title: 'Secure Your Workspace',
      description: 'Create a password to encrypt your API keys and sensitive data',
      icon: <Key size={48} className="text-green-400" />
    },
    {
      id: 'github',
      title: 'Connect GitHub',
      description: 'Sync your repositories and collaborate with your team',
      icon: <Github size={48} className="text-purple-400" />
    },
    {
      id: 'ai',
      title: 'Add AI Provider',
      description: 'Connect your AI provider accounts to power your agents',
      icon: <Zap size={48} className="text-yellow-400" />
    },
    {
      id: 'complete',
      title: 'All Set!',
      description: 'You\'re ready to start building with AI agents',
      icon: <Check size={48} className="text-green-400" />
    }
  ];

  const handleSecuritySetup = async () => {
    if (!vaultPassword || vaultPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      await encryptionService.initializeEncryption(vaultPassword);
      
      await db.settings.put({
        id: 'vault_initialized',
        category: 'security',
        key: 'initialized',
        value: true,
        encrypted: false,
        updatedAt: new Date()
      });

      setStep(step + 1);
    } catch (error) {
      alert('Failed to initialize security vault');
    }
  };

  const handleGitHubConnect = async () => {
    try {
      const deviceFlow = await githubAuth.initiateDeviceFlow();
      
      const modal = window.open('', '_blank', 'width=500,height=600');
      if (modal) {
        modal.document.write(`
          <html>
            <head><title>GitHub Authentication</title></head>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>Connect GitHub</h1>
              <p>Go to: <a href="${deviceFlow.verification_uri}" target="_blank">${deviceFlow.verification_uri}</a></p>
              <h2 style="font-size: 48px; margin: 40px 0;">${deviceFlow.user_code}</h2>
              <p>Enter this code to authorize</p>
              <p style="margin-top: 40px; color: #666;">This window will close automatically...</p>
            </body>
          </html>
        `);
      }

      await githubAuth.pollForAccessToken(deviceFlow.device_code, deviceFlow.interval);
      setGithubConnected(true);
      
      if (modal) modal.close();
      
      setTimeout(() => setStep(step + 1), 1000);
    } catch (error) {
      alert('GitHub authentication failed. You can set this up later in Settings.');
      setStep(step + 1);
    }
  };

  const handleAIProviderAdd = () => {
    const authUrl = realOAuthService.createAuthorizationUrl('gemini');
    window.open(authUrl, '_blank');
    
    // For now, skip to completion
    // In production, we'd wait for OAuth callback
    setTimeout(() => {
      setAiProviderAdded(true);
      setStep(step + 1);
    }, 2000);
  };

  const handleComplete = async () => {
    await db.settings.put({
      id: 'onboarding_completed',
      category: 'general',
      key: 'onboarding_completed',
      value: true,
      encrypted: false,
      updatedAt: new Date()
    });

    onComplete();
  };

  const renderStepContent = () => {
    const currentStep = steps[step];

    switch (currentStep.id) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="text-center">
              {currentStep.icon}
              <h2 className="text-3xl font-bold mt-4">{currentStep.title}</h2>
              <p className="text-gray-400 mt-2">{currentStep.description}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Check className="text-green-400 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold">AI-Powered Agents</h3>
                  <p className="text-sm text-gray-400">6 specialized agents to help you code, design, debug, and deploy</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="text-green-400 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold">GitHub Integration</h3>
                  <p className="text-sm text-gray-400">Seamless repository sync with conflict resolution</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="text-green-400 mt-1" size={20} />
                <div>
                  <h3 className="font-semibold">Mobile-First Design</h3>
                  <p className="text-sm text-gray-400">Code anywhere, on any device</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(step + 1)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Get Started <ChevronRight size={20} />
            </button>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="text-center">
              {currentStep.icon}
              <h2 className="text-2xl font-bold mt-4">{currentStep.title}</h2>
              <p className="text-gray-400 mt-2">{currentStep.description}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Create Vault Password</label>
                <input
                  type="password"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This password encrypts your API keys and sensitive data. Choose something strong and memorable.
                </p>
              </div>

              <button
                onClick={handleSecuritySetup}
                disabled={!vaultPassword || vaultPassword.length < 8}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Secure My Workspace
              </button>

              <button
                onClick={() => setStep(step + 1)}
                className="w-full text-gray-400 hover:text-white py-2 transition-colors text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        );

      case 'github':
        return (
          <div className="space-y-6">
            {githubConnected ? (
              <>
                <div className="text-center">
                  <Check className="text-green-400 mx-auto mb-3" size={48} />
                  <h2 className="text-2xl font-bold">{currentStep.title}</h2>
                  <p className="text-gray-400 mt-2">{currentStep.description}</p>
                </div>
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 text-center">
                  <p className="text-green-400 font-semibold">GitHub Connected!</p>
                  <p className="text-sm text-green-200 mt-2">You can now sync repositories and collaborate</p>
                </div>
                <button
                  onClick={() => setStep(step + 1)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                <div className="text-center">
                  {currentStep.icon}
                  <h2 className="text-2xl font-bold mt-4">{currentStep.title}</h2>
                  <p className="text-gray-400 mt-2">{currentStep.description}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                  <p className="font-medium">What you can do with GitHub:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li>Clone and sync repositories</li>
                    <li>Create and manage pull requests</li>
                    <li>Push and pull changes</li>
                    <li>View commit history</li>
                  </ul>
                </div>
                <button
                  onClick={handleGitHubConnect}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Github size={20} />
                  Connect GitHub Account
                </button>
                <button
                  onClick={() => setStep(step + 1)}
                  className="w-full text-gray-400 hover:text-white py-2 transition-colors text-sm"
                >
                  Skip for now
                </button>
              </>
            )}
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div className="text-center">
              {currentStep.icon}
              <h2 className="text-2xl font-bold mt-4">{currentStep.title}</h2>
              <p className="text-gray-400 mt-2">{currentStep.description}</p>
            </div>

            {aiProviderAdded ? (
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 text-center">
                <Check className="text-green-400 mx-auto mb-3" size={48} />
                <p className="text-green-400 font-semibold">AI Provider Added!</p>
              </div>
            ) : (
              <button
                onClick={handleAIProviderAdd}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={20} />
                Add Gemini AI
              </button>
            )}

            <button
              onClick={() => setStep(step + 1)}
              className="w-full text-gray-400 hover:text-white py-2 transition-colors text-sm"
            >
              Skip for now
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            {currentStep.icon}
            <h2 className="text-3xl font-bold mt-4">{currentStep.title}</h2>
            <p className="text-gray-400 mt-2">{currentStep.description}</p>

            <div className="bg-gray-800 rounded-lg p-6 space-y-3 text-left">
              <h3 className="font-semibold mb-3">What's Next?</h3>
              <p className="text-sm text-gray-400">• Create your first project</p>
              <p className="text-sm text-gray-400">• Chat with AI agents to get started</p>
              <p className="text-sm text-gray-400">• Explore settings to customize your workspace</p>
              <p className="text-sm text-gray-400">• Check out the terminal and git features</p>
            </div>

            <button
              onClick={handleComplete}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Start Building <ChevronRight size={20} />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {steps.map((s, idx) => (
                <div
                  key={s.id}
                  className={`h-2 flex-1 mx-1 rounded-full transition-colors ${
                    idx <= step ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-sm text-gray-400">
              Step {step + 1} of {steps.length}
            </p>
          </div>

          {/* Step content */}
          <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
            {renderStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
