import { Worker, type Job } from 'bullmq'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

export interface AgentJob {
  type: 'spawn_instance' | 'execute_task' | 'join_meeting' | 'join_room' | 'terminate'
  agentId: string
  userId: string
  payload: Record<string, unknown>
}

export function createAgentWorker() {
  const worker = new Worker<AgentJob>(
    'agent-tasks',
    async (job: Job<AgentJob>) => {
      const { type, agentId, payload } = job.data
      logger.info({ jobId: job.id, type, agentId }, 'Processing agent job')

      switch (type) {
        case 'spawn_instance':
          // TODO: session 3 — instantiate agent from agent-core
          logger.info({ agentId }, 'Spawning agent instance')
          break

        case 'execute_task':
          // TODO: session 3 — run LLM reasoning cycle
          logger.info({ agentId, payload }, 'Executing agent task')
          break

        case 'join_meeting':
          // TODO: session 5 — connect agent to meeting room WebSocket
          logger.info({ agentId, meetingId: payload.meetingId }, 'Agent joining meeting')
          break

        case 'join_room':
          // TODO: session 6 — place agent in Aura Room
          logger.info({ agentId, roomId: payload.roomId }, 'Agent joining room')
          break

        case 'terminate':
          // Gracefully shut down agent instance
          logger.info({ agentId }, 'Terminating agent instance')
          break

        default:
          logger.warn({ type }, 'Unknown agent job type')
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      concurrency: 20, // run 20 agent jobs in parallel
    }
  )

  worker.on('completed', job => {
    logger.info({ jobId: job.id }, 'Agent job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Agent job failed')
  })

  return worker
}
