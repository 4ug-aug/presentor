import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { getModel, SLIDE_SYSTEM_PROMPT } from '@/lib/ai-service';
import { slideTools } from '@/lib/slide-tools';
import { cn } from '@/lib/utils';
import { useChatStore, usePresentationStore, useSettingsStore } from '@/stores';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Loader2, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, isLoading, streamingContent, addMessage, setLoading, setStreamingContent, setError } = useChatStore();
  const { config, isConfigured } = useSettingsStore();
  const { presentation, currentSlideIndex, addSlide, updateSlide, deleteSlide } = usePresentationStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const executeToolByName = (name: string, args: Record<string, unknown>): string => {
    switch (name) {
      case 'create_slide':
        addSlide({ html: args.html as string, notes: args.notes as string | undefined });
        return 'Created new slide';
      case 'update_slide':
        updateSlide(args.slideIndex as number, { html: args.html as string, notes: args.notes as string | undefined });
        return `Updated slide ${(args.slideIndex as number) + 1}`;
      case 'delete_slide':
        deleteSlide(args.slideIndex as number);
        return `Deleted slide ${(args.slideIndex as number) + 1}`;
      case 'get_slide_info':
        const idx = (args.slideIndex as number | undefined) ?? currentSlideIndex;
        const slide = presentation?.slides[idx];
        if (!slide) return 'Slide not found';
        return JSON.stringify({ index: idx, html: slide.html, notes: slide.notes });
      default:
        return 'Unknown action';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setLoading(true);
    setStreamingContent('');

    try {
      const model = getModel(config);
      
      // Build context about current presentation with current slide content
      const currentSlide = presentation?.slides[currentSlideIndex];
      const context = presentation 
        ? `Current presentation: "${presentation.meta.title}" with ${presentation.slides.length} slides.
Current slide index: ${currentSlideIndex}.

Current slide HTML:
\`\`\`html
${currentSlide?.html ?? 'No slide content'}
\`\`\`
${currentSlide?.notes ? `Speaker notes: ${currentSlide.notes}` : ''}`
        : 'No presentation loaded. User should create a new one first.';

      // Try to use tools if model supports it
      let response;
      try {
        const modelWithTools = model.bindTools?.(slideTools);
        if (modelWithTools) {
          response = await modelWithTools.invoke([
            new SystemMessage(SLIDE_SYSTEM_PROMPT + '\n\n' + context),
            new HumanMessage(userMessage),
          ]);
        } else {
          response = await model.invoke([
            new SystemMessage(SLIDE_SYSTEM_PROMPT + '\n\n' + context),
            new HumanMessage(userMessage),
          ]);
        }
      } catch {
        // Fallback to regular invocation
        response = await model.invoke([
          new SystemMessage(SLIDE_SYSTEM_PROMPT + '\n\n' + context),
          new HumanMessage(userMessage),
        ]);
      }

      // Check if the model wants to call tools
      const toolCalls = (response as { tool_calls?: Array<{ name: string; args: Record<string, unknown> }> }).tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const results: string[] = [];
        
        for (const toolCall of toolCalls) {
          try {
            // Execute the tool based on name
            const toolResult = await executeToolByName(toolCall.name, toolCall.args);
            results.push(`${toolCall.name}: ${toolResult}`);
          } catch (err) {
            results.push(`${toolCall.name}: Error - ${err}`);
          }
        }

        const content = typeof response.content === 'string' && response.content
          ? response.content + '\n\n' + results.join('\n')
          : results.join('\n');
        
        addMessage({ role: 'assistant', content });
      } else {
        // No tool calls, just a regular response
        const content = typeof response.content === 'string' 
          ? response.content 
          : JSON.stringify(response.content);

        addMessage({ role: 'assistant', content });

        // Fallback: If response contains HTML slide, add it
        if (content.includes('<section') && content.includes('class="slide"')) {
          addSlide({ html: content });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide">
          AI Director
        </span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 max-h-full" ref={scrollRef}>
        <div className="space-y-3 p-3">
          {messages.length === 0 && !isLoading && (
            <div className="py-8 text-center text-xs">
              {isConfigured 
                ? "Describe the slide you want to create" 
                : "Configure AI settings to get started"}
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded px-3 py-2 text-sm",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              <pre className="max-h-[200px] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {message.content}
              </pre>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Generating...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConfigured ? "Create a title slide about..." : "Configure AI first"}
            disabled={!isConfigured || isLoading}
            className="resize-none text-sm placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!isConfigured || isLoading || !input.trim()}
            className="h-[60px] w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
