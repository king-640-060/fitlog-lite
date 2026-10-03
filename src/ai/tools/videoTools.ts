import { defineTool, objectSchema, stringSchema, numberSchema } from './types'
export const videoTools = [defineTool<{ query: string; limit?: number }>('search_training_videos', '搜索真实训练动作视频', 'READ', [], objectSchema({ query: stringSchema(120, '只含动作与技术关键词，不附加体重、饮食或私人记录'), limit: { ...numberSchema(1, 5), type: 'integer' } }, ['query']), async (args, env) => {
  const videos = await env.videoSearch!.search(args.query, args.limit ?? 3, env.signal)
  env.onVideos?.(videos)
  return { source: 'YouTube Data API', videos: videos.map(({ id, title, channel, publishedAt }) => ({ id, title, channel, publishedAt })), count: videos.length, ranking: 'provider relevance; not a quality endorsement' }
})]
