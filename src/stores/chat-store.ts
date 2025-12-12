import type { ChatMessage } from '@/types/presentation';
import { create } from 'zustand';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingContent: string;
  error: string | null;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  finalizeStreaming: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isLoading: false,
  streamingContent: '',
  error: null,

  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    ],
    error: null,
  })),

  updateLastAssistantMessage: (content) => set((state) => {
    const messages = [...state.messages];
    const lastIndex = messages.length - 1;
    if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
      messages[lastIndex] = { ...messages[lastIndex], content };
    }
    return { messages };
  }),

  setLoading: (isLoading) => set({ isLoading }),

  setStreamingContent: (streamingContent) => set({ streamingContent }),

  appendStreamingContent: (chunk) => set((state) => ({
    streamingContent: state.streamingContent + chunk,
  })),

  setError: (error) => set({ error, isLoading: false }),

  clearMessages: () => set({ messages: [], streamingContent: '', error: null }),

  finalizeStreaming: () => {
    const { streamingContent } = get();
    if (streamingContent) {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: streamingContent,
            timestamp: new Date().toISOString(),
          },
        ],
        streamingContent: '',
        isLoading: false,
      }));
    }
  },
}));
