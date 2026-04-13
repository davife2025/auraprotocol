import { Worker, type Job } from 'bullmq'
import { agentService } from '@aura/agent-core'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
const conn = { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) }

export function createAgentWorker() {
  const worker = new Worker('agent-tasks', async (job: Job) => {
    const { type, agentId, payload } = job.data
    logger.info({ type, agentId }, 'Processing agent job')

    switch (type) {
      case 'mint_identity':
        logger.info({ agentId }, 'Identity mint — wired to Monad in S2 deploy')
        break
      case 'join_meeting': {
        const instances = agentService.getActiveInstances(agentId)
        if (instances[0]) agentService.setStatus(instances[0].instanceId, 'in_meeting', `meeting:${payload.meetingId}`)
        break
      }
      case 'join_room': {
        const instances = agentService.getActiveInstances(agentId)
        if (instances[0]) agentService.setStatus(instances[0].instanceId, 'in_room', `room:${payload.roomId}`)
        break
      }
      case 'terminate':
        agentService.getActiveInstances(agentId).forEach(i => agentService.terminateInstance(i.instanceId))
        break
    }
  }, { connection: conn, concurrency: 20 })

  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Agent job failed'))
  return worker
}
