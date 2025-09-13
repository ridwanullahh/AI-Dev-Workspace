import React from 'react'
import { Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function AgentsPage() {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <p className="text-muted-foreground">
          Manage and configure your AI development agents
        </p>
      </div>

      <div className="text-center py-12">
        <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Agents Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Advanced AI agents will be available in the next update
        </p>
        <Badge variant="outline">Phase 2 Feature</Badge>
      </div>
    </div>
  )
}