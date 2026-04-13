import { Worker, type Job } from 'bullmq'
import { agentService } from '@aura/agent-core'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
const conn = { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) }

export function createRoomWorker() {
  const worker = new Worker('room-tasks', async (job: Job) => {
    const { type, roomId, agentId, payload } = job.data
    logger.info({ type, roomId, agentId }, 'Processing room job')

    switch (type) {
      case 'scan_room': {
        const instances = agentService.getActiveInstances(agentId)
        if (instances[0]) {
          agentService.setStatus(instances[0].instanceId, 'in_room', `room:${roomId}`)
          logger.info({ agentId, roomId }, 'Agent scanning room for resonance candidates')
        }
        break
      }

      case 'compute_resonance': {
        const instances = agentService.getActiveInstances(agentId)
        if (!instances[0]) break

        try {
          const score = await agentService.computeResonanceScore(instances[0].instanceId, {
            niche: payload.niche as string,
            interests: payload.interests as string[],
            reputationScore: payload.reputationScore as number,
          })
          logger.info({ agentId, targetId: payload.targetAgentId, score }, 'Resonance computed')
        } catch (err) {
          logger.error({ err }, 'Resonance computation failed')
        }
        break
      }

      case 'run_agent_chat_turn': {
        const instances = agentService.getActiveInstances(agentId)
        if (!instances[0]) break

        try {
          const response = await agentService.chat(
            instances[0].instanceId,
            [{ role: 'user', content: payload.inboundMessage as string }],
            `networking chat in room ${roomId}`
          )
          logger.info({ agentId, connectionId: payload.connectionId, responseLength: response.length }, 'Chat turn processed')
        } catch (err) {
          logger.error({ err }, 'Chat turn failed')
        }
        break
      }

      case 'notify_match':
        logger.info({ agentId, matchId: payload.matchAgentId }, 'Mutual resonance — notifying humans')
        break
    }
  }, { connection: conn, concurrency: 100 })

  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Room job failed'))
  return worker
}
