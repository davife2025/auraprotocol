import { ethers } from 'hardhat'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function main() {
  const signers = await ethers.getSigners()
  const deployer = signers[0]

  console.log('Deploying Aura Protocol contracts to Monad...')
  console.log('Deployer:', deployer.address)
  console.log('Balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'MON\n')

  // Use deployer for all allocation wallets in testnet; replace in mainnet
  const communityAddr = signers[1]?.address ?? deployer.address
  const founderAddr   = signers[2]?.address ?? deployer.address
  const investorAddr  = signers[3]?.address ?? deployer.address
  const ecosystemAddr = signers[4]?.address ?? deployer.address
  const treasuryAddr  = signers[5]?.address ?? deployer.address

  // 1. AuraIdentity
  console.log('1. Deploying AuraIdentity...')
  const identity = await (await ethers.getContractFactory('AuraIdentity')).deploy()
  await identity.waitForDeployment()
  const identityAddress = await identity.getAddress()
  console.log('   ✓', identityAddress)

  // 2. AuraRegistry
  console.log('2. Deploying AuraRegistry...')
  const registry = await (await ethers.getContractFactory('AuraRegistry')).deploy(identityAddress)
  await registry.waitForDeployment()
  const registryAddress = await registry.getAddress()
  console.log('   ✓', registryAddress)

  // 3. AuraReputation
  console.log('3. Deploying AuraReputation...')
  const reputation = await (await ethers.getContractFactory('AuraReputation')).deploy()
  await reputation.waitForDeployment()
  const reputationAddress = await reputation.getAddress()
  console.log('   ✓', reputationAddress)

  // 4. AuraPermissions
  console.log('4. Deploying AuraPermissions...')
  const permissions = await (await ethers.getContractFactory('AuraPermissions')).deploy()
  await permissions.waitForDeployment()
  const permissionsAddress = await permissions.getAddress()
  console.log('   ✓', permissionsAddress)

  // 5. MeetingFactory
  console.log('5. Deploying MeetingFactory...')
  const factory = await (await ethers.getContractFactory('MeetingFactory')).deploy(reputationAddress, deployer.address)
  await factory.waitForDeployment()
  const factoryAddress = await factory.getAddress()
  console.log('   ✓', factoryAddress)

  // 6. AuraToken
  console.log('6. Deploying AuraToken ($AURA)...')
  const token = await (await ethers.getContractFactory('AuraToken')).deploy(
    communityAddr, founderAddr, investorAddr, ecosystemAddr, treasuryAddr
  )
  await token.waitForDeployment()
  const tokenAddress = await token.getAddress()
  console.log('   ✓', tokenAddress)

  // 7. Wire authorisations
  console.log('\n7. Setting up authorisations...')
  await identity.authoriseMinter(deployer.address)
  await identity.authoriseMinter(factoryAddress)
  await reputation.authoriseWriter(deployer.address)
  await reputation.authoriseWriter(factoryAddress)
  await permissions.authoriseWriter(deployer.address)
  console.log('   ✓ Done')

  // 8. Save
  const out = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AuraIdentity:    identityAddress,
      AuraRegistry:    registryAddress,
      AuraReputation:  reputationAddress,
      AuraPermissions: permissionsAddress,
      MeetingFactory:  factoryAddress,
      AuraToken:       tokenAddress,
    },
  }
  writeFileSync(join(__dirname, '..', 'deployments.json'), JSON.stringify(out, null, 2))

  console.log('\n=== DEPLOYMENT COMPLETE ===')
  console.log(`AURA_IDENTITY_CONTRACT=${identityAddress}`)
  console.log(`AURA_REGISTRY_CONTRACT=${registryAddress}`)
  console.log(`AURA_REPUTATION_CONTRACT=${reputationAddress}`)
  console.log(`AURA_PERMISSIONS_CONTRACT=${permissionsAddress}`)
  console.log(`AURA_MEETING_FACTORY_CONTRACT=${factoryAddress}`)
  console.log(`AURA_TOKEN_CONTRACT=${tokenAddress}`)
}

main().catch(err => { console.error(err); process.exit(1) })
