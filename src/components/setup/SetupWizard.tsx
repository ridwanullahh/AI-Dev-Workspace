import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, ArrowLeft, Key, Shield, Zap } from 'lucide-react';
import { realOAuthService } from '../../services/realOAuth';
import { securityVault } from '../../services/securityVault';
import { performanceMonitoring } from '../../services/performanceMonitoring';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<SetupStepProps>;
  required: boolean;
}

interface SetupStepProps {
  onNext: (data?: any) => void;
  onPrevious: () => void;
  data: any;
  setData: (data: any) => void;
}

const WelcomeStep: React.FC<SetupStepProps> = ({ onNext }) => (
  <div className="text-center space-y-6">
    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
      <Zap className="w-8 h-8 text-blue-600" />
    </div>
    <div>
      <h2 className="text-2xl font-bold mb-2">Welcome to AI Dev Workspace</h2>
      <p className="text-gray-600">Let's set up your mobile-first AI development environment in just a few steps.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="font-semibold mb-1">🤖 AI Agents</div>
        <div className="text-gray-600">Multiple AI providers with smart rotation</div>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="font-semibold mb-1">🔒 Secure</div>
        <div className="text-gray-600">End-to-end encryption for your keys</div>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="font-semibold mb-1">📱 Mobile First</div>
        <div className="text-gray-600">Works perfectly on any device</div>
      </div>
    </div>
    <Button onClick={() => onNext()} className="w-full">
      Get Started <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
);

const SecurityStep: React.FC<SetupStepProps> = ({ onNext, onPrevious, data, setData }) => {
  const [passphrase, setPassphrase] = useState(data.passphrase || '');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    try {
      const success = await securityVault.unlockVault(passphrase);
      if (success) {
        setData({ ...data, passphrase });
        onNext();
      } else {
        setError('Failed to initialize security vault');
      }
    } catch (error) {
      setError('Failed to setup security');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Setup Security</h2>
        <p className="text-gray-600">Create a master passphrase to encrypt your API keys and sensitive data.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="passphrase">Master Passphrase</Label>
          <Input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter a strong passphrase"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="confirmPassphrase">Confirm Passphrase</Label>
          <Input
            id="confirmPassphrase"
            type="password"
            value={confirmPassphrase}
            onChange={(e) => setConfirmPassphrase(e.target.value)}
            placeholder="Confirm your passphrase"
            className="mt-1"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <div className="font-semibold mb-2">Security Features:</div>
          <ul className="space-y-1 text-gray-600">
            <li>• All API keys encrypted with PBKDF2 + AES</li>
            <li>• Auto-lock after inactivity</li>
            <li>• Secure clipboard operations</li>
            <li>• Local-only processing</li>
          </ul>
        </div>
      </div>

      <div className="flex space-x-4">
        <Button variant="outline" onClick={onPrevious} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <Button onClick={handleNext} className="flex-1">
          Next <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const AIProvidersStep: React.FC<SetupStepProps> = ({ onNext, onPrevious, data, setData }) => {
  const [providers, setProviders] = useState(data.providers || []);
  const [currentProvider, setCurrentProvider] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const connectGoogleAccount = async () => {
    setIsConnecting(true);
    try {
      const authUrl = realOAuthService.createAuthorizationUrl('gemini');
      window.open(authUrl, '_blank', 'width=500,height=600');
      
      // Listen for OAuth completion
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'oauth_success') {
          const account = await realOAuthService.handleOAuthCallback(
            event.data.code, 
            event.data.state
          );
          
          setProviders([...providers, {
            id: account.id,
            name: account.name,
            email: account.email,
            provider: 'gemini'
          }]);
          
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('OAuth connection failed:', error);
    }
    setIsConnecting(false);
  };

  const handleNext = () => {
    setData({ ...data, providers });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect AI Providers</h2>
        <p className="text-gray-600">Add your AI accounts for smart load balancing and redundancy.</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">
                G
              </div>
              Google Gemini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Connect your Google account to use Gemini Pro models
              </div>
              <Button 
                onClick={connectGoogleAccount}
                disabled={isConnecting}
                size="sm"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="w-8 h-8 bg-green-100 rounded mr-3 flex items-center justify-center">
                O
              </div>
              OpenAI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Add your OpenAI API key (coming soon)
              </div>
              <Button size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {providers.length > 0 && (
          <div className="space-y-2">
            <Label>Connected Accounts</Label>
            {providers.map((provider, index) => (
              <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-gray-600">{provider.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <Button variant="outline" onClick={onPrevious} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <Button onClick={handleNext} className="flex-1">
          {providers.length > 0 ? 'Continue' : 'Skip for Now'} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const CompletionStep: React.FC<SetupStepProps> = ({ data }) => {
  useEffect(() => {
    // Initialize performance monitoring
    performanceMonitoring.initialize();
  }, []);

  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
        <p className="text-gray-600">Your AI Dev Workspace is ready to use.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="p-4 bg-gray-50 rounded-lg text-left">
          <div className="font-semibold mb-2">✓ Security Configured</div>
          <div className="text-gray-600">Your vault is encrypted and protected</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-left">
          <div className="font-semibold mb-2">✓ AI Providers Ready</div>
          <div className="text-gray-600">{data.providers?.length || 0} accounts connected</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-left">
          <div className="font-semibold mb-2">✓ Performance Monitoring</div>
          <div className="text-gray-600">Real-time metrics enabled</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-left">
          <div className="font-semibold mb-2">✓ Offline Ready</div>
          <div className="text-gray-600">Works without internet connection</div>
        </div>
      </div>

      <div className="space-y-3">
        <Button className="w-full" onClick={() => window.location.href = '/'}>
          Start Building
        </Button>
        <Button variant="outline" className="w-full">
          View Documentation
        </Button>
      </div>
    </div>
  );
};

export const SetupWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState({});
  
  const steps: SetupStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Introduction to AI Dev Workspace',
      component: WelcomeStep,
      required: false
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Setup master passphrase',
      component: SecurityStep,
      required: true
    },
    {
      id: 'providers',
      title: 'AI Providers',
      description: 'Connect your AI accounts',
      component: AIProvidersStep,
      required: false
    },
    {
      id: 'completion',
      title: 'Complete',
      description: 'Setup finished',
      component: CompletionStep,
      required: false
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = (data?: any) => {
    if (data) {
      setSetupData(prev => ({ ...prev, ...data }));
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="text-sm font-medium">
                {steps[currentStep].title}
              </div>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <CurrentStepComponent
            onNext={handleNext}
            onPrevious={handlePrevious}
            data={setupData}
            setData={setSetupData}
          />
        </CardContent>
      </Card>
    </div>
  );
};