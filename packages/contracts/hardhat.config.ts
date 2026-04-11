import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'dotenv/config'

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '0x' + '0'.repeat(64)

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    monadTestnet: {
      url: process.env.MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz',
      chainId: 10143,
      accounts: [DEPLOYER_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    monadMainnet: {
      url: process.env.MONAD_MAINNET_RPC ?? 'https://rpc.monad.xyz',
      chainId: 10143,
      accounts: [DEPLOYER_PRIVATE_KEY],
      gasPrice: 'auto',
    },
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}

export default config
