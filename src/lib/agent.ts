import type { AIConfig } from '@/types/presentation';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph/web';
import { getModel, SLIDE_SYSTEM_PROMPT } from './ai-service';
import { slideTools } from './slide-tools';

// Editor context for real-time slide awareness
export interface EditorContext {
  presentationTitle: string;
  totalSlides: number;
  currentSlideIndex: number;
  currentSlideHtml: string;
  currentSlideNotes?: string;
}

// Pending approval for destructive operations
export interface PendingApproval {
  toolName: string;
  args: Record<string, unknown>;
  toolCallId: string;
}

// Sensitive tools that require user approval
export const SENSITIVE_TOOLS = ['delete_slide'];

// Define the state for the agent
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  editorContext: Annotation<EditorContext | null>({
    reducer: (_, y) => y, // Always take latest
    default: () => null,
  }),
  pendingApproval: Annotation<PendingApproval | null>({
    reducer: (_, y) => y,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentState.State;

// Callback types for streaming updates
export interface AgentCallbacks {
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: string) => void;
  onThinking?: (content: string) => void;
  onFinalResponse?: (content: string) => void;
  onApprovalRequired?: (approval: PendingApproval) => void;
}

// Tool executor function type
export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<string>;

/**
 * Creates a LangGraph agent that can take multiple actions in a loop
 */
export function createSlideAgent(
  config: AIConfig,
  toolExecutor: ToolExecutor,
  callbacks?: AgentCallbacks
) {
  const model = getModel(config);
  const modelWithTools = model.bindTools?.(slideTools);

  if (!modelWithTools) {
    throw new Error('Model does not support tool calling');
  }

  // Create a custom tool node that executes tools via our executor
  const executeTools = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const lastMessage = state.messages[state.messages.length - 1];
    
    if (!(lastMessage instanceof AIMessage) || !lastMessage.tool_calls?.length) {
      return { messages: [] };
    }

    const toolMessages: ToolMessage[] = [];

    for (const toolCall of lastMessage.tool_calls) {
      callbacks?.onToolCall?.(toolCall.name, toolCall.args as Record<string, unknown>);
      
      try {
        const result = await toolExecutor(toolCall.name, toolCall.args as Record<string, unknown>);
        callbacks?.onToolResult?.(toolCall.name, result);
        
        toolMessages.push(
          new ToolMessage({
            content: result,
            tool_call_id: toolCall.id ?? toolCall.name,
            name: toolCall.name,
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        callbacks?.onToolResult?.(toolCall.name, `Error: ${errorMsg}`);
        
        toolMessages.push(
          new ToolMessage({
            content: `Error executing tool: ${errorMsg}`,
            tool_call_id: toolCall.id ?? toolCall.name,
            name: toolCall.name,
          })
        );
      }
    }

    return { messages: toolMessages };
  };

  // Agent node: call the LLM with dynamic context from state
  const callModel = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    // Build dynamic context from current editor state
    let dynamicContext = '';
    if (state.editorContext) {
      const ctx = state.editorContext;
      dynamicContext = `
Current Editor State:
- Presentation: "${ctx.presentationTitle}"
- Total Slides: ${ctx.totalSlides}
- Current Slide Index: ${ctx.currentSlideIndex}
- Current Slide HTML:
\`\`\`html
${ctx.currentSlideHtml}
\`\`\`
${ctx.currentSlideNotes ? `- Speaker Notes: ${ctx.currentSlideNotes}` : ''}`;
    } else {
      dynamicContext = 'No presentation loaded. User should create a new one first.';
    }

    const systemMessage = new SystemMessage(SLIDE_SYSTEM_PROMPT + '\n\n' + dynamicContext);
    
    // Filter out previous system messages to avoid token bloat
    const conversationMessages = state.messages.filter(m => !(m instanceof SystemMessage));
    
    const response = await modelWithTools.invoke([systemMessage, ...conversationMessages]);

    // Notify about thinking/response
    if (typeof response.content === 'string' && response.content) {
      callbacks?.onThinking?.(response.content);
    }

    return { messages: [response] };
  };

  // Condition: should we continue calling tools, request approval, or end?
  const shouldContinue = (state: AgentStateType): 'tools' | 'approval_pending' | typeof END => {
    const lastMessage = state.messages[state.messages.length - 1];

    // If the last message has tool calls, check them
    if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
      // Check if any tool call is sensitive and requires approval
      for (const toolCall of lastMessage.tool_calls) {
        if (SENSITIVE_TOOLS.includes(toolCall.name)) {
          // Trigger approval callback
          const approval: PendingApproval = {
            toolName: toolCall.name,
            args: toolCall.args as Record<string, unknown>,
            toolCallId: toolCall.id ?? toolCall.name,
          };
          callbacks?.onApprovalRequired?.(approval);
          return 'approval_pending';
        }
      }
      return 'tools';
    }

    // Otherwise, we're done
    return END;
  };

  // Approval pending node - just returns state, graph will pause here
  const approvalPending = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    // This node acts as a pause point - the UI will handle resumption
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
      const sensitiveCall = lastMessage.tool_calls.find(tc => SENSITIVE_TOOLS.includes(tc.name));
      if (sensitiveCall) {
        return {
          pendingApproval: {
            toolName: sensitiveCall.name,
            args: sensitiveCall.args as Record<string, unknown>,
            toolCallId: sensitiveCall.id ?? sensitiveCall.name,
          },
        };
      }
    }
    return {};
  };

  // Build the graph
  const workflow = new StateGraph(AgentState)
    .addNode('agent', callModel)
    .addNode('tools', executeTools)
    .addNode('approval_pending', approvalPending)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      approval_pending: 'approval_pending',
      [END]: END,
    })
    .addEdge('tools', 'agent')
    .addEdge('approval_pending', END); // Graph ends here, UI will resume

  const graph = workflow.compile();

  return graph;
}

