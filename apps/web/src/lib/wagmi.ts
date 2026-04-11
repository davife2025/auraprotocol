import { createConfig, http } from 'wagmi'
import { defineChain } from 'viem'
import { injected, metaMask } from 'wagmi/connectors'

// Monad Testnet
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://testnet.monadvision.xyz' },
  },
  testnet: true,
})

// Monad Mainnet
export const monadMainnet = defineChain({
  id: 10143, // update to mainnet chain ID when live
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://monadvision.xyz' },
  },
})

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected(), metaMask()],
  transports: {
    [monadTestnet.id]: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? 'https://testnet-rpc.monad.xyz'),
  },
})
