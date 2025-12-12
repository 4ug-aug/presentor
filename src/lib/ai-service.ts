import type { AIConfig, LLMProvider } from '@/types/presentation';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';

export const getModel = (config: AIConfig): BaseChatModel => {
  switch (config.provider) {
    case 'openai':
      return new ChatOpenAI({
        apiKey: config.apiKey,
        model: config.modelName,
      });
    case 'ollama':
      return new ChatOllama({
        baseUrl: config.baseUrl || 'http://localhost:11434',
        model: config.modelName,
      });
    case 'google':
      return new ChatGoogleGenerativeAI({
        apiKey: config.apiKey,
        model: config.modelName,
      });
    case 'vllm':
      // vLLM uses OpenAI-compatible API
      return new ChatOpenAI({
        configuration: { baseURL: config.baseUrl },
        apiKey: config.apiKey || 'dummy',
        model: config.modelName,
      });
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
};

export const SLIDE_SYSTEM_PROMPT = `You are a presentation designer assistant. You help users create and edit slides using the available tools.

Available tools:
- create_slide: Create a new slide with HTML content
- update_slide: Update an existing slide by index
- delete_slide: Delete a slide by index
- get_slide_info: Get information about a slide

When creating slides, use clean semantic HTML:
- Wrap content in <section class="slide">
- Use h1 for titles, h2 for subtitles, p for text, ul/li for lists
- Keep text concise and impactful

Always use the tools to make changes. Respond conversationally to explain what you did.`;

export const requiresApiKey = (provider: LLMProvider): boolean => {
  return provider === 'openai' || provider === 'google';
};

export const requiresBaseUrl = (provider: LLMProvider): boolean => {
  return provider === 'ollama' || provider === 'vllm';
};
