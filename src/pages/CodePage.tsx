import React from 'react'
import { Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function CodePage() {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Code Editor</h1>
        <p className="text-muted-foreground">
          Built-in development environment with Monaco Editor
        </p>
      </div>

      <div className="text-center py-12">
        <Code className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Code Editor Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Full-featured code editor will be available in Phase 4
        </p>
        <Badge variant="outline">Phase 4 Feature</Badge>
      </div>
    </div>
  )
}

export default CodePage;