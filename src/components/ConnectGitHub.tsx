import React, { useState } from 'react';
import { githubAuth } from '@/services/githubAuth';
import { Github, Copy, ExternalLink, CheckCircle, Loader2, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectGitHubProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ConnectGitHub({ onSuccess, onCancel }: ConnectGitHubProps) {
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInitiateFlow = async () => {
    try {
      setError(null);
      const flow = await githubAuth.initiateDeviceFlow();
      
      setDeviceCode(flow.device_code);
      setUserCode(flow.user_code);
      setVerificationUri(flow.verification_uri);
      
      // Generate simple QR code URL (can be replaced with actual QR generation library)
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(flow.verification_uri)}`);
      
      // Start polling
      setIsPolling(true);
      
      try {
        await githubAuth.pollForAccessToken(flow.device_code, flow.interval);
        setIsSuccess(true);
        setIsPolling(false);
        
        // Call success callback after a short delay
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } catch (pollError) {
        setError('Authentication timed out or was cancelled. Please try again.');
        setIsPolling(false);
      }
    } catch (err) {
      setError('Failed to initiate GitHub authentication. Please try again.');
      console.error('GitHub auth error:', err);
    }
  };

  const copyCode = async () => {
    if (userCode) {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openVerificationUrl = () => {
    if (verificationUri) {
      window.open(verificationUri, '_blank', 'width=600,height=700');
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-bold mb-2">Successfully Connected!</h3>
        <p className="text-muted-foreground">
          Your GitHub account has been connected successfully.
        </p>
      </div>
    );
  }

  if (!deviceCode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Github className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">Connect GitHub</h3>
          <p className="text-muted-foreground mb-6">
            Connect your GitHub account to sync repositories, create pull requests, and collaborate with your team.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
            <p className="font-medium">What you'll be able to do:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Clone and sync repositories</li>
              <li>Create and manage pull requests</li>
              <li>Push and pull changes</li>
              <li>View commit history and branches</li>
              <li>Set up webhooks for real-time sync</li>
            </ul>
          </div>

          <Button onClick={handleInitiateFlow} className="w-full" size="lg">
            <Github className="h-5 w-5 mr-2" />
            Connect with GitHub
          </Button>

          {onCancel && (
            <Button onClick={onCancel} variant="outline" className="w-full">
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Github className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-bold mb-2">Authorize GitHub Access</h3>
        <p className="text-muted-foreground">
          Enter the code below on GitHub to complete the connection
        </p>
      </div>

      {/* User Code Display */}
      <div className="bg-card border-2 border-primary rounded-lg p-6 text-center">
        <div className="text-5xl font-bold tracking-widest mb-4 font-mono">
          {userCode}
        </div>
        <Button
          onClick={copyCode}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </>
          )}
        </Button>
      </div>

      {/* QR Code */}
      {qrCodeUrl && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <QrCodeIcon className="h-5 w-5" />
            <p className="font-medium">Or Scan QR Code</p>
          </div>
          <div className="flex justify-center bg-white p-4 rounded">
            <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Scan with your mobile device to open GitHub
          </p>
        </div>
      )}

      {/* Verification URI */}
      <div className="space-y-3">
        <div className="text-sm space-y-2">
          <p className="font-medium">Steps to authorize:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Click the button below to open GitHub</li>
            <li>Enter the code shown above</li>
            <li>Authorize the application</li>
            <li>Come back here - we'll detect it automatically</li>
          </ol>
        </div>

        <Button
          onClick={openVerificationUrl}
          className="w-full"
          size="lg"
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          Open GitHub to Authorize
        </Button>
      </div>

      {/* Polling Status */}
      {isPolling && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            <div>
              <p className="font-medium text-blue-400">Waiting for authorization...</p>
              <p className="text-sm text-blue-200 mt-1">
                Once you authorize on GitHub, we'll automatically complete the connection.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {onCancel && !isPolling && (
        <Button onClick={onCancel} variant="outline" className="w-full">
          Cancel
        </Button>
      )}
    </div>
  );
}
