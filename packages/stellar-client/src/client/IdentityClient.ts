import * as StellarSdk from '@stellar/stellar-sdk'
import type { StellarConfig, OnchainIdentity, OnchainReputation } from '../types/index.js'

const { SorobanRpc, Contract, TransactionBuilder, BASE_FEE, nativeToScVal, scValToNative, Keypair } = StellarSdk

export class StellarIdentityClient {
  private server: InstanceType<typeof SorobanRpc.Server>
  private keypair: InstanceType<typeof Keypair>
  private config: StellarConfig

  constructor(secretKey: string, config: StellarConfig) {
    this.server = new SorobanRpc.Server(config.rpcUrl, { allowHttp: config.network === 'testnet' })
    this.keypair = Keypair.fromSecret(secretKey)
    this.config = config
  }

  get publicKey(): string {
    return this.keypair.publicKey()
  }

  /**
   * Mint a soulbound identity for a wallet via the Soroban contract
   */
  async mintIdentity(params: {
    toAddress: string
    auraId: string
    metadataUri: string
    permissionsHash: string
  }): Promise<string> {
    const contract = new Contract(this.config.contracts.identity)
    const account = await this.server.getAccount(this.keypair.publicKey())

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(contract.call(
        'mint',
        nativeToScVal(this.keypair.publicKey(), { type: 'address' }),
        nativeToScVal(params.toAddress, { type: 'address' }),
        nativeToScVal(params.auraId),
        nativeToScVal(params.metadataUri),
        nativeToScVal(Buffer.from(params.permissionsHash.replace('0x',''), 'hex'), { type: 'bytes' }),
      ))
      .setTimeout(30)
      .build()

    const prepared = await this.server.prepareTransaction(tx)
    prepared.sign(this.keypair)

    const result = await this.server.sendTransaction(prepared)

    if (result.status === 'ERROR') {
      throw new Error(`Mint failed: ${JSON.stringify(result)}`)
    }

    // Wait for confirmation
    const hash = result.hash
    let confirmation = await this.server.getTransaction(hash)
    let attempts = 0
    while (confirmation.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 30) {
      await new Promise(r => setTimeout(r, 2000))
      confirmation = await this.server.getTransaction(hash)
      attempts++
    }

    return hash
  }

  /**
   * Read identity for a Stellar address
   */
  async getIdentity(address: string): Promise<OnchainIdentity | null> {
    try {
      const contract = new Contract(this.config.contracts.identity)
      const account = await this.server.getAccount(this.keypair.publicKey())

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(contract.call(
          'get_identity',
          nativeToScVal(address, { type: 'address' }),
        ))
        .setTimeout(30)
        .build()

      const result = await this.server.simulateTransaction(tx)

      if (SorobanRpc.Api.isSimulationError(result)) {
        return null
      }

      const value = scValToNative((result as any).result?.retval)
      if (!value) return null

      return {
        tokenId:         value.token_id ?? 0,
        auraId:          value.aura_id ?? '',
        metadataUri:     value.metadata_uri ?? '',
        permissionsHash: value.permissions_hash ? Buffer.from(value.permissions_hash).toString('hex') : '',
        mintedAt:        value.minted_at ?? 0,
        isRevoked:       value.is_revoked ?? false,
      }
    } catch {
      return null
    }
  }

  /**
   * Revoke an agent identity
   */
  async revokeIdentity(walletAddress: string): Promise<string> {
    const contract = new Contract(this.config.contracts.identity)
    const account = await this.server.getAccount(this.keypair.publicKey())

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(contract.call(
        'revoke',
        nativeToScVal(this.keypair.publicKey(), { type: 'address' }),
        nativeToScVal(walletAddress, { type: 'address' }),
      ))
      .setTimeout(30)
      .build()

    const prepared = await this.server.prepareTransaction(tx)
    prepared.sign(this.keypair)
    const result = await this.server.sendTransaction(prepared)
    return result.hash
  }

  /**
   * Read reputation for a Stellar address
   */
  async getReputation(address: string): Promise<OnchainReputation | null> {
    try {
      const contract = new Contract(this.config.contracts.reputation)
      const account = await this.server.getAccount(this.keypair.publicKey())

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(contract.call(
          'get_reputation',
          nativeToScVal(address, { type: 'address' }),
        ))
        .setTimeout(30)
        .build()

      const result = await this.server.simulateTransaction(tx)
      if (SorobanRpc.Api.isSimulationError(result)) return null

      const value = scValToNative((result as any).result?.retval)
      if (!value) return null

      return {
        overallScore:      value.overall_score ?? 0,
        commitmentRate:    value.commitment_rate ?? 0,
        meetingQuality:    value.meeting_quality ?? 0,
        networkingScore:   value.networking_score ?? 0,
        totalInteractions: value.total_interactions ?? 0,
        lastUpdated:       value.last_updated ?? 0,
      }
    } catch {
      return null
    }
  }

  /**
   * Authorise a minter on the identity contract
   */
  async authoriseMinter(minterAddress: string): Promise<string> {
    const contract = new Contract(this.config.contracts.identity)
    const account = await this.server.getAccount(this.keypair.publicKey())

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(contract.call(
        'authorise_minter',
        nativeToScVal(this.keypair.publicKey(), { type: 'address' }),
        nativeToScVal(minterAddress, { type: 'address' }),
      ))
      .setTimeout(30)
      .build()

    const prepared = await this.server.prepareTransaction(tx)
    prepared.sign(this.keypair)
    const result = await this.server.sendTransaction(prepared)
    return result.hash
  }
}
