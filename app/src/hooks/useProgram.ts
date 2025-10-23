import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { NETWORK_CONFIG } from '../config/programs';

/**
 * Base hook for initializing Anchor programs
 * 
 * Note: This requires IDL files which are currently not available due to build issues.
 * For now, we'll create a provider that can be used for basic interactions.
 */
export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey) {
      return null;
    }

    return new AnchorProvider(
      connection,
      wallet as any,
      {
        commitment: NETWORK_CONFIG.COMMITMENT,
        preflightCommitment: NETWORK_CONFIG.COMMITMENT,
      }
    );
  }, [connection, wallet]);

  return provider;
}

/**
 * Hook to check if wallet is connected and ready
 */
export function useWalletReady() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  return useMemo(() => ({
    isReady: connected && !!publicKey,
    publicKey,
    connection,
  }), [connected, publicKey, connection]);
}

/**
 * Hook to get program account info
 */
export function useProgramInfo(programId: PublicKey) {
  const { connection } = useConnection();

  const getProgramInfo = async () => {
    try {
      const accountInfo = await connection.getAccountInfo(programId);
      return accountInfo;
    } catch (error) {
      console.error('Error fetching program info:', error);
      return null;
    }
  };

  return { getProgramInfo };
}

