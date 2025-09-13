import React, { useState, useEffect } from 'react'
import { Brain, Zap, Shield } from 'lucide-react'

export function SplashScreen() {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          setIsLoading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)

    return () => clearInterval(timer)
  }, [])

  if (!isLoading) return null

  return (
    <div className="mobile-container flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-8">
        {/* Logo Animation */}
        <div className="relative">
          <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mx-auto relative overflow-hidden">
            <Brain className="w-12 h-12 text-primary-foreground relative z-10" />
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/40 animate-pulse" />
            <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 animate-pulse" />
          </div>
          
          {/* Floating icons */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-bounce">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce" style={{ animationDelay: '0.2s' }}>
            <Shield className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AI Dev Workspace
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Mobile-first AI development workspace with autonomous agents
          </p>
        </div>

        {/* Loading Progress */}
        <div className="space-y-3">
          <div className="w-48 h-2 bg-muted rounded-full overflow-hidden mx-auto">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Initializing workspace... {progress}%
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
          <div className="text-center space-y-1">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">AI Agents</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Fast</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Secure</p>
          </div>
        </div>

        {/* Loading Dots Animation */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}