import type { AIConfig, LLMProvider } from '@/types/presentation';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  config: AIConfig;
  isConfigured: boolean;
  storageDirectory: string | null;
  isOnboarded: boolean;
  
  // Actions
  setProvider: (provider: LLMProvider) => void;
  setApiKey: (apiKey: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setModelName: (modelName: string) => void;
  updateConfig: (config: Partial<AIConfig>) => void;
  resetConfig: () => void;
  setStorageDirectory: (dir: string) => void;
  completeOnboarding: () => void;
}

const defaultConfig: AIConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  modelName: 'gpt-5-mini',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      isConfigured: false,
      storageDirectory: null,
      isOnboarded: false,

      setProvider: (provider) => {
        const { config } = get();
        const newConfig = { ...config, provider };
        
        // Set default base URLs for local providers
        if (provider === 'ollama') {
          newConfig.baseUrl = 'http://localhost:11434';
          newConfig.modelName = 'llama3.2';
        } else if (provider === 'vllm') {
          newConfig.baseUrl = 'http://localhost:8000/v1';
          newConfig.modelName = 'custom-model';
        } else if (provider === 'openai') {
          newConfig.baseUrl = '';
          newConfig.modelName = 'gpt-5-mini';
        } else if (provider === 'google') {
          newConfig.baseUrl = '';
          newConfig.modelName = 'gemini-1.5-flash';
        }
        
        set({ config: newConfig });
      },

      setApiKey: (apiKey) => set((state) => ({
        config: { ...state.config, apiKey },
        isConfigured: apiKey.length > 0 || ['ollama', 'vllm'].includes(state.config.provider),
      })),

      setBaseUrl: (baseUrl) => set((state) => ({
        config: { ...state.config, baseUrl },
      })),

      setModelName: (modelName) => set((state) => ({
        config: { ...state.config, modelName },
      })),

      updateConfig: (updates) => set((state) => {
        const newConfig = { ...state.config, ...updates };
        const isConfigured = 
          (newConfig.apiKey && newConfig.apiKey.length > 0) || 
          ['ollama', 'vllm'].includes(newConfig.provider);
        return { config: newConfig, isConfigured };
      }),

      resetConfig: () => set({ config: defaultConfig, isConfigured: false }),

      setStorageDirectory: (dir) => set({ storageDirectory: dir }),

      completeOnboarding: () => set({ isOnboarded: true }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
