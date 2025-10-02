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
  finishStreaming: () => void;
  simulateAIResponse: (request: AIRequest, userMessage: ChatMessage, agentId?: string) => Promise<void>;
}

export const useChatStore = create<ChatState & ChatActions>()(
  devtools(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,
      currentProvider: 'gemini',
      streamingMessage: null,
      isStreaming: false,

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
            timestamp: new Date(),
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
                role: 'system' as const,
                content: 'You are an AI development assistant. Help the user with their coding and development tasks.'
              },
              ...get().messages.map(msg => ({
                role: msg.role as 'system' | 'user' | 'assistant',
                content: msg.content
              })),
              {
                role: 'user' as const,
                content
              }
            ],
            model: 'gemini-pro',
            temperature: 0.7,
            maxTokens: 4096,
            provider: get().currentProvider
          }

          // Simulate AI response (in real implementation, this would call AI provider)
          await get().simulateAIResponse(request, userMessage, agentId)
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
          set({ error: errorMessage, isLoading: false, isStreaming: false })
          throw error
        }
      },

      // Real AI response with streaming
      simulateAIResponse: async (request: AIRequest, userMessage: ChatMessage, agentId?: string) => {
        const { addMessage } = useWorkspaceStore.getState()
        
        try {
          const { enhancedAIProvider } = await import('../services/enhancedAIProvider')
          
          let fullContent = ''
          let responseData: any = null
          
          // Use real streaming API
          await enhancedAIProvider.sendMessageStream(
            request,
            (token: string) => {
              fullContent += token
              get().updateStreamingMessage(fullContent)
            },
            (response: any) => {
              responseData = response
            },
            (error: Error) => {
              throw error
            }
          )
          
          // Create AI response message
          const aiMessage: ChatMessage = {
            id: `msg_${Date.now()}_ai`,
            content: fullContent,
            role: 'assistant' as const,
            agentId,
            projectId: userMessage.projectId,
            timestamp: new Date(),
            metadata: {
              model: responseData?.model || request.model,
              provider: responseData?.provider || get().currentProvider,
              tokens: responseData?.usage?.totalTokens || 0,
              cost: responseData?.cost || 0
            }
          }

          // Save to database
          const { db } = await import('../database/schema')
          await db.chats.add(aiMessage)

          // Add AI message to store
          addMessage(aiMessage)
          set((state) => ({
            messages: [...state.messages, aiMessage],
            isLoading: false,
            isStreaming: false,
            streamingMessage: null
          }))
        } catch (error) {
          console.error('Failed to get AI response:', error)
          
          // Fallback to mock response
          const mockResponse = "I'm having trouble connecting to the AI service. Please check your API configuration."
          
          const aiMessage: ChatMessage = {
            id: `msg_${Date.now()}_ai`,
            content: mockResponse,
            role: 'assistant' as const,
            agentId,
            projectId: userMessage.projectId,
            timestamp: new Date(),
            metadata: {
              model: request.model,
              provider: get().currentProvider,
              tokens: 0,
              cost: 0
            }
          }

          const { db } = await import('../database/schema')
          await db.chats.add(aiMessage)

          addMessage(aiMessage)
          set((state) => ({
            messages: [...state.messages, aiMessage],
            isLoading: false,
            isStreaming: false,
            streamingMessage: null
          }))
        }
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