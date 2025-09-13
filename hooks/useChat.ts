import { useState, useCallback, useRef, useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ChatMessage } from '../services/types';

interface UseChatOptions {
  projectId?: string;
  agentId?: string;
  autoScroll?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  inputText: string;
  setInputText: (text: string) => void;
  sendMessage: () => Promise<void>;
  clearMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  canSend: boolean;
  messageCount: number;
  scrollToBottom: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { projectId, agentId, autoScroll = true } = options;
  const {
    messages: contextMessages,
    sendMessage: contextSendMessage,
    clearMessages: contextClearMessages,
    refreshMessages: contextRefreshMessages,
    currentProject,
    currentProvider,
    providers,
    isLoading: contextLoading
  } = useWorkspace();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<any>(null);

  // Filter messages for current context
  const messages = contextMessages.filter(msg => {
    if (projectId) return msg.projectId === projectId;
    if (currentProject) return msg.projectId === currentProject.id;
    return !msg.projectId; // Global messages
  });

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const messageContent = inputText.trim();
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Check if we have active providers
      const activeProviders = providers.filter(p => 
        p.status === 'connected' && p.accounts.some(a => a.isActive)
      );

      if (activeProviders.length === 0) {
        throw new Error('No active AI providers available. Please configure at least one provider.');
      }

      const targetProjectId = projectId || currentProject?.id;
      await contextSendMessage(messageContent, targetProjectId, agentId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, projectId, currentProject, agentId, contextSendMessage, providers]);

  const clearMessages = useCallback(async () => {
    try {
      const targetProjectId = projectId || currentProject?.id;
      await contextClearMessages(targetProjectId);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear messages';
      setError(errorMessage);
    }
  }, [projectId, currentProject, contextClearMessages]);

  const refreshMessages = useCallback(async () => {
    try {
      const targetProjectId = projectId || currentProject?.id;
      await contextRefreshMessages(targetProjectId);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh messages';
      setError(errorMessage);
    }
  }, [projectId, currentProject, contextRefreshMessages]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && scrollRef.current.scrollToEnd) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length, autoScroll, scrollToBottom]);

  // Refresh messages when project changes
  useEffect(() => {
    refreshMessages();
  }, [projectId, currentProject?.id]);

  const canSend = inputText.trim().length > 0 && !isLoading && !contextLoading;

  return {
    messages,
    isLoading: isLoading || contextLoading,
    error,
    inputText,
    setInputText,
    sendMessage,
    clearMessages,
    refreshMessages,
    canSend,
    messageCount: messages.length,
    scrollToBottom
  };
}

// Specialized hooks for different chat contexts
export function useProjectChat(projectId: string) {
  return useChat({ projectId });
}

export function useAgentChat(agentId: string, projectId?: string) {
  return useChat({ agentId, projectId });
}

export function useGlobalChat() {
  return useChat({});
}