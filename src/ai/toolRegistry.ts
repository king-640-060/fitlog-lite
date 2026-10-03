import { videoTools } from './tools/videoTools'
import type { AiToolCall, AiToolDefinition } from './types'
import type { AiTool, AiToolEnvironment } from './tools/types'
import { readTools } from './tools/readTools'
import { proposalTools } from './tools/proposalTools'
import { validateAiArguments } from './tools/types'
import { AI_LIMITS, AiError, assertNoKnownSecrets, boundedToolResult } from './security'

export class AiToolRegistry {
  private readonly tools: Map<string, AiTool>
  private readonly environment: AiToolEnvironment
  private readonly secrets: () => readonly string[]
  constructor(environment: AiToolEnvironment, secrets: () => readonly string[] = () => [], tools: AiTool[] = [...readTools, ...proposalTools, ...videoTools]) { this.environment = environment; this.secrets = secrets; this.tools = new Map(tools.map(tool => [tool.name, tool])) }
  private allowed(tool: AiTool): boolean { const permissions = this.environment.permissions(); return tool.scopes.every(scope => permissions.read[scope]) && (tool.kind === 'READ' || permissions.writeProposals) }
  definitions(): AiToolDefinition[] { return [...this.tools.values()].filter(tool => this.allowed(tool)).map(tool => ({ type: 'function', function: { name: tool.name, description: `${tool.label}。${tool.kind === 'PROPOSAL' ? '只生成待确认建议，绝不直接写入。' : tool.name === 'search_training_videos' ? '仅向 YouTube 搜索动作关键词；结果由应用验证。' : '只读取当前已保存的事实。'}`, parameters: tool.schema as unknown as Record<string, unknown> } })) }
  label(name: string): string { return this.tools.get(name)?.label ?? '处理工具请求' }
  async execute(call: AiToolCall, signal?: AbortSignal, onVideos?: AiToolEnvironment['onVideos']): Promise<string> {
    const before = new Set(this.environment.proposals.all.map(proposal => proposal.id))
    try {
      const tool = this.tools.get(call.function.name)
      if (!tool) throw new AiError('unknown_tool', '该工具不在 FitLog 允许范围内')
      if (!this.allowed(tool)) throw new AiError('permission_denied', '当前设置没有授权这项数据或写入建议')
      if (new TextEncoder().encode(call.function.arguments).byteLength > AI_LIMITS.toolArgumentsBytes) throw new AiError('invalid_arguments', '工具参数过大，请缩小请求范围')
      assertNoKnownSecrets(call.function.arguments, this.secrets())
      let args: unknown
      try { args = JSON.parse(call.function.arguments) } catch { throw new AiError('invalid_arguments', '工具参数不是有效 JSON') }
      validateAiArguments(args, tool.schema)
      const result = await tool.execute(args as Record<string, unknown>, { ...this.environment, signal, onVideos })
      assertNoKnownSecrets(result, this.secrets())
      return boundedToolResult(result)
    } catch (error) {
      // Failed validation/secret checks must not leave an actionable partial proposal.
      for (const proposal of this.environment.proposals.all) if (!before.has(proposal.id)) this.environment.proposals.cancel(proposal.id)
      return JSON.stringify({ error: error instanceof AiError ? error.code : 'invalid_arguments', message: error instanceof AiError ? error.message : '参数校验未通过，请询问用户补充；未写入任何数据' })
    }
  }
}
