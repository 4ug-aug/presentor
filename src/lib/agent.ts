import type { AIConfig } from '@/types/presentation';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph/web';
import { getModel, SLIDE_SYSTEM_PROMPT } from './ai-service';
import { slideTools } from './slide-tools';

// Define the state for the agent
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentState.State;

// Callback types for streaming updates
export interface AgentCallbacks {
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: string) => void;
  onThinking?: (content: string) => void;
  onFinalResponse?: (content: string) => void;
}

// Tool executor function type
export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<string>;

/**
 * Creates a LangGraph agent that can take multiple actions in a loop
 */
export function createSlideAgent(
  config: AIConfig,
  context: string,
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

  // Agent node: call the LLM
  const callModel = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    // Build messages with system prompt
    const systemMessage = new SystemMessage(SLIDE_SYSTEM_PROMPT + '\n\n' + context);
    const messagesWithSystem = [systemMessage, ...state.messages];

    const response = await modelWithTools.invoke(messagesWithSystem);

    // Notify about thinking/response
    if (typeof response.content === 'string' && response.content) {
      callbacks?.onThinking?.(response.content);
    }

    return { messages: [response] };
  };

  // Condition: should we continue calling tools or end?
  const shouldContinue = (state: AgentStateType): 'tools' | typeof END => {
    const lastMessage = state.messages[state.messages.length - 1];

    // If the last message has tool calls, we need to execute them
    if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
      return 'tools';
    }

    // Otherwise, we're done
    return END;
  };

  // Build the graph
  const workflow = new StateGraph(AgentState)
    .addNode('agent', callModel)
    .addNode('tools', executeTools)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'agent'); // After tools, go back to agent

  const graph = workflow.compile();

  return graph;
}

/**
 * Run the agent and return the final response
 */
export async function runSlideAgent(
  config: AIConfig,
  context: string,
  userMessage: string,
  toolExecutor: ToolExecutor,
  callbacks?: AgentCallbacks
): Promise<string> {
  const agent = createSlideAgent(config, context, toolExecutor, callbacks);

  const initialState: AgentStateType = {
    messages: [new HumanMessage(userMessage)],
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
 */
export async function streamSlideAgent(
  config: AIConfig,
  context: string,
  userMessage: string,
  toolExecutor: ToolExecutor,
  callbacks?: AgentCallbacks,
  signal?: AbortSignal
): Promise<string> {
  const agent = createSlideAgent(config, context, toolExecutor, callbacks);

  const initialState: AgentStateType = {
    messages: [new HumanMessage(userMessage)],
  };

  let finalResponse = '';

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
  }

  if (finalResponse) {
    callbacks?.onFinalResponse?.(finalResponse);
  }

  return finalResponse || 'Task completed.';
}
