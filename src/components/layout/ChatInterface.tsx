import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { streamSlideAgent, type EditorContext } from '@/lib/agent';
import { cn } from '@/lib/utils';
import { useChatStore, usePresentationStore, useSettingsStore } from '@/stores';
import { useImageStore } from '@/stores/image-store';
import { convertFileSrc } from '@tauri-apps/api/core';
import { AlertTriangle, CheckCircle, ChevronDown, Loader2, MessageSquarePlus, Send, Square, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [isThinkingOpen, setIsThinkingOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    agentSteps,
    pendingApproval,
    addMessage, 
    setLoading, 
    setError,
    addAgentStep,
    clearAgentSteps,
    clearMessages,
    setAbortController,
    cancelTask,
    setPendingApproval,
    rejectAction,
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

    // Create AbortController for this request
    const abortController = new AbortController();
    setAbortController(abortController);

    try {
      // Build EditorContext from current presentation state
      const currentSlide = presentation?.slides[currentSlideIndex];
      const editorContext: EditorContext | null = presentation 
        ? {
            presentationTitle: presentation.meta.title,
            totalSlides: presentation.slides.length,
            currentSlideIndex,
            currentSlideHtml: currentSlide?.html ?? '',
            currentSlideNotes: currentSlide?.notes,
          }
        : null;

      // Run the agent with streaming callbacks
      const result = await streamSlideAgent(
        config,
        editorContext,
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
          onApprovalRequired: (approval) => {
            setPendingApproval(approval);
          },
        },
        abortController.signal
      );

      // Check if we have a pending approval (agent paused for user confirmation)
      if (result.pendingApproval) {
        setPendingApproval(result.pendingApproval);
        // Don't add message yet - wait for user approval
        return;
      }

      addMessage({ role: 'assistant', content: result.response });
    } catch (err) {
      // Don't show error if it was a user-initiated abort
      if (err instanceof Error && err.name === 'AbortError') {
        // Task was cancelled, silently handle
        return;
      }
      console.error('Agent error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
      addMessage({ role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
      clearAgentSteps();
      setAbortController(null);
    }
  };

  // Handle approval of sensitive action
  const handleApprove = async () => {
    if (!pendingApproval) return;
    
    // Execute the pending tool
    const { toolName, args } = pendingApproval;
    setPendingApproval(null);
    
    try {
      await executeToolByName(toolName, args);
      addMessage({ role: 'assistant', content: `Approved and executed: ${toolName}` });
    } catch (err) {
      addMessage({ role: 'assistant', content: `Error executing ${toolName}: ${err}` });
    }
    setLoading(false);
  };

  // Handle rejection of sensitive action
  const handleReject = () => {
    rejectAction();
    addMessage({ role: 'assistant', content: 'Action cancelled by user.' });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide">
          AI Director
        </span>
        {messages.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={clearMessages}
                  disabled={isLoading}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
          
          {/* Agent Reasoning (collapsible, shown while loading) */}
          {isLoading && (
            <Collapsible 
              open={isThinkingOpen} 
              onOpenChange={setIsThinkingOpen}
              className="rounded border border-border bg-muted/30"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>
                    {agentSteps.length > 0 
                      ? `Working... (${agentSteps.length} step${agentSteps.length > 1 ? 's' : ''})` 
                      : 'Thinking...'}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform",
                  isThinkingOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 border-t border-border px-3 py-2 max-h-48 overflow-y-auto">
                  {agentSteps.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Waiting for response...</p>
                  ) : (
                    agentSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <div className="flex-shrink-0 mt-0.5">
                          {step.type === 'tool_call' && <Wrench className="h-3 w-3 text-blue-500" />}
                          {step.type === 'tool_result' && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {step.type === 'thinking' && <span className="text-yellow-500">💭</span>}
                        </div>
                        <span className={cn(
                          "text-muted-foreground leading-relaxed",
                          step.type === 'thinking' && "italic"
                        )}>
                          {step.content}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
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
          {isLoading ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-[60px] w-10"
              onClick={cancelTask}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!isConfigured || !input.trim()}
              className="h-[60px] w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {/* Approval Dialog for Sensitive Actions */}
      <AlertDialog open={!!pendingApproval} onOpenChange={(open) => !open && handleReject()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Action
            </AlertDialogTitle>
            <AlertDialogDescription>
              The AI wants to perform a sensitive action:
              <div className="mt-2 rounded bg-muted p-2 font-mono text-xs">
                {pendingApproval?.toolName}
                {pendingApproval?.args && (
                  <span className="text-muted-foreground">
                    ({JSON.stringify(pendingApproval.args)})
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleReject}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
