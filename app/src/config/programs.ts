import { PublicKey } from '@solana/web3.js';

/**
 * Deployed Program IDs on Solana Devnet
 * 
 * These are the actual deployed program addresses.
 * Updated: October 22, 2025
 */

export const PROGRAM_IDS = {
  CHRONOS_VAULT: new PublicKey('EjG3EGtjpC9VtgrzuW6aJ55KcJuWF5buuvhF4S5B7EcP'),
  CHRONOS_DEX: new PublicKey('FstLfRbswUSasgad1grV8ZY5Bh79CcAUe32vRoqNvJo6'),
  CHRONOS_MARKET: new PublicKey('8nAaEjXuKs9NC8MRwiBgyNEiAcY8Ab5YJsAaxnt6JaXJ'),
  CHRONOS_ORCHESTRATOR: new PublicKey('5NyVeVkzxmB2XkrR5EnrEfxNVe82mPWdzSEYH5FBoMgF'),
} as const;

/**
 * Network configuration
 */
export const NETWORK_CONFIG = {
  CLUSTER: 'devnet' as const,
  RPC_ENDPOINT: 'https://api.devnet.solana.com',
  COMMITMENT: 'confirmed' as const,
} as const;

/**
 * Explorer URLs for viewing transactions and accounts
 */
export const EXPLORER_URL = 'https://explorer.solana.com';

export function getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
  return `${EXPLORER_URL}/${type}/${address}?cluster=${NETWORK_CONFIG.CLUSTER}`;
}

