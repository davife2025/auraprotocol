#!/usr/bin/env node
/**
 * Aura Protocol — Stellar/Soroban Contract Deployment
 *
 * Prerequisites:
 *   - Rust + cargo installed
 *   - soroban-cli installed: cargo install soroban-cli --locked
 *   - STELLAR_SECRET_KEY set in .env
 *
 * Usage:
 *   npx tsx scripts/deploy-stellar.ts --network testnet
 *   npx tsx scripts/deploy-stellar.ts --network mainnet
 */

import { execSync } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import * as StellarSdk from '@stellar/stellar-sdk'

const { Keypair, Networks } = StellarSdk

const NETWORKS = {
  testnet: {
    rpc:                'https://soroban-testnet.stellar.org',
    networkPassphrase:  Networks.TESTNET,
    friendbotUrl:       'https://friendbot.stellar.org',
  },
  mainnet: {
    rpc:                'https://mainnet.sorobanrpc.com',
    networkPassphrase:  Networks.PUBLIC,
    friendbotUrl:       null,
  },
}

async function deploy() {
  const networkArg = process.argv.includes('--network')
    ? process.argv[process.argv.indexOf('--network') + 1]
    : 'testnet'

  const network = networkArg as 'testnet' | 'mainnet'
  const net = NETWORKS[network]

  const secretKey = process.env.STELLAR_SECRET_KEY
  if (!secretKey) throw new Error('STELLAR_SECRET_KEY not set')

  const keypair = Keypair.fromSecret(secretKey)
  console.log('Deploying Aura Protocol contracts to Stellar', network.toUpperCase())
  console.log('Deployer:', keypair.publicKey(), '\n')

  const contractsDir = join(__dirname, '..', 'contracts-stellar')
  const contracts = [
    'aura-identity',
    'aura-reputation',
    'aura-permissions',
    'aura-meeting-factory',
    'aura-token',
  ]

  const deployed: Record<string, string> = {}

  for (const name of contracts) {
    console.log(`Building ${name}...`)
    try {
      execSync(`cd ${contractsDir}/${name} && soroban contract build 2>&1`, { stdio: 'inherit' })

const wasmPath = `${contractsDir}/target/wasm32v1-none/release/${name.replace(/-/g, '_')}.wasm`

      console.log(`Uploading ${name} WASM...`)
      const uploadResult = execSync(
        `soroban contract upload --wasm ${wasmPath} --source ${secretKey} --rpc-url ${net.rpc} --network-passphrase "${net.networkPassphrase}" 2>&1`
      ).toString().trim()

      const wasmHash = uploadResult.split('\n').pop()?.trim() ?? ''
      console.log(`  WASM hash: ${wasmHash}`)

      console.log(`Deploying ${name}...`)
      const deployResult = execSync(
        `soroban contract deploy --wasm-hash ${wasmHash} --source ${secretKey} --rpc-url ${net.rpc} --network-passphrase "${net.networkPassphrase}" 2>&1`
      ).toString().trim()

      const contractId = deployResult.split('\n').pop()?.trim() ?? ''
      deployed[name] = contractId
      console.log(`  Contract ID: ${contractId}\n`)
    } catch (err) {
      console.error(`  Failed to deploy ${name}:`, err)
    }
  }

  // Initialise contracts
  console.log('Initialising contracts...')
  const adminKey = keypair.publicKey()

  for (const [name, contractId] of Object.entries(deployed)) {
    const repId = deployed['aura-reputation'] ?? ''
    const args = name === 'aura-meeting-factory'
      ? `'{"admin":"${adminKey}","reputation_contract":"${repId}"}'`
      : `'{"admin":"${adminKey}"}'`

    try {
      execSync(
        `soroban contract invoke --id ${contractId} --source ${secretKey} --rpc-url ${net.rpc} --network-passphrase "${net.networkPassphrase}" -- init --admin ${adminKey}${name === 'aura-meeting-factory' ? ` --reputation_contract ${repId}` : ''} 2>&1`,
        { stdio: 'inherit' }
      )
      console.log(`  ${name} initialised`)
    } catch { /* some may need different init args */ }
  }

  // Save deployment
  const output = {
    network,
    networkPassphrase: net.networkPassphrase,
    deployedAt: new Date().toISOString(),
    deployer: keypair.publicKey(),
    contracts: {
      identity:       deployed['aura-identity']        ?? '',
      reputation:     deployed['aura-reputation']      ?? '',
      permissions:    deployed['aura-permissions']     ?? '',
      meetingFactory: deployed['aura-meeting-factory'] ?? '',
      token:          deployed['aura-token']           ?? '',
    },
  }

  const outPath = join(__dirname, '..', `deployments-stellar-${network}.json`)
  writeFileSync(outPath, JSON.stringify(output, null, 2))

  console.log('\n=== STELLAR DEPLOYMENT COMPLETE ===')
  console.log('\nAdd these to your .env:')
  console.log(`STELLAR_NETWORK=${network}`)
  console.log(`STELLAR_RPC_URL=${net.rpc}`)
  console.log(`STELLAR_NETWORK_PASSPHRASE="${net.networkPassphrase}"`)
  Object.entries(output.contracts).forEach(([key, val]) => {
    console.log(`STELLAR_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}_CONTRACT=${val}`)
  })
}

deploy().catch(err => { console.error(err); process.exit(1) })
