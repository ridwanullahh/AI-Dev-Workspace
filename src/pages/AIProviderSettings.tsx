// Force rebuild
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { db } from '@/database/schema';
import type { Account } from '@/database/schema';
import { oauthService } from '@/services/oauth';
import { Plus, Trash2 } from 'lucide-react';

export function AIProviderSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    const allAccounts = await db.accounts.toArray();
    setAccounts(allAccounts);
    setIsLoading(false);
  };

  const handleAddAccount = (providerId: 'gemini' | 'openai') => {
    const authUrl = oauthService.createAuthorizationUrl(providerId);
    window.location.href = authUrl;
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      await db.accounts.delete(accountId);
      loadAccounts();
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AI Provider Accounts</h1>
      <div className="space-y-4">
        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Google AI (Gemini)</h2>
          <Button onClick={() => handleAddAccount('gemini')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Gemini Account
          </Button>
        </div>
        {/* Add other providers like OpenAI here */}
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Connected Accounts</h2>
      {isLoading ? (
        <p>Loading accounts...</p>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => (
            <div key={account.id} className="bg-card border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{account.name} ({account.email})</p>
                <p className="text-sm text-muted-foreground">Provider: {account.providerId}</p>
              </div>
              <Button variant="destructive" size="icon" onClick={() => handleDeleteAccount(account.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}