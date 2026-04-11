import Anthropic from '@anthropic-ai/sdk'
import { VectorMemoryManager } from '../memory/vectorManager.js'
import { PermissionEnforcer } from '../permissions/enforcer.js'
import type {
  AgentProfile,
  AgentDecisionContext,
  AgentDecision,
  AgentInstance,
  AgentStatus,
} from '../types/index.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = (p: AgentProfile, memories: string) => `
You are an AI agent named ${p.name}, acting as a sovereign representative for your owner.
You speak and act AS your owner — in first person, with full authority within your limits.

## Owner profile
- Communication style: ${p.personalityProfile.communicationStyle}
- Risk tolerance: ${p.personalityProfile.riskTolerance}
- Language: ${p.personalityProfile.language}
${p.personalityProfile.customInstructions ? `- Instructions: ${p.personalityProfile.customInstructions}` : ''}

## Authority limits (HARD — never exceed)
- CAN commit to: ${p.permissions.meetings.canCommitTo.join(', ')}
- CANNOT commit to: ${p.permissions.meetings.cannotCommitTo.join(', ')}
- Always escalate if: ${p.permissions.meetings.escalateIf.join(', ')}

## Relevant memory
${memories || 'No prior context.'}

## Rules
1. Speak as your owner — first person, decisive, on-brand
2. Never exceed permission limits — escalate with reason if needed
3. Flag every binding commitment explicitly: "I commit to: [X]"
4. Be concise — no filler, no hedging unless genuinely uncertain
`.trim()

export class AgentService {
  private instances = new Map<string, AgentInstance>()
  private memory = new Map<string, VectorMemoryManager>()
  private enforcers = new Map<string, PermissionEnforcer>()
  private profiles = new Map<string, AgentProfile>()

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  spawnInstance(profile: AgentProfile): AgentInstance {
    const instanceId = crypto.randomUUID()
    const instance: AgentInstance = {
      instanceId,
      agentId: profile.id,
      status: 'active',
      spawnedAt: new Date(),
    }
    this.instances.set(instanceId, instance)
    this.memory.set(instanceId, new VectorMemoryManager(profile.id))
    this.enforcers.set(instanceId, new PermissionEnforcer(profile.permissions))
    this.profiles.set(instanceId, profile)
    return instance
  }

  terminateInstance(instanceId: string): void {
    this.instances.delete(instanceId)
    this.memory.delete(instanceId)
    this.enforcers.delete(instanceId)
    this.profiles.delete(instanceId)
  }

  setStatus(instanceId: string, status: AgentStatus, task?: string): void {
    const inst = this.instances.get(instanceId)
    if (inst) { inst.status = status; if (task) inst.currentTask = task }
  }

  getActiveInstances(agentId: string): AgentInstance[] {
    return [...this.instances.values()].filter(i => i.agentId === agentId && i.status !== 'error')
  }

  // ── Reasoning ─────────────────────────────────────────────────────────────

  async chat(
    instanceId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    context?: string
  ): Promise<string> {
    const profile = this.profiles.get(instanceId)
    const mem = this.memory.get(instanceId)
    if (!profile || !mem) throw new Error(`Instance ${instanceId} not found`)

    const memories = context
      ? (await mem.recall(context)).map(m => `[${m.type}] ${m.content}`).join('\n')
      : ''

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT(profile, memories),
      messages: history,
    })

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error('No text response')

    // Auto-extract and record commitments from the response
    const commitmentPattern = /I commit to:\s*(.+?)(?:\.|$)/gi
    let match
    while ((match = commitmentPattern.exec(text.text)) !== null) {
      await mem.recordCommitment(match[1].trim())
    }

    return text.text
  }

  async decide(instanceId: string, ctx: AgentDecisionContext): Promise<AgentDecision> {
    const profile = this.profiles.get(instanceId)
    const mem = this.memory.get(instanceId)
    const enforcer = this.enforcers.get(instanceId)
    if (!profile || !mem || !enforcer) throw new Error(`Instance ${instanceId} not found`)

    const shouldEscalate = enforcer.shouldEscalate(ctx.situation)
    if (shouldEscalate) {
      return {
        action: 'escalate_to_human',
        reasoning: `Escalation trigger detected in: "${ctx.situation}"`,
        withinPermissions: false,
        requiresHumanApproval: true,
        confidence: 1,
        escalationReason: ctx.situation,
      }
    }

    const memories = (await mem.recall(ctx.situation, 4)).map(m => `[${m.type}] ${m.content}`).join('\n')

    const prompt = `Situation: ${ctx.situation}\nStakes: ${ctx.stakes}${ctx.timeConstraint ? `\nTime: ${ctx.timeConstraint}` : ''}\n\nRespond ONLY as JSON:\n{"action":"string","reasoning":"string","withinPermissions":bool,"requiresHumanApproval":bool,"confidence":0.0-1.0,"escalationReason":"string or null"}`

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: SYSTEM_PROMPT(profile, memories),
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error('No text response')

    try {
      const decision = JSON.parse(text.text.replace(/```json|```/g, '').trim()) as AgentDecision
      return enforcer.validateDecision(decision)
    } catch {
      return {
        action: 'escalate_to_human',
        reasoning: 'Could not parse decision — escalating for safety',
        withinPermissions: false,
        requiresHumanApproval: true,
        confidence: 0,
      }
    }
  }

  async summariseMeeting(
    instanceId: string,
    transcript: Array<{ agentId: string; message: string; timestamp: string }>,
    commitments: string[]
  ): Promise<string> {
    const profile = this.profiles.get(instanceId)
    if (!profile) throw new Error(`Instance ${instanceId} not found`)

    const transcriptText = transcript.map(t => `[${t.timestamp}] ${t.agentId}: ${t.message}`).join('\n')

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT(profile, ''),
      messages: [{
        role: 'user',
        content: `Summarise this meeting. Include: key points, decisions, commitments (binding), next steps.\n\nCommitments logged: ${commitments.join('; ')}\n\nTranscript:\n${transcriptText}`,
      }],
    })

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error('No text response')
    return text.text
  }

  async computeResonanceScore(
    instanceId: string,
    theirProfile: { niche: string; interests: string[]; reputationScore: number }
  ): Promise<number> {
    const profile = this.profiles.get(instanceId)
    if (!profile) return 0

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 64,
      system: 'You are a compatibility scorer. Respond with ONLY a number 0-100.',
      messages: [{
        role: 'user',
        content: `My agent: ${profile.name}, style: ${profile.personalityProfile.communicationStyle}, risk: ${profile.personalityProfile.riskTolerance}\nTheir agent: niche: ${theirProfile.niche}, interests: ${theirProfile.interests.join(', ')}, reputation: ${theirProfile.reputationScore}\nAlignment score (0-100):`,
      }],
    })

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return 50
    return Math.min(100, Math.max(0, parseInt(text.text.trim(), 10) || 50))
  }

  // ── Memory accessors ──────────────────────────────────────────────────────

  getMemory(instanceId: string): VectorMemoryManager | undefined {
    return this.memory.get(instanceId)
  }

  getEnforcer(instanceId: string): PermissionEnforcer | undefined {
    return this.enforcers.get(instanceId)
  }

  getInstance(instanceId: string): AgentInstance | undefined {
    return this.instances.get(instanceId)
  }
}

// Singleton for use across the agent-runner workers
export const agentService = new AgentService()