import { Worker, type Job } from 'bullmq'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

export interface RoomJob {
  type: 'scan_room' | 'compute_resonance' | 'notify_match' | 'run_agent_chat_turn'
  roomId: string
  agentId: string
  payload: Record<string, unknown>
}

export function createRoomWorker() {
  const worker = new Worker<RoomJob>(
    'room-tasks',
    async (job: Job<RoomJob>) => {
      const { type, roomId, agentId, payload } = job.data
      logger.info({ jobId: job.id, type, roomId, agentId }, 'Processing room job')

      switch (type) {
        case 'scan_room':
          // TODO: session 6 — agent scans room for resonance candidates
          logger.info({ roomId, agentId }, 'Agent scanning room')
          break

        case 'compute_resonance':
          // TODO: session 6 — calculate alignment score between two agents
          logger.info({ agentId, targetId: payload.targetAgentId }, 'Computing resonance score')
          break

        case 'notify_match':
          // TODO: session 6 — notify both humans of mutual resonance
          logger.info({ agentId, matchId: payload.matchAgentId }, 'Notifying mutual match')
          break

        case 'run_agent_chat_turn':
          // TODO: session 6 — process one turn of agent-to-agent conversation
          logger.info({ agentId, connectionId: payload.connectionId }, 'Running agent chat turn')
          break

        default:
          logger.warn({ type }, 'Unknown room job type')
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      concurrency: 100,
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Room job failed')
  })

  return worker
}
