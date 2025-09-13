import React from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function SettingsPage() {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your workspace and preferences
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-2">AI Providers</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Manage your AI service provider accounts
          </p>
          <Button variant="outline" size="sm">
            Configure Providers
          </Button>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-2">Appearance</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Customize the look and feel of your workspace
          </p>
          <Button variant="outline" size="sm">
            Theme Settings
          </Button>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-2">Data & Storage</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Manage your local data and storage settings
          </p>
          <Button variant="outline" size="sm">
            Storage Settings
          </Button>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-2">About</h3>
          <div className="space-y-2 text-sm">
            <p><strong>AI Dev Workspace</strong></p>
            <p>Version: 1.0.0</p>
            <p>Mobile-first AI development workspace</p>
          </div>
        </div>
      </div>
    </div>
  )
}