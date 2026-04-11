import { ethers } from 'hardhat'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying Aura Protocol contracts...')
  console.log('Deployer:', deployer.address)
  console.log('Balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'MON')

  // 1. Deploy AuraIdentity
  console.log('\n1. Deploying AuraIdentity...')
  const AuraIdentity = await ethers.getContractFactory('AuraIdentity')
  const identity = await AuraIdentity.deploy()
  await identity.waitForDeployment()
  const identityAddress = await identity.getAddress()
  console.log('   AuraIdentity deployed to:', identityAddress)

  // 2. Deploy AuraRegistry
  console.log('\n2. Deploying AuraRegistry...')
  const AuraRegistry = await ethers.getContractFactory('AuraRegistry')
  const registry = await AuraRegistry.deploy(identityAddress)
  await registry.waitForDeployment()
  const registryAddress = await registry.getAddress()
  console.log('   AuraRegistry deployed to:', registryAddress)

  // 3. Deploy AuraReputation
  console.log('\n3. Deploying AuraReputation...')
  const AuraReputation = await ethers.getContractFactory('AuraReputation')
  const reputation = await AuraReputation.deploy()
  await reputation.waitForDeployment()
  const reputationAddress = await reputation.getAddress()
  console.log('   AuraReputation deployed to:', reputationAddress)

  // 4. Deploy AuraPermissions
  console.log('\n4. Deploying AuraPermissions...')
  const AuraPermissions = await ethers.getContractFactory('AuraPermissions')
  const permissions = await AuraPermissions.deploy()
  await permissions.waitForDeployment()
  const permissionsAddress = await permissions.getAddress()
  console.log('   AuraPermissions deployed to:', permissionsAddress)

  // 5. Authorise deployer as minter/writer (replace with API wallet in production)
  console.log('\n5. Setting up authorisations...')
  await identity.authoriseMinter(deployer.address)
  await reputation.authoriseWriter(deployer.address)
  await permissions.authoriseWriter(deployer.address)
  console.log('   Authorisations set')

  // 6. Write addresses to deployment file
  const deployedAddresses = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AuraIdentity: identityAddress,
      AuraRegistry: registryAddress,
      AuraReputation: reputationAddress,
      AuraPermissions: permissionsAddress,
    },
  }

  const outPath = join(__dirname, '..', 'deployments.json')
  writeFileSync(outPath, JSON.stringify(deployedAddresses, null, 2))
  console.log('\nDeployment addresses saved to deployments.json')

  console.log('\n=== DEPLOYMENT COMPLETE ===')
  console.log('Add these to your .env:')
  console.log(`AURA_IDENTITY_CONTRACT=${identityAddress}`)
  console.log(`AURA_REGISTRY_CONTRACT=${registryAddress}`)
  console.log(`AURA_REPUTATION_CONTRACT=${reputationAddress}`)
  console.log(`AURA_PERMISSIONS_CONTRACT=${permissionsAddress}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
