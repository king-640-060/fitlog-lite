export interface AiProviderProfile {
  id: string; name: string; protocol: 'openai-chat-completions'; baseUrl: string; model: string
  preset?: 'zhipu' | 'custom'; toolCapability?: 'unknown' | 'supported' | 'unsupported'
  createdAt: string; updatedAt: string
}
export type AiScope = 'food' | 'training' | 'weight' | 'plan' | 'habit' | 'nutritionTargets'
export interface AiPermissions { read: Record<AiScope, boolean>; writeProposals: boolean }
export interface AiToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
export interface AiMessage { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: AiToolCall[]; tool_call_id?: string }
export interface AiToolDefinition { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }
export interface AiUsage { inputTokens?: number; outputTokens?: number; totalTokens?: number }
export interface AiChatResponse { content: string; toolCalls: AiToolCall[]; usage?: AiUsage }
export interface AiChatRequest { messages: AiMessage[]; tools?: AiToolDefinition[]; toolChoice?: 'auto' | { type: 'function'; function: { name: string } }; signal?: AbortSignal }
export interface AiContext { today: string; localTime: string; timezoneOffsetMinutes: number; activeTab: string; foodDate: string; workoutDate: string; planView: string }
