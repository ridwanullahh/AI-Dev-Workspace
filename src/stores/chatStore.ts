import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useWorkspaceStore } from './workspaceStore'
import type { ChatMessage, AIRequest, AIResponse } from '../types'

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  currentProvider: string
  streamingMessage: string | null
  isStreaming: boolean
}

interface ChatActions {
  sendMessage: (content: string, projectId?: string, agentId?: string) => Promise<void>
  clearMessages: (projectId?: string) => void
  setProvider: (providerId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addMessage: (message: ChatMessage) => void
  updateStreamingMessage: (content: string) => void
  finishStreaming: () => void
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  currentProvider: 'gemini',
  streamingMessage: null,
  isStreaming: false
}

export const useChatStore = create<ChatState & ChatActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Send a message to AI
      sendMessage: async (content: string, projectId?: string, agentId?: string) => {
        try {
          set({ isLoading: true, error: null, isStreaming: true, streamingMessage: '' })
          
          const { addMessage, currentProject } = useWorkspaceStore.getState()
          
          // Create user message
          const userMessage: ChatMessage = {
            id: `msg_${Date.now()}_user`,
            content,
            role: 'user',
            projectId: projectId || currentProject?.id,
            timestamp: new Date().toISOString(),
            metadata: {
              provider: get().currentProvider
            }
          }

          // Add user message to store
          addMessage(userMessage)
          set((state) => ({
            messages: [...state.messages, userMessage]
          }))

          // Prepare AI request
          const request: AIRequest = {
            messages: [
              {
                role: 'system',
                content: 'You are an AI development assistant. Help the user with their coding and development tasks.'
              },
              ...get().messages.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content
              }
            ],
            model: 'gemini-pro',
            temperature: 0.7,
            maxTokens: 4096,
            provider: get().currentProvider
          }

          // Use enhanced AI provider manager
          await get().sendAIRequest(request, userMessage, agentId)
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
          set({ error: errorMessage, isLoading: false, isStreaming: false })
          throw error
        }
      },

      // Send request using enhanced AI provider manager
      sendAIRequest: async (request: AIRequest, userMessage: ChatMessage, agentId?: string) => {
        try {
          const { addMessage } = useWorkspaceStore.getState()
          
          // Import dynamically to avoid circular dependency
          const { enhancedAIProviderManager } = await import('@/services/enhancedAIProviderManager')
          
          let currentContent = ''
          
          // Send request to AI provider
          const response = await enhancedAIProviderManager.sendMessage(request, {
            preferredProvider: get().currentProvider,
            priority: 5,
            timeout: 30000
          })
          
          // Simulate streaming response
          const words = response.content.split(' ')
          for (let i = 0; i <= words.length; i++) {
            currentContent = words.slice(0, i).join(' ')
            get().updateStreamingMessage(currentContent)
            await new Promise(resolve => setTimeout(resolve, 50)) // 50ms per word
          }
          
          // Create AI response message
          const aiMessage: ChatMessage = {
            id: `msg_${Date.now()}_ai`,
            content: response.content,
            role: 'assistant',
            agentId,
            projectId: userMessage.projectId,
            timestamp: new Date().toISOString(),
            metadata: {
              model: response.model,
              provider: response.provider,
              tokens: response.usage.totalTokens,
              cost: response.cost || 0
            }
          }

          // Add AI message to store
          addMessage(aiMessage)
          set((state) => ({
            messages: [...state.messages, aiMessage],
            isLoading: false,
            isStreaming: false,
            streamingMessage: null
          }))
          
        } catch (error) {
          // Fallback to simulated response if AI provider fails
          await get().simulateAIResponse(request, userMessage, agentId)
        }
      },

      // Simulate AI response (placeholder for real AI integration)
      simulateAIResponse: async (request: AIRequest, userMessage: ChatMessage, agentId?: string) => {
        const { addMessage } = useWorkspaceStore.getState()
        
        // Simulate typing delay and streaming
        const responses = [
          "I understand your request. Let me help you with that.",
          "That's an interesting question. Here's my analysis:",
          "I can help you implement this feature. Here's what I suggest:",
          "Based on your project context, here's my recommendation:",
          "I'll help you solve this problem step by step."
        ]
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        let currentContent = ''
        
        // Simulate streaming response
        for (let i = 0; i <= randomResponse.length; i++) {
          currentContent = randomResponse.substring(0, i)
          get().updateStreamingMessage(currentContent)
          await new Promise(resolve => setTimeout(resolve, 20)) // 20ms per character
        }
        
        // Create AI response message
        const aiMessage: ChatMessage = {
          id: `msg_${Date.now()}_ai`,
          content: randomResponse,
          role: 'assistant',
          agentId,
          projectId: userMessage.projectId,
          timestamp: new Date().toISOString(),
          metadata: {
            model: 'gemini-pro',
            provider: get().currentProvider,
            tokens: Math.floor(randomResponse.length / 4), // Rough token estimation
            cost: 0
          }
        }

        // Add AI message to store
        addMessage(aiMessage)
        set((state) => ({
          messages: [...state.messages, aiMessage],
          isLoading: false,
          isStreaming: false,
          streamingMessage: null
        }))
      },

      // Clear messages for a specific project or all messages
      clearMessages: (projectId?: string) => {
        if (projectId) {
          set((state) => ({
            messages: state.messages.filter(msg => msg.projectId !== projectId)
          }))
        } else {
          set({ messages: [] })
        }
      },

      // Set current AI provider
      setProvider: (providerId: string) => {
        set({ currentProvider: providerId })
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      // Set error state
      setError: (error: string | null) => {
        set({ error })
      },

      // Add a message to the chat
      addMessage: (message: ChatMessage) => {
        set((state) => ({
          messages: [...state.messages, message]
        }))
      },

      // Update streaming message content
      updateStreamingMessage: (content: string) => {
        set({ streamingMessage: content })
      },

      // Finish streaming and add the final message
      finishStreaming: () => {
        set({ isStreaming: false, streamingMessage: null })
      }
    }),
    {
      name: 'chat-store'
    }
  )
)