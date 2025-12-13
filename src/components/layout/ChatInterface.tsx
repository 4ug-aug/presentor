import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { streamSlideAgent } from '@/lib/agent';
import { cn } from '@/lib/utils';
import { useChatStore, usePresentationStore, useSettingsStore } from '@/stores';
import { useImageStore } from '@/stores/image-store';
import { convertFileSrc } from '@tauri-apps/api/core';
import { CheckCircle, Loader2, Send, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    agentSteps,
    addMessage, 
    setLoading, 
    setError,
    addAgentStep,
    clearAgentSteps,
  } = useChatStore();
  const { config, isConfigured, storageDirectory } = useSettingsStore();
  const { presentation, currentSlideIndex, addSlide, updateSlide, deleteSlide } = usePresentationStore();
  const { loadImages } = useImageStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentSteps]);

  // Tool executor that handles all tool calls
  const executeToolByName = async (name: string, args: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'create_slide':
        addSlide({ html: args.html as string, notes: args.notes as string | undefined });
        return 'Created new slide successfully';
      case 'update_slide':
        updateSlide(args.slideIndex as number, { html: args.html as string, notes: args.notes as string | undefined });
        return `Updated slide ${(args.slideIndex as number) + 1} successfully`;
      case 'delete_slide':
        deleteSlide(args.slideIndex as number);
        return `Deleted slide ${(args.slideIndex as number) + 1} successfully`;
      case 'get_slide_info':
        const idx = (args.slideIndex as number | undefined) ?? currentSlideIndex;
        const slide = presentation?.slides[idx];
        if (!slide) return 'Slide not found';
        return JSON.stringify({ index: idx, html: slide.html, notes: slide.notes });
      case 'list_available_images':
        // Reload images to ensure we have the latest
        if (storageDirectory) {
          await loadImages(storageDirectory);
        }
        const currentImages = useImageStore.getState().images;
        const imageList = currentImages.map(img => ({
          name: img.name,
          url: convertFileSrc(img.path),
        }));
        if (imageList.length === 0) {
          return 'No images available in the library. The user should upload images via the Image Library button (image icon) in the sidebar before you can use them.';
        }
        return JSON.stringify(imageList);
      default:
        return `Unknown tool: ${name}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setLoading(true);
    clearAgentSteps();

    try {
      // Build context about current presentation
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

      // Run the agent with streaming callbacks
      const finalResponse = await streamSlideAgent(
        config,
        context,
        userMessage,
        executeToolByName,
        {
          onToolCall: (toolName, _args) => {
            addAgentStep({
              type: 'tool_call',
              content: `Calling ${toolName}...`,
              toolName,
            });
          },
          onToolResult: (toolName, result) => {
            addAgentStep({
              type: 'tool_result',
              content: result.length > 100 ? result.substring(0, 100) + '...' : result,
              toolName,
            });
          },
          onThinking: (content) => {
            if (content) {
              addAgentStep({
                type: 'thinking',
                content: content.length > 150 ? content.substring(0, 150) + '...' : content,
              });
            }
          },
        }
      );

      addMessage({ role: 'assistant', content: finalResponse });
    } catch (err) {
      console.error('Agent error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
      addMessage({ role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
      clearAgentSteps();
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
      <ScrollArea className="flex-1 max-h-full overflow-y-auto" ref={scrollRef}>
        <div className="space-y-3 p-3">
          {messages.length === 0 && !isLoading && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {isConfigured 
                ? "Describe what you want to create. Try: 'Create 3 slides about AI'" 
                : "Configure AI settings to get started"}
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded px-3 py-2 text-sm",
                message.role === 'user'
                  ? "bg-secondary text-secondary-foreground"
                  : "text-foreground"
              )}
            >
              <pre className="max-h-[200px] overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed">
                {message.content}
              </pre>
            </div>
          ))}
          
          {/* Agent Steps (shown while loading) */}
          {isLoading && agentSteps.length > 0 && (
            <div className="space-y-1.5 rounded border border-border bg-muted/30 p-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Working...</span>
              </div>
              {agentSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  {step.type === 'tool_call' && <Wrench className="h-3 w-3 mt-0.5 text-blue-500" />}
                  {step.type === 'tool_result' && <CheckCircle className="h-3 w-3 mt-0.5 text-green-500" />}
                  {step.type === 'thinking' && <span className="text-yellow-500">💭</span>}
                  <span className="truncate">{step.content}</span>
                </div>
              ))}
            </div>
          )}
          
          {isLoading && agentSteps.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Thinking...</span>
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
            placeholder={isConfigured ? "Create 3 slides about machine learning..." : "Configure AI first"}
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
