import type { PendingApproval } from '@/lib/agent';
import type { ChatMessage } from '@/types/presentation';
import { create } from 'zustand';

export interface AgentStep {
  type: 'thinking' | 'tool_call' | 'tool_result';
  content: string;
  toolName?: string;
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingContent: string;
  agentSteps: AgentStep[];
  error: string | null;
  abortController: AbortController | null;
  pendingApproval: PendingApproval | null;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  finalizeStreaming: () => void;
  // Agent step actions
  addAgentStep: (step: Omit<AgentStep, 'timestamp'>) => void;
  clearAgentSteps: () => void;
  // Task cancellation
  setAbortController: (controller: AbortController | null) => void;
  cancelTask: () => void;
  // Approval actions
  setPendingApproval: (approval: PendingApproval | null) => void;
  approveAction: () => void;
  rejectAction: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isLoading: false,
  streamingContent: '',
  agentSteps: [],
  error: null,
  abortController: null,
  pendingApproval: null,

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

  clearMessages: () => set({ messages: [], streamingContent: '', agentSteps: [], error: null }),

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

  addAgentStep: (step) => set((state) => ({
    agentSteps: [
      ...state.agentSteps,
      {
        ...step,
        timestamp: new Date().toISOString(),
      },
    ],
  })),

  clearAgentSteps: () => set({ agentSteps: [] }),

  setAbortController: (abortController) => set({ abortController }),

  cancelTask: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ 
      isLoading: false, 
      abortController: null,
      streamingContent: '',
      agentSteps: [],
      pendingApproval: null,
    });
  },

  setPendingApproval: (pendingApproval) => set({ pendingApproval }),

  approveAction: () => {
    // The ChatInterface will handle resuming the agent with the approved action
    // This just clears the UI state - actual execution happens in ChatInterface
    set({ pendingApproval: null });
  },

  rejectAction: () => {
    set({ 
      pendingApproval: null,
      isLoading: false,
      agentSteps: [],
    });
  },
}));
