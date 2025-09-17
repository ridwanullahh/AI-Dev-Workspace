import React, { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { contextManagementSystem } from '@/services/contextManager'
import {
  MessageSquare,
  Send,
  Paperclip,
  Mic,
  StopCircle,
  Bot,
  User,
  Clock,
  Copy,
  Trash2,
  MoreVertical,
  Brain,
  BrainCircuit
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ChatInterfaceProps {
  projectId?: string
  agentId?: string
  placeholder?: string
  showHeader?: boolean
  className?: string
}

export function ChatInterface({ 
  projectId, 
  agentId, 
  placeholder = "Type your message...",
  showHeader = true,
  className = ""
}: ChatInterfaceProps) {
  const {
    messages,
    isLoading,
    error,
    currentProvider,
    streamingMessage,
    isStreaming,
    sendMessage,
    clearMessages,
    setProvider
  } = useChatStore()
  
  const { currentProject, providers } = useWorkspaceStore()
  
  const [inputMessage, setInputMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [showActions, setShowActions] = useState<string | null>(null)
  const [useContext, setUseContext] = useState(true)
  const [isRetrievingContext, setIsRetrievingContext] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Filter messages based on projectId and agentId
  const filteredMessages = messages.filter(msg => {
    if (projectId && msg.projectId !== projectId) return false
    if (agentId && msg.agentId !== agentId) return false
    return true
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredMessages, streamingMessage])

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading || isStreaming) return

    try {
      let enhancedMessage = inputMessage.trim()

      if (useContext && projectId) {
        setIsRetrievingContext(true)

        try {
          // Get or create context window
          let contextId = `context_${projectId}_${agentId || 'general'}`
          let contextWindow = await contextManagementSystem.getContextWindow(contextId)

          if (!contextWindow) {
            contextId = await contextManagementSystem.createContextWindow(projectId, agentId || 'general')
          }

          // Add current messages to context
          for (const msg of filteredMessages.slice(-10)) { // Last 10 messages
            await contextManagementSystem.addMessage(contextId, msg)
          }

          // Retrieve optimized context
          const optimizedContext = await contextManagementSystem.getOptimizedContext(contextId, {
            query: enhancedMessage,
            maxTokens: 1000,
            minRelevance: 0.3
          })

          if (optimizedContext.totalTokens > 0) {
            // Format context for the prompt
            const contextText = [
              ...optimizedContext.memories.map(m => `Memory: ${m.content}`),
              ...optimizedContext.knowledgeNodes.map(k => `Knowledge: ${k.content}`),
              ...optimizedContext.messages.slice(-3).map(m => `${m.role}: ${m.content}`) // Last 3 messages
            ].join('\n\n')

            enhancedMessage = `Context from previous interactions:\n${contextText}\n\nCurrent query: ${enhancedMessage}`
          }
        } catch (error) {
          console.error('Failed to retrieve context:', error)
          // Continue without context
        } finally {
          setIsRetrievingContext(false)
        }
      }

      await sendMessage(enhancedMessage, projectId, agentId)
      setInputMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsRetrievingContext(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleDeleteMessage = async (messageId: string) => {
    // This would be implemented in the chat store
    console.log('Delete message:', messageId)
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // In a real implementation, this would start/stop voice recording
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'text-blue-500'
      case 'openai': return 'text-green-500'
      case 'claude': return 'text-purple-500'
      case 'cohere': return 'text-orange-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className={`flex flex-col h-full bg-card rounded-lg border border-border ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">
                  {currentProject ? `Chat - ${currentProject.name}` : 'Workspace Chat'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {agentId ? `Agent: ${agentId}` : 'General conversation'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Provider Selector */}
            <select
              value={currentProvider}
              onChange={(e) => setProvider(e.target.value)}
              className="px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            
            <Button
              variant={useContext ? "default" : "ghost"}
              size="icon"
              onClick={() => setUseContext(!useContext)}
              title={useContext ? "Disable context enhancement" : "Enable context enhancement"}
              className={useContext ? "bg-blue-500 text-white hover:bg-blue-600" : ""}
            >
              {isRetrievingContext ? (
                <BrainCircuit className="h-4 w-4 animate-pulse" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => clearMessages()}
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a conversation with your AI assistant
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>💡 Ask for help with your project</p>
              <p>🔍 Get code suggestions and reviews</p>
              <p>📊 Analyze your project structure</p>
            </div>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 group ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
              onMouseEnter={() => setShowActions(message.id)}
              onMouseLeave={() => setShowActions(null)}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 ${
                message.role === 'user' ? 'order-2' : 'order-1'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className={`max-w-[70%] ${
                message.role === 'user' ? 'order-1' : 'order-2'
              }`}>
                <div
                  className={`relative p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {/* Message Actions */}
                  {showActions === message.id && (
                    <div className={`absolute -top-2 ${
                      message.role === 'user' ? 'left-0' : 'right-0'
                    } flex gap-1`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 bg-background border border-border"
                        onClick={() => handleCopyMessage(message.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 bg-background border border-border"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Message Text */}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {/* Message Metadata */}
                  <div className={`flex items-center gap-2 mt-2 text-xs ${
                    message.role === 'user' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground/70'
                  }`}>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(message.timestamp)}</span>
                    </div>
                    {message.metadata?.provider && (
                      <div className="flex items-center gap-1">
                        <span className={getProviderColor(message.metadata.provider)}>
                          ●
                        </span>
                        <span>{message.metadata.provider}</span>
                      </div>
                    )}
                    {message.metadata?.tokens && (
                      <span>{message.metadata.tokens} tokens</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Streaming Message */}
        {isStreaming && streamingMessage && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                <Bot className="h-4 w-4" />
              </div>
            </div>
            <div className="max-w-[70%]">
              <div className="p-3 rounded-2xl bg-muted text-muted-foreground">
                <div className="text-sm whitespace-pre-wrap">
                  {streamingMessage}
                </div>
                <div className="flex gap-1 mt-2">
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2 items-end">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            className="touch-target"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              rows={1}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              disabled={isLoading || isStreaming}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>

          {/* Voice/Record Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRecording}
            className={`touch-target ${isRecording ? 'text-red-500' : ''}`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {isRecording ? (
              <StopCircle className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isLoading || isStreaming}
            size="icon"
            className="touch-target bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Recording... Click stop button when finished</span>
          </div>
        )}

        {/* Input Suggestions */}
        {inputMessage.length === 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {[
              "Help me debug this code",
              "Explain this concept",
              "Suggest improvements",
              "Generate documentation"
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="ghost"
                size="sm"
                onClick={() => setInputMessage(suggestion)}
                className="text-xs h-6"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}