/**
 * Run the agent and return the final response
 */
export async function runSlideAgent(
  config: AIConfig,
  editorContext: EditorContext | null,
  userMessage: string,
  toolExecutor: ToolExecutor,
  callbacks?: AgentCallbacks
): Promise<string> {
  const agent = createSlideAgent(config, toolExecutor, callbacks);

  const initialState: AgentStateType = {
    messages: [new HumanMessage(userMessage)],
    editorContext,
    pendingApproval: null,
  };

  // Run the agent
  const finalState = await agent.invoke(initialState);

  // Get the final response from the last AI message
  const messages = finalState.messages;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg instanceof AIMessage && typeof msg.content === 'string' && msg.content) {
      callbacks?.onFinalResponse?.(msg.content);
      return msg.content;
    }
  }

  return 'Task completed.';
}

/**
 * Stream the agent execution for real-time updates
 * Returns the final response or pending approval info
 */
export interface StreamResult {
  response: string;
  pendingApproval: PendingApproval | null;
}

export async function streamSlideAgent(
  config: AIConfig,
  editorContext: EditorContext | null,
  userMessage: string,
  toolExecutor: ToolExecutor,
  callbacks?: AgentCallbacks,
  signal?: AbortSignal
): Promise<StreamResult> {
  const agent = createSlideAgent(config, toolExecutor, callbacks);

  const initialState: AgentStateType = {
    messages: [new HumanMessage(userMessage)],
    editorContext,
    pendingApproval: null,
  };

  let finalResponse = '';
  let pendingApproval: PendingApproval | null = null;

  // Stream the agent execution
  const stream = await agent.stream(initialState, { streamMode: 'values', signal });
  
  for await (const state of stream) {
    // Check if aborted
    if (signal?.aborted) {
      break;
    }
    
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage instanceof AIMessage && typeof lastMessage.content === 'string') {
      finalResponse = lastMessage.content;
    }

    // Check for pending approval
    if (state.pendingApproval) {
      pendingApproval = state.pendingApproval;
    }
  }

  if (finalResponse && !pendingApproval) {
    callbacks?.onFinalResponse?.(finalResponse);
  }

  return { 
    response: finalResponse || 'Task completed.',
    pendingApproval,
  };
}
