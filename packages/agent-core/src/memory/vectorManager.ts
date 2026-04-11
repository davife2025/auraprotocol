import type { AgentMemoryEntry } from '../types/index.js'

/**
 * VectorMemoryManager — persistent semantic memory using Pinecone.
 * Falls back to in-memory keyword search if Pinecone is unavailable.
 */
export class VectorMemoryManager {
  private agentId: string
  private inMemory: AgentMemoryEntry[] = []
  private pineconeAvailable = false

  constructor(agentId: string) {
    this.agentId = agentId
    this.pineconeAvailable = !!(
      process.env.PINECONE_API_KEY &&
      process.env.PINECONE_ENVIRONMENT &&
      process.env.PINECONE_INDEX
    )
  }

  async remember(
    type: AgentMemoryEntry['type'],
    content: string,
    importance = 0.5,
    metadata: Record<string, unknown> = {}
  ): Promise<AgentMemoryEntry> {
    const entry: AgentMemoryEntry = {
      id: crypto.randomUUID(),
      agentId: this.agentId,
      type,
      content,
      importance,
      createdAt: new Date(),
    }

    if (this.pineconeAvailable) {
      await this.upsertToPinecone(entry, metadata)
    } else {
      this.inMemory.push(entry)
    }

    return entry
  }

  async recall(context: string, limit = 8): Promise<AgentMemoryEntry[]> {
    if (this.pineconeAvailable) {
      return await this.queryPinecone(context, limit)
    }
    return this.keywordFallback(context, limit)
  }

  async recordCommitment(commitment: string): Promise<AgentMemoryEntry> {
    return this.remember('commitment', commitment, 1.0, { isCommitment: true })
  }

  getCommitmentsInMemory(): AgentMemoryEntry[] {
    return this.inMemory.filter(m => m.type === 'commitment')
  }

  private async upsertToPinecone(
    entry: AgentMemoryEntry,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      // Generate embedding via Anthropic Messages API (text-embedding approach)
      // In production wire to a real embedding model
      const embedding = await this.getEmbedding(entry.content)

      const response = await fetch(
        `https://controller.${process.env.PINECONE_ENVIRONMENT}.pinecone.io/databases/${process.env.PINECONE_INDEX}/upsert`,
        {
          method: 'POST',
          headers: {
            'Api-Key': process.env.PINECONE_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vectors: [{
              id: entry.id,
              values: embedding,
              metadata: {
                agentId: this.agentId,
                type: entry.type,
                content: entry.content,
                importance: entry.importance,
                createdAt: entry.createdAt.toISOString(),
                ...metadata,
              },
            }],
            namespace: this.agentId,
          }),
        }
      )

      if (!response.ok) {
        console.warn('Pinecone upsert failed, falling back to in-memory')
        this.inMemory.push(entry)
      }
    } catch {
      this.inMemory.push(entry)
    }
  }

  private async queryPinecone(context: string, limit: number): Promise<AgentMemoryEntry[]> {
    try {
      const embedding = await this.getEmbedding(context)

      const response = await fetch(
        `https://controller.${process.env.PINECONE_ENVIRONMENT}.pinecone.io/databases/${process.env.PINECONE_INDEX}/query`,
        {
          method: 'POST',
          headers: {
            'Api-Key': process.env.PINECONE_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vector: embedding,
            topK: limit,
            includeMetadata: true,
            namespace: this.agentId,
          }),
        }
      )

      if (!response.ok) return this.keywordFallback(context, limit)

      const data = await response.json() as { matches: Array<{ metadata: any; score: number }> }
      return data.matches.map(m => ({
        id: m.metadata.id ?? crypto.randomUUID(),
        agentId: m.metadata.agentId,
        type: m.metadata.type,
        content: m.metadata.content,
        importance: m.metadata.importance,
        createdAt: new Date(m.metadata.createdAt),
      }))
    } catch {
      return this.keywordFallback(context, limit)
    }
  }

  /**
   * Placeholder embedding — replace with real model in production.
   * Returns a 1536-dim zero vector with a simple hash-based fingerprint.
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const dim = 1536
    const vec = new Array(dim).fill(0)
    for (let i = 0; i < text.length; i++) {
      vec[i % dim] += text.charCodeAt(i) / 1000
    }
    // Normalise
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
    return vec.map(v => v / mag)
  }

  private keywordFallback(context: string, limit: number): AgentMemoryEntry[] {
    const words = context.toLowerCase().split(/\s+/)
    return this.inMemory
      .map(m => ({
        memory: m,
        score: words.filter(w => m.content.toLowerCase().includes(w)).length * m.importance,
      }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.memory)
  }

  pruneExpired(): void {
    const now = new Date()
    this.inMemory = this.inMemory.filter(m => !m.expiresAt || m.expiresAt > now)
  }
}