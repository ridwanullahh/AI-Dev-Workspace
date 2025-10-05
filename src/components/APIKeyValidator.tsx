import React, { useState } from 'react';
import {
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface APIKeyValidatorProps {
  provider: 'gemini' | 'openai' | 'anthropic' | 'cohere';
  onValidated: (apiKey: string) => void;
}

export function APIKeyValidator({ provider, onValidated }: APIKeyValidatorProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const providerConfig = {
    gemini: {
      name: 'Google Gemini',
      keyPattern: /^AIza[0-9A-Za-z-_]{35}$/,
      testEndpoint: 'https://generativelanguage.googleapis.com/v1/models?key=',
      icon: '🔷'
    },
    openai: {
      name: 'OpenAI',
      keyPattern: /^sk-[A-Za-z0-9]{48}$/,
      testEndpoint: 'https://api.openai.com/v1/models',
      icon: '🤖'
    },
    anthropic: {
      name: 'Anthropic (Claude)',
      keyPattern: /^sk-ant-[A-Za-z0-9-_]{95}$/,
      testEndpoint: 'https://api.anthropic.com/v1/models',
      icon: '🎭'
    },
    cohere: {
      name: 'Cohere',
      keyPattern: /^[A-Za-z0-9]{40}$/,
      testEndpoint: 'https://api.cohere.ai/v1/models',
      icon: '🌟'
    }
  };

  const config = providerConfig[provider];

  const validateAPIKey = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      // First check format
      if (!config.keyPattern.test(apiKey)) {
        setValidationResult({
          isValid: false,
          message: 'Invalid API key format'
        });
        return;
      }

      // Test API connection
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (provider === 'openai') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (provider === 'cohere') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const endpoint = provider === 'gemini' 
        ? `${config.testEndpoint}${apiKey}`
        : config.testEndpoint;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult({
          isValid: true,
          message: 'API key is valid!',
          details: data
        });
        onValidated(apiKey);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setValidationResult({
          isValid: false,
          message: errorData.error?.message || 'Invalid API key or insufficient permissions'
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: error instanceof Error ? error.message : 'Failed to validate API key'
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{config.icon}</span>
        <div>
          <h3 className="font-semibold">{config.name}</h3>
          <p className="text-sm text-muted-foreground">Validate your API key</p>
        </div>
      </div>

      {/* API Key Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">API Key</label>
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${config.name} API key`}
            className="pr-10 font-mono text-sm"
            disabled={isValidating}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your API key will be encrypted and stored securely in your local browser
        </p>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div
          className={`p-4 rounded-lg border ${
            validationResult.isValid
              ? 'bg-green-900/20 border-green-700'
              : 'bg-red-900/20 border-red-700'
          }`}
        >
          <div className="flex items-start gap-3">
            {validationResult.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-medium ${
                  validationResult.isValid ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {validationResult.message}
              </p>
              {validationResult.details && (
                <div className="mt-2 text-xs">
                  <p className="text-muted-foreground">Available models:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {validationResult.details.data?.slice(0, 5).map((model: any) => (
                      <Badge key={model.id} variant="outline" className="text-xs">
                        {model.id}
                      </Badge>
                    ))}
                    {validationResult.details.data?.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{validationResult.details.data.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Format Guidelines */}
      <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4" />
          <span>API Key Format</span>
        </div>
        <p className="text-muted-foreground">
          {provider === 'gemini' && 'Should start with "AIza" and be 40 characters long'}
          {provider === 'openai' && 'Should start with "sk-" and be 51 characters long'}
          {provider === 'anthropic' && 'Should start with "sk-ant-" and be ~100 characters long'}
          {provider === 'cohere' && 'Should be a 40-character alphanumeric string'}
        </p>
      </div>

      {/* Validate Button */}
      <Button
        onClick={validateAPIKey}
        disabled={!apiKey || isValidating || validationResult?.isValid}
        className="w-full"
      >
        {isValidating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Validating...
          </>
        ) : validationResult?.isValid ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Validated
          </>
        ) : (
          <>
            <Key className="h-4 w-4 mr-2" />
            Validate API Key
          </>
        )}
      </Button>
    </div>
  );
}
