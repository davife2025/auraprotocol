import { expect } from 'chai'
import { ethers } from 'hardhat'
import type { AuraIdentity, AuraReputation, AuraPermissions } from '../typechain-types'

describe('Aura Protocol Contracts', () => {

  // ── AuraIdentity ────────────────────────────────────────────────────────────

  describe('AuraIdentity', () => {
    let identity: AuraIdentity
    let owner: any, user1: any, user2: any

    beforeEach(async () => {
      ;[owner, user1, user2] = await ethers.getSigners()
      const Factory = await ethers.getContractFactory('AuraIdentity')
      identity = await Factory.deploy()
      await identity.authoriseMinter(owner.address)
    })

    it('mints a soulbound identity', async () => {
      const tx = await identity.mint(
        user1.address,
        'aura_user1',
        'ipfs://QmTest',
        ethers.keccak256(ethers.toUtf8Bytes('permissions'))
      )
      await tx.wait()

      const id = await identity.getIdentity(user1.address)
      expect(id.auraId).to.equal('aura_user1')
      expect(id.isRevoked).to.equal(false)
      expect(id.tokenId).to.equal(1n)
    })

    it('prevents minting a second identity to same wallet', async () => {
      await identity.mint(user1.address, 'aura_user1', 'ipfs://Qm1', ethers.ZeroHash)
      await expect(
        identity.mint(user1.address, 'aura_user1_dup', 'ipfs://Qm2', ethers.ZeroHash)
      ).to.be.revertedWith('AuraIdentity: identity already exists')
    })

    it('owner can revoke identity', async () => {
      await identity.mint(user1.address, 'aura_user1', 'ipfs://Qm1', ethers.ZeroHash)
      await identity.revoke(user1.address)
      const id = await identity.getIdentity(user1.address)
      expect(id.isRevoked).to.equal(true)
    })

    it('user can self-revoke', async () => {
      await identity.mint(user1.address, 'aura_user1', 'ipfs://Qm1', ethers.ZeroHash)
      await identity.connect(user1).revoke(user1.address)
      const id = await identity.getIdentity(user1.address)
      expect(id.isRevoked).to.equal(true)
    })

    it('non-minter cannot mint', async () => {
      await expect(
        identity.connect(user1).mint(user2.address, 'aura_user2', 'ipfs://Qm2', ethers.ZeroHash)
      ).to.be.revertedWith('AuraIdentity: not authorised minter')
    })

    it('tracks total supply', async () => {
      await identity.mint(user1.address, 'aura_1', 'ipfs://1', ethers.ZeroHash)
      await identity.mint(user2.address, 'aura_2', 'ipfs://2', ethers.ZeroHash)
      expect(await identity.totalSupply()).to.equal(2n)
    })
  })

  // ── AuraReputation ──────────────────────────────────────────────────────────

  describe('AuraReputation', () => {
    let reputation: AuraReputation
    let owner: any, agent1: any

    beforeEach(async () => {
      ;[owner, agent1] = await ethers.getSigners()
      const Factory = await ethers.getContractFactory('AuraReputation')
      reputation = await Factory.deploy()
      await reputation.authoriseWriter(owner.address)
    })

    it('records a fulfilled commitment and updates score', async () => {
      // InteractionType.COMMITMENT_FULFILLED = 1
      await reputation.recordInteraction(agent1.address, 1, 100)
      const rep = await reputation.getReputation(agent1.address)
      expect(rep.totalInteractions).to.equal(1n)
      expect(rep.commitmentRate).to.be.gt(0n)
    })

    it('penalises broken commitments', async () => {
      // First record some good interactions
      await reputation.recordInteraction(agent1.address, 1, 100)
      await reputation.recordInteraction(agent1.address, 1, 100)
      const before = await reputation.getReputation(agent1.address)

      // Then break a commitment — InteractionType.COMMITMENT_BROKEN = 2
      await reputation.recordInteraction(agent1.address, 2, 0)
      const after = await reputation.getReputation(agent1.address)

      expect(after.commitmentRate).to.be.lt(before.commitmentRate)
    })

    it('unauthorised writer is rejected', async () => {
      ;[, agent1] = await ethers.getSigners()
      await expect(
        reputation.connect(agent1).recordInteraction(agent1.address, 1, 100)
      ).to.be.revertedWith('AuraReputation: not authorised')
    })
  })

  // ── AuraPermissions ─────────────────────────────────────────────────────────

  describe('AuraPermissions', () => {
    let permissions: AuraPermissions
    let owner: any, agent1: any

    beforeEach(async () => {
      ;[owner, agent1] = await ethers.getSigners()
      const Factory = await ethers.getContractFactory('AuraPermissions')
      permissions = await Factory.deploy()
      await permissions.authoriseWriter(owner.address)
    })

    it('sets and retrieves permissions', async () => {
      const schemaHash = ethers.keccak256(ethers.toUtf8Bytes('{"canCommitTo":["schedule"]}'))
      const encoded = ethers.toUtf8Bytes('{"canCommitTo":["schedule"]}')
      await permissions.setPermissions(agent1.address, schemaHash, encoded)

      const rec = await permissions.getPermissions(agent1.address)
      expect(rec.schemaHash).to.equal(schemaHash)
      expect(rec.isActive).to.equal(true)
      expect(rec.version).to.equal(1n)
    })

    it('increments version on update', async () => {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes('v1'))
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes('v2'))
      await permissions.setPermissions(agent1.address, hash1, ethers.toUtf8Bytes('v1'))
      await permissions.setPermissions(agent1.address, hash2, ethers.toUtf8Bytes('v2'))
      const rec = await permissions.getPermissions(agent1.address)
      expect(rec.version).to.equal(2n)
    })

    it('revokes permissions', async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes('perms'))
      await permissions.setPermissions(agent1.address, hash, ethers.toUtf8Bytes('perms'))
      await permissions.revokePermissions(agent1.address)
      expect(await permissions.hasActivePermissions(agent1.address)).to.equal(false)
    })
  })
})
