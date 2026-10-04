import { defineTool, objectSchema, stringSchema, numberSchema } from './types'
import type { DetailedVideoSearchProvider } from '../../services/videoSearchService'
export const videoTools = [defineTool<{ query: string; limit?: number }>('search_training_videos', '搜索真实训练动作视频', 'READ', [], objectSchema({ query: stringSchema(120, '只含动作与技术关键词，不附加体重、饮食或私人记录'), limit: { ...numberSchema(1, 5), type: 'integer' } }, ['query']), async (args, env) => {
  const provider = env.videoSearch! as DetailedVideoSearchProvider
  const outcome = typeof provider.searchDetailed === 'function' ? await provider.searchDetailed(args.query, args.limit ?? 3, env.signal) : { videos: await provider.search(args.query, args.limit ?? 3, env.signal), notices: [] }
  env.onVideos?.(outcome.videos, outcome.notices)
  return { source: 'FitLog provider routing', videos: outcome.videos.map(({ id, title, channel, publishedAt, provider, providerLabel }) => ({ id, title, channel, publishedAt, provider, providerLabel })), count: outcome.videos.length, ranking: 'provider relevance; not a quality endorsement', ...(outcome.notices.length ? { notices: outcome.notices } : {}) }
})]
