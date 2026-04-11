import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('Session 2 — MeetingFactory + AuraToken + Integration', () => {

  describe('AuraToken', () => {
    let token: any, owner: any, community: any, founder: any, investor: any, ecosystem: any, treasury: any, user1: any

    beforeEach(async () => {
      ;[owner, community, founder, investor, ecosystem, treasury, user1] = await ethers.getSigners()
      token = await (await ethers.getContractFactory('AuraToken')).deploy(
        community.address, founder.address, investor.address, ecosystem.address, treasury.address
      )
    })

    it('mints correct allocations', async () => {
      expect(await token.balanceOf(community.address)).to.equal(ethers.parseEther('300000000'))
      expect(await token.balanceOf(founder.address)).to.equal(ethers.parseEther('180000000'))
    })

    it('total supply is 1 billion', async () => {
      expect(await token.totalSupply()).to.equal(ethers.parseEther('1000000000'))
    })

    it('staking grants Pro access at 1000 tokens', async () => {
      await token.connect(community).transfer(user1.address, ethers.parseEther('2000'))
      await token.connect(user1).stake(ethers.parseEther('1000'))
      expect(await token.hasProAccess(user1.address)).to.equal(true)
      expect(await token.stakedBalance(user1.address)).to.equal(ethers.parseEther('1000'))
    })

    it('denies Pro access below 1000 staked', async () => {
      await token.connect(community).transfer(user1.address, ethers.parseEther('500'))
      await token.connect(user1).stake(ethers.parseEther('500'))
      expect(await token.hasProAccess(user1.address)).to.equal(false)
    })

    it('blocks unstake before 7 day lock', async () => {
      await token.connect(community).transfer(user1.address, ethers.parseEther('2000'))
      await token.connect(user1).stake(ethers.parseEther('1000'))
      await expect(token.connect(user1).unstake(ethers.parseEther('1000')))
        .to.be.revertedWith('AuraToken: minimum stake period not met')
    })

    it('allows unstake after 7 days', async () => {
      await token.connect(community).transfer(user1.address, ethers.parseEther('2000'))
      await token.connect(user1).stake(ethers.parseEther('1000'))
      await ethers.provider.send('evm_increaseTime', [8 * 24 * 60 * 60])
      await ethers.provider.send('evm_mine', [])
      await expect(token.connect(user1).unstake(ethers.parseEther('1000'))).to.not.be.reverted
    })
  })

  describe('MeetingFactory', () => {
    let factory: any, reputation: any, owner: any, agent1: any, agent2: any, agent3: any

    beforeEach(async () => {
      ;[owner, agent1, agent2, agent3] = await ethers.getSigners()
      reputation = await (await ethers.getContractFactory('AuraReputation')).deploy()
      await reputation.authoriseWriter(owner.address)
      factory = await (await ethers.getContractFactory('MeetingFactory')).deploy(
        await reputation.getAddress(), owner.address
      )
      await reputation.authoriseWriter(await factory.getAddress())
    })

    it('creates a meeting room', async () => {
      await factory.createMeeting('mtg-001', [agent1.address, agent2.address])
      const room = await factory.getMeetingRoom('mtg-001')
      expect(room).to.not.equal(ethers.ZeroAddress)
    })

    it('increments meeting counter', async () => {
      await factory.createMeeting('m1', [agent1.address, agent2.address])
      await factory.createMeeting('m2', [agent1.address, agent3.address])
      expect(await factory.totalMeetings()).to.equal(2n)
    })

    it('rejects duplicate meeting IDs', async () => {
      await factory.createMeeting('dupe', [agent1.address, agent2.address])
      await expect(factory.createMeeting('dupe', [agent1.address, agent2.address]))
        .to.be.revertedWith('MeetingFactory: meetingId exists')
    })

    it('rejects single-participant meetings', async () => {
      await expect(factory.createMeeting('solo', [agent1.address]))
        .to.be.revertedWith('MeetingFactory: need at least 2 participants')
    })

    it('settles meeting and writes reputation scores', async () => {
      await factory.createMeeting('settle-001', [agent1.address, agent2.address])
      const hash = ethers.keccak256(ethers.toUtf8Bytes('outcome'))
      await factory.settleWithReputation('settle-001', hash, [agent1.address, agent2.address], [90, 85])
      const rep = await reputation.getReputation(agent1.address)
      expect(rep.totalInteractions).to.equal(1n)
      expect(rep.meetingQuality).to.be.gt(0n)
    })

    it('records commitment fulfilled and sets 100% commitment rate', async () => {
      await factory.recordCommitmentFulfilled(agent1.address)
      const rep = await reputation.getReputation(agent1.address)
      expect(rep.commitmentRate).to.equal(100n)
    })

    it('records broken commitment and reduces rate', async () => {
      await factory.recordCommitmentFulfilled(agent1.address)
      await factory.recordCommitmentFulfilled(agent1.address)
      const before = await reputation.getReputation(agent1.address)
      await factory.recordCommitmentBroken(agent1.address)
      const after = await reputation.getReputation(agent1.address)
      expect(after.commitmentRate).to.be.lt(before.commitmentRate)
    })
  })

  describe('Integration: full agent lifecycle onchain', () => {
    it('identity → stake → meeting → reputation', async () => {
      const [owner, a1, a2] = await ethers.getSigners()

      const identity   = await (await ethers.getContractFactory('AuraIdentity')).deploy()
      const reputation = await (await ethers.getContractFactory('AuraReputation')).deploy()
      const factory    = await (await ethers.getContractFactory('MeetingFactory')).deploy(await reputation.getAddress(), owner.address)
      const token      = await (await ethers.getContractFactory('AuraToken')).deploy(owner.address, owner.address, owner.address, owner.address, owner.address)

      await identity.authoriseMinter(owner.address)
      await reputation.authoriseWriter(owner.address)
      await reputation.authoriseWriter(await factory.getAddress())

      // 1. Mint identities
      await identity.mint(a1.address, 'aura_a1', 'ipfs://Qm1', ethers.ZeroHash)
      await identity.mint(a2.address, 'aura_a2', 'ipfs://Qm2', ethers.ZeroHash)
      expect((await identity.getIdentity(a1.address)).auraId).to.equal('aura_a1')

      // 2. Stake for Pro access
      await token.transfer(a1.address, ethers.parseEther('1500'))
      await token.connect(a1).stake(ethers.parseEther('1000'))
      expect(await token.hasProAccess(a1.address)).to.equal(true)

      // 3. Run and settle meeting
      await factory.createMeeting('integration-001', [a1.address, a2.address])
      await factory.settleWithReputation(
        'integration-001',
        ethers.keccak256(ethers.toUtf8Bytes('outcome-data')),
        [a1.address, a2.address],
        [92, 88]
      )

      // 4. Fulfill commitment
      await factory.recordCommitmentFulfilled(a1.address)

      // 5. Verify combined reputation
      const rep = await reputation.getReputation(a1.address)
      expect(rep.totalInteractions).to.equal(2n)  // 1 meeting + 1 commitment
      expect(rep.overallScore).to.be.gt(0n)
      expect(rep.commitmentRate).to.be.gt(0n)
      expect(rep.meetingQuality).to.be.gt(0n)
    })
  })
})
