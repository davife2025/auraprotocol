import { Worker, type Job } from 'bullmq'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

export interface MeetingJob {
  type: 'start_meeting' | 'process_turn' | 'settle_meeting' | 'generate_summary'
  meetingId: string
  payload: Record<string, unknown>
}

export function createMeetingWorker() {
  const worker = new Worker<MeetingJob>(
    'meeting-tasks',
    async (job: Job<MeetingJob>) => {
      const { type, meetingId, payload } = job.data
      logger.info({ jobId: job.id, type, meetingId }, 'Processing meeting job')

      switch (type) {
        case 'start_meeting':
          // TODO: session 5 — notify all agent instances, open room
          logger.info({ meetingId }, 'Starting meeting room')
          break

        case 'process_turn':
          // TODO: session 5 — run agent LLM turn, broadcast to room
          logger.info({ meetingId, agentId: payload.agentId }, 'Processing meeting turn')
          break

        case 'settle_meeting':
          // TODO: session 5 — hash outcomes, write to Monad via viem
          logger.info({ meetingId }, 'Settling meeting on Monad')
          break

        case 'generate_summary':
          // TODO: session 5 — call Anthropic API to summarise transcript
          logger.info({ meetingId }, 'Generating meeting summary')
          break

        default:
          logger.warn({ type }, 'Unknown meeting job type')
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      concurrency: 50,
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Meeting job failed')
  })

  return worker
}
