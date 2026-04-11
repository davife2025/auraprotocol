import type { AgentProfile, AgentInstance, AgentStatus } from '../types/index.js'
import { AgentReasoningEngine } from '../reasoning/engine.js'
import { PermissionEnforcer } from '../permissions/enforcer.js'
import { AgentMemoryManager } from '../memory/manager.js'

export class AgentLifecycle {
  private instances = new Map<string, AgentInstance>()
  private engines = new Map<string, AgentReasoningEngine>()
  private enforcers = new Map<string, PermissionEnforcer>()
  private memoryManagers = new Map<string, AgentMemoryManager>()

  /**
   * Spawn a new agent instance
   */
  spawnInstance(profile: AgentProfile): AgentInstance {
    const instanceId = crypto.randomUUID()

    const instance: AgentInstance = {
      instanceId,
      agentId: profile.id,
      status: 'active',
      spawnedAt: new Date(),
    }

    this.instances.set(instanceId, instance)
    this.engines.set(instanceId, new AgentReasoningEngine(profile))
    this.enforcers.set(instanceId, new PermissionEnforcer(profile.permissions))
    this.memoryManagers.set(instanceId, new AgentMemoryManager(profile.id))

    return instance
  }

  /**
   * Get an active instance
   */
  getInstance(instanceId: string): AgentInstance | undefined {
    return this.instances.get(instanceId)
  }

  /**
   * Get the reasoning engine for an instance
   */
  getEngine(instanceId: string): AgentReasoningEngine | undefined {
    return this.engines.get(instanceId)
  }

  /**
   * Get the permission enforcer for an instance
   */
  getEnforcer(instanceId: string): PermissionEnforcer | undefined {
    return this.enforcers.get(instanceId)
  }

  /**
   * Get the memory manager for an instance
   */
  getMemory(instanceId: string): AgentMemoryManager | undefined {
    return this.memoryManagers.get(instanceId)
  }

  /**
   * Update instance status
   */
  setStatus(instanceId: string, status: AgentStatus, task?: string): void {
    const instance = this.instances.get(instanceId)
    if (instance) {
      instance.status = status
      if (task) instance.currentTask = task
    }
  }

  /**
   * Terminate an instance and clean up
   */
  terminateInstance(instanceId: string): void {
    this.instances.delete(instanceId)
    this.engines.delete(instanceId)
    this.enforcers.delete(instanceId)
    this.memoryManagers.delete(instanceId)
  }

  /**
   * Get all active instances for an agent
   */
  getActiveInstancesForAgent(agentId: string): AgentInstance[] {
    return Array.from(this.instances.values()).filter(
      i => i.agentId === agentId && i.status !== 'error'
    )
  }
}
