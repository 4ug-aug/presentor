export interface Slide {
  id: string;
  html: string;
  notes?: string;
}

export interface PresentationMeta {
  title: string;
  createdAt: string;
  updatedAt: string;
  theme: 'dark-corporate' | 'light-minimal' | 'gradient-modern';
}

export interface Presentation {
  meta: PresentationMeta;
  slides: Slide[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type LLMProvider = 'openai' | 'ollama' | 'google' | 'vllm';

export interface AIConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  modelName: string;
}

export const DEFAULT_MODELS: Record<LLMProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  ollama: ['qwen3:4b'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
  vllm: ['qwen3:4b'],
};

export const DEFAULT_BASE_URLS: Partial<Record<LLMProvider, string>> = {
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1',
  ollama: 'http://localhost:11434',
  vllm: 'http://localhost:8000/v1',
};
