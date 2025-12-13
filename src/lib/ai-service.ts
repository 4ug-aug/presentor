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

CRITICAL: When updating slides, you MUST preserve existing content unless explicitly asked to replace it.
- If user asks to "add" something, include ALL existing elements plus the new content
- If user asks to "change" or "edit" something specific, modify only that element while keeping everything else
- Only create completely fresh content if user explicitly asks to "replace" or "make a new slide about"
- Always reference the current slide HTML provided in the context before making changes

SLIDE LAYOUTS - Use these templates:

1. TITLE SLIDE (for openings, section breaks, hero content):
<section class="slide slide-content slide-title">
  <h1>Main Title</h1>
  <p>Subtitle or tagline</p>
</section>

2. CONTENT SLIDE (for most slides with information):
<section class="slide slide-content slide-content-layout">
  <div class="slide-header">
    <h2>Slide Title</h2>
    <p>Optional description or context</p>
  </div>
  <div class="slide-body">
    <ul>
      <li>Key point one</li>
      <li>Key point two</li>
    </ul>
  </div>
</section>

Guidelines:
- Use slide-title for opening slides, transitions, or when content should be centered
- Use slide-content-layout for informational slides with bullets, paragraphs, or structured content
- Keep text concise and impactful - presentations should be scannable
- Always include the slide-content class for proper styling

Always use the tools to make changes. Respond conversationally to explain what you did.`;

export const requiresApiKey = (provider: LLMProvider): boolean => {
  return provider === 'openai' || provider === 'google';
};

export const requiresBaseUrl = (provider: LLMProvider): boolean => {
  return provider === 'ollama' || provider === 'vllm';
};
