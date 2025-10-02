import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Download, X } from 'lucide-react';

export const UpdatePrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowPrompt(true);
      });

      // Check for waiting service worker
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration?.waiting) {
          setShowPrompt(true);
        }
      });
    }
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    
    // Wait a moment then reload
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900">
                Update Available
              </h4>
              <p className="text-xs text-blue-700 mt-1">
                A new version of AI Dev Workspace is ready to install.
              </p>
              <div className="flex space-x-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="text-xs"
                >
                  {isUpdating ? 'Updating...' : 'Update Now'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  Later
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};