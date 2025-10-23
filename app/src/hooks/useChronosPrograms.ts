import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { PROGRAM_IDS, NETWORK_CONFIG } from '../config/programs';
import { useState } from 'react';
import { AnchorProvider } from '@coral-xyz/anchor';

// Simple cache to prevent repeated RPC calls
const vaultCache = new Map<string, { exists: boolean; vaultAddress?: PublicKey; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// Helper to create instruction discriminator (first 8 bytes of sha256 hash of "global:instruction_name")
const getInstructionDiscriminator = (name: string): Buffer => {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
  return hash.slice(0, 8);
};

/**
 * Hook for interacting with CHRONOS Vault program
 */
export function useChronosVault() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProgramInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const accountInfo = await connection.getAccountInfo(PROGRAM_IDS.CHRONOS_VAULT);
      return accountInfo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch program info');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkProgramDeployed = async () => {
    const info = await getProgramInfo();
    return info !== null && info.executable;
  };

  /**
   * Check if a vault already exists for the connected wallet
   */
  const checkVaultExists = async (): Promise<{ exists: boolean; vaultAddress?: PublicKey }> => {
    if (!wallet.publicKey) {
      return { exists: false };
    }

    const cacheKey = wallet.publicKey.toBase58();

    // Check cache first
    const cached = vaultCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached vault data');
      return { exists: cached.exists, vaultAddress: cached.vaultAddress };
    }

    try {
      const programId = PROGRAM_IDS.CHRONOS_VAULT;
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), wallet.publicKey.toBuffer()],
        programId
      );

      const accountInfo = await connection.getAccountInfo(vaultPda);

      const result = accountInfo && accountInfo.owner.equals(programId)
        ? { exists: true, vaultAddress: vaultPda }
        : { exists: false };

      // Cache the result
      vaultCache.set(cacheKey, { ...result, timestamp: Date.now() });

      if (result.exists) {
        console.log('Vault already exists at:', vaultPda.toBase58());
      }

      return result;
    } catch (err) {
      console.error('Error checking vault existence:', err);
      return { exists: false };
    }
  };

  /**
   * Initialize a new vault
   */
  const initializeVault = async (
    strategyType: 'YieldOptimization' | 'DeltaNeutral' | 'Arbitrage',
    riskLevel: number,
    rebalanceFrequency: number
  ) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('=== Starting vault initialization ===');
      console.log('Params:', { strategyType, riskLevel, rebalanceFrequency });

      // Check if vault already exists
      const { exists, vaultAddress } = await checkVaultExists();
      if (exists && vaultAddress) {
        const message = `Vault already exists at ${vaultAddress.toBase58()}`;
        console.log(message);
        setError(message);
        throw new Error(message);
      }

      // Derive vault PDA
      const programId = PROGRAM_IDS.CHRONOS_VAULT;
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), wallet.publicKey.toBuffer()],
        programId
      );
      console.log('Vault PDA:', vaultPda.toBase58());

      // Build instruction data manually
      // Format: [discriminator (8 bytes)] [strategy_type (1 byte)] [risk_level (1 byte)] [rebalance_frequency (8 bytes)]
      const discriminator = getInstructionDiscriminator('initialize_vault');

      // Map strategy type to enum index
      const strategyIndex = strategyType === 'YieldOptimization' ? 0 : strategyType === 'DeltaNeutral' ? 1 : 2;

      // Create instruction data buffer
      const data = Buffer.alloc(18); // 8 + 1 + 1 + 8
      discriminator.copy(data, 0);
      data.writeUInt8(strategyIndex, 8); // strategy_type enum
      data.writeUInt8(riskLevel, 9); // risk_level
      data.writeBigInt64LE(BigInt(rebalanceFrequency), 10); // rebalance_frequency

      console.log('Instruction data:', data.toString('hex'));

      // Create the instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: vaultPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });

      console.log('Sending transaction...');
      const signature = await provider.sendAndConfirm(transaction);

      console.log('✅ Transaction successful!');
      console.log('Signature:', signature);
      console.log('Vault address:', vaultPda.toBase58());
      console.log('View on Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      return { signature, vaultAddress: vaultPda };
    } catch (err: any) {
      console.error('=== Error initializing vault ===');
      console.error('Error object:', err);

      // Check if it's the "already processed" error
      if (err?.message?.includes('already been processed')) {
        const message = 'Vault already exists for this wallet';
        setError(message);
        throw new Error(message);
      }

      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize vault';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Deposit into vault
   */
  const deposit = async (amount: number, tokenMint: PublicKey) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_VAULT;

      // Derive vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), wallet.publicKey.toBuffer()],
        programId
      );

      // Derive user position PDA
      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('position'), vaultPda.toBuffer(), wallet.publicKey.toBuffer()],
        programId
      );

      // Token program and ATA program
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

      // Derive vault token account (ATA)
      const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
        [
          vaultPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          tokenMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get user's token account (ATA)
      const [userTokenAccount] = PublicKey.findProgramAddressSync(
        [
          wallet.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          tokenMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Build instruction data
      const discriminator = getInstructionDiscriminator('deposit');
      const data = Buffer.alloc(8 + 8); // discriminator + amount
      discriminator.copy(data, 0);
      data.writeBigUInt64LE(BigInt(Math.floor(amount * 1e6)), 8); // Amount with 6 decimals

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: vaultPda, isSigner: false, isWritable: true },
          { pubkey: userPositionPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Deposit successful:', signature);
      return { signature };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to deposit';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraw from vault
   */
  const withdraw = async (shares: number, tokenMint: PublicKey) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_VAULT;

      // Derive vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), wallet.publicKey.toBuffer()],
        programId
      );

      // Derive user position PDA
      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('position'), vaultPda.toBuffer(), wallet.publicKey.toBuffer()],
        programId
      );

      // Token program and ATA program
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

      // Derive vault token account (ATA)
      const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
        [
          vaultPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          tokenMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get user's token account (ATA)
      const [userTokenAccount] = PublicKey.findProgramAddressSync(
        [
          wallet.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          tokenMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Build instruction data
      const discriminator = getInstructionDiscriminator('withdraw');
      const data = Buffer.alloc(8 + 8); // discriminator + shares
      discriminator.copy(data, 0);
      data.writeBigUInt64LE(BigInt(Math.floor(shares * 1e6)), 8); // Shares with 6 decimals

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: vaultPda, isSigner: false, isWritable: true },
          { pubkey: userPositionPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Withdrawal successful:', signature);
      return { signature };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to withdraw';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get vault statistics
   */
  const getVaultStats = async () => {
    try {
      const programId = PROGRAM_IDS.CHRONOS_VAULT;

      // Get all vault accounts
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { dataSize: 200 } // Approximate vault account size
        ]
      });

      let totalValueLocked = 0;
      let activeVaults = accounts.length;
      let totalDeposits = 0;

      for (const { account } of accounts) {
        try {
          const data = account.data;
          if (data.length < 100) continue;

          // Read total_deposits (at offset 41)
          const deposits = data.readBigUInt64LE(41);
          totalDeposits += Number(deposits);
        } catch (err) {
          console.error('Error parsing vault:', err);
        }
      }

      // Convert from lamports to SOL (assuming deposits are in lamports)
      totalValueLocked = totalDeposits / 1e9;

      return {
        totalValueLocked,
        activeVaults,
        avgAPY: 0, // Would need historical data to calculate
      };
    } catch (err) {
      console.error('Error fetching vault stats:', err);
      return {
        totalValueLocked: 0,
        activeVaults: 0,
        avgAPY: 0,
      };
    }
  };

  return {
    programId: PROGRAM_IDS.CHRONOS_VAULT,
    getProgramInfo,
    checkProgramDeployed,
    checkVaultExists,
    initializeVault,
    deposit,
    withdraw,
    getVaultStats,
    loading,
    error,
  };
}

/**
 * Hook for interacting with CHRONOS DEX program
 */
export function useChronosDex() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProgramInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const accountInfo = await connection.getAccountInfo(PROGRAM_IDS.CHRONOS_DEX);
      return accountInfo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch program info');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkProgramDeployed = async () => {
    const info = await getProgramInfo();
    return info !== null && info.executable;
  };

  /**
   * Check if a market already exists for the current wallet
   */
  const checkMarketExists = async (): Promise<{ exists: boolean; marketAddress?: PublicKey }> => {
    if (!wallet.publicKey) {
      return { exists: false };
    }

    try {
      const programId = PROGRAM_IDS.CHRONOS_DEX;
      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), wallet.publicKey.toBuffer()],
        programId
      );

      const accountInfo = await connection.getAccountInfo(marketPda);

      if (accountInfo && accountInfo.owner.equals(programId)) {
        console.log('Market already exists at:', marketPda.toBase58());
        return { exists: true, marketAddress: marketPda };
      }

      return { exists: false };
    } catch (err) {
      console.error('Error checking market existence:', err);
      return { exists: false };
    }
  };

  /**
   * Initialize a new DEX market
   */
  const initializeMarket = async (baseMint: PublicKey, quoteMint: PublicKey) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      // Check if market already exists
      const { exists, marketAddress } = await checkMarketExists();
      if (exists && marketAddress) {
        throw new Error(`Market already exists at ${marketAddress.toBase58()}`);
      }

      const programId = PROGRAM_IDS.CHRONOS_DEX;

      // Derive market PDA
      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), wallet.publicKey.toBuffer()],
        programId
      );

      // Build instruction data
      const discriminator = getInstructionDiscriminator('initialize_market');
      const data = Buffer.alloc(8 + 32 + 32); // discriminator + base_mint + quote_mint
      discriminator.copy(data, 0);
      baseMint.toBuffer().copy(data, 8);
      quoteMint.toBuffer().copy(data, 40);

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: marketPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Market initialized:', marketPda.toBase58());
      return { signature, marketAddress: marketPda };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize market';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Place an order on the DEX
   */
  const placeOrder = async (
    marketAddress: PublicKey,
    side: 'Buy' | 'Sell',
    price: number,
    amount: number,
    slotReservationSeconds: number
  ) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_DEX;

      // Get market account to get current batch ID
      const marketAccount = await connection.getAccountInfo(marketAddress);
      if (!marketAccount) {
        throw new Error('Market not found');
      }

      // Parse current_batch_id from market account
      // Market struct: discriminator(8) + authority(32) + base_mint(32) + quote_mint(32) + current_batch_id(8)
      // Offset: 8 + 32 + 32 + 32 = 104 bytes
      const currentBatchId = marketAccount.data.readBigUInt64LE(104);

      // Derive order PDA
      const [orderPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('order'),
          marketAddress.toBuffer(),
          wallet.publicKey.toBuffer(),
          Buffer.from(new BigUint64Array([currentBatchId]).buffer),
        ],
        programId
      );

      // Calculate slot reservation time (current time + seconds)
      const slotReservationTime = Math.floor(Date.now() / 1000) + slotReservationSeconds;

      // Build instruction data
      const discriminator = getInstructionDiscriminator('place_order');
      const sideIndex = side === 'Buy' ? 0 : 1;

      const data = Buffer.alloc(8 + 1 + 8 + 8 + 8); // discriminator + side + price + amount + slot_time
      discriminator.copy(data, 0);
      data.writeUInt8(sideIndex, 8);
      data.writeBigUInt64LE(BigInt(Math.floor(price * 1_000_000)), 9); // Price with 6 decimals
      data.writeBigUInt64LE(BigInt(Math.floor(amount * 1e9)), 17); // Amount in lamports
      data.writeBigInt64LE(BigInt(slotReservationTime), 25);

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: marketAddress, isSigner: false, isWritable: false },
          { pubkey: orderPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Order placed:', orderPda.toBase58());
      return { signature, orderAddress: orderPda };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to place order';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel an order
   */
  const cancelOrder = async (orderAddress: PublicKey) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_DEX;

      // Build instruction data
      const discriminator = getInstructionDiscriminator('cancel_order');

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orderAddress, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        ],
        programId,
        data: discriminator,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Order cancelled');
      return { signature };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch all orders for a market
   */
  const getMarketOrders = async (marketAddress: PublicKey) => {
    try {
      const programId = PROGRAM_IDS.CHRONOS_DEX;

      // Get all program accounts that are orders for this market
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8, // Skip discriminator
              bytes: marketAddress.toBase58(),
            },
          },
        ],
      });

      // Parse order data
      const orders = accounts.map(({ pubkey, account }) => {
        try {
          const data = account.data;

          // Order struct: discriminator(8) + market(32) + trader(32) + side(1) + price(8) + amount(8) + filled_amount(8) + slot_reservation_time(8) + status(1) + created_at(8) + batch_id(8)
          const market = new PublicKey(data.slice(8, 40));
          const trader = new PublicKey(data.slice(40, 72));
          const side = data.readUInt8(72); // 0 = Buy, 1 = Sell
          const price = data.readBigUInt64LE(73);
          const amount = data.readBigUInt64LE(81);
          const filledAmount = data.readBigUInt64LE(89);
          const slotReservationTime = data.readBigInt64LE(97);
          const status = data.readUInt8(105); // 0 = Open, 1 = PartiallyFilled, 2 = Filled, 3 = Cancelled
          const createdAt = data.readBigInt64LE(106);
          const batchId = data.readBigUInt64LE(114);

          return {
            address: pubkey.toBase58(),
            market: market.toBase58(),
            trader: trader.toBase58(),
            side: side === 0 ? 'Buy' : 'Sell',
            price: Number(price) / 1_000_000, // Convert from 6 decimals
            amount: Number(amount) / 1e9, // Convert from lamports
            filledAmount: Number(filledAmount) / 1e9,
            slotReservationTime: Number(slotReservationTime),
            status: ['Open', 'PartiallyFilled', 'Filled', 'Cancelled'][status],
            createdAt: Number(createdAt),
            batchId: Number(batchId),
          };
        } catch (err) {
          console.error('Error parsing order:', err);
          return null;
        }
      }).filter(order => order !== null);

      return orders;
    } catch (err) {
      console.error('Error fetching market orders:', err);
      return [];
    }
  };

  /**
   * Fetch orders for the current user
   */
  const getUserOrders = async () => {
    if (!wallet.publicKey) {
      return [];
    }

    try {
      const programId = PROGRAM_IDS.CHRONOS_DEX;

      // Get all program accounts that are orders for this user
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 40, // Skip discriminator(8) + market(32)
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ],
      });

      // Parse order data (same as getMarketOrders)
      const orders = accounts.map(({ pubkey, account }) => {
        try {
          const data = account.data;

          const market = new PublicKey(data.slice(8, 40));
          const trader = new PublicKey(data.slice(40, 72));
          const side = data.readUInt8(72);
          const price = data.readBigUInt64LE(73);
          const amount = data.readBigUInt64LE(81);
          const filledAmount = data.readBigUInt64LE(89);
          const slotReservationTime = data.readBigInt64LE(97);
          const status = data.readUInt8(105);
          const createdAt = data.readBigInt64LE(106);
          const batchId = data.readBigUInt64LE(114);

          return {
            address: pubkey.toBase58(),
            market: market.toBase58(),
            trader: trader.toBase58(),
            side: side === 0 ? 'Buy' : 'Sell',
            price: Number(price) / 1_000_000,
            amount: Number(amount) / 1e9,
            filledAmount: Number(filledAmount) / 1e9,
            slotReservationTime: Number(slotReservationTime),
            status: ['Open', 'PartiallyFilled', 'Filled', 'Cancelled'][status],
            createdAt: Number(createdAt),
            batchId: Number(batchId),
          };
        } catch (err) {
          console.error('Error parsing order:', err);
          return null;
        }
      }).filter(order => order !== null);

      return orders;
    } catch (err) {
      console.error('Error fetching user orders:', err);
      return [];
    }
  };

  /**
   * Get DEX statistics
   */
  const getDexStats = async () => {
    try {
      const programId = PROGRAM_IDS.CHRONOS_DEX;

      // Get all order accounts
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { dataSize: 200 } // Approximate order account size
        ]
      });

      let totalVolume = 0;
      let activeOrders = 0;
      let mevPrevented = 0;

      for (const { account } of accounts) {
        try {
          const data = account.data;
          if (data.length < 120) continue;

          const price = data.readBigUInt64LE(73);
          const amount = data.readBigUInt64LE(81);
          const filledAmount = data.readBigUInt64LE(89);
          const status = data.readUInt8(105);

          // Calculate volume from filled orders
          if (status === 2) { // Filled
            const orderVolume = (Number(price) / 1_000_000) * (Number(filledAmount) / 1e9);
            totalVolume += orderVolume;
          }

          // Count active orders
          if (status === 0 || status === 1) { // Open or PartiallyFilled
            activeOrders++;
          }

          // Estimate MEV prevented (10% of total volume as a heuristic)
          mevPrevented = totalVolume * 0.1;
        } catch (err) {
          console.error('Error parsing order:', err);
        }
      }

      return {
        totalVolume,
        activeOrders,
        mevPrevented,
        avgExecutionTime: 30, // ms - would need real timing data
      };
    } catch (err) {
      console.error('Error fetching DEX stats:', err);
      return {
        totalVolume: 0,
        activeOrders: 0,
        mevPrevented: 0,
        avgExecutionTime: 0,
      };
    }
  };

  return {
    programId: PROGRAM_IDS.CHRONOS_DEX,
    getProgramInfo,
    checkProgramDeployed,
    checkMarketExists,
    initializeMarket,
    placeOrder,
    cancelOrder,
    getMarketOrders,
    getUserOrders,
    getDexStats,
    loading,
    error,
  };
}

/**
 * Hook for interacting with CHRONOS Market program
 */
export function useChronosMarket() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProgramInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const accountInfo = await connection.getAccountInfo(PROGRAM_IDS.CHRONOS_MARKET);
      return accountInfo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch program info');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkProgramDeployed = async () => {
    const info = await getProgramInfo();
    return info !== null && info.executable;
  };

  /**
   * Mint a Slot NFT
   */
  const mintSlotNFT = async (slotTime: number, capacity: number) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_MARKET;

      // Derive slot NFT PDA
      const [slotNftPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('slot_nft'),
          wallet.publicKey.toBuffer(),
          Buffer.from(new BigInt64Array([BigInt(slotTime)]).buffer),
        ],
        programId
      );

      // Build instruction data
      const discriminator = getInstructionDiscriminator('mint_slot_nft');
      const data = Buffer.alloc(8 + 8 + 8); // discriminator + slot_time + capacity
      discriminator.copy(data, 0);
      data.writeBigInt64LE(BigInt(slotTime), 8);
      data.writeBigUInt64LE(BigInt(capacity), 16);

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: slotNftPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Slot NFT minted:', slotNftPda.toBase58());
      return { signature, slotNftAddress: slotNftPda };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mint slot NFT';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a Dutch auction for a slot NFT
   */
  const createAuction = async (
    slotNftAddress: PublicKey,
    startingPrice: number,
    reservePrice: number,
    durationSeconds: number
  ) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_MARKET;

      // Derive auction PDA
      const [auctionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('auction'), slotNftAddress.toBuffer()],
        programId
      );

      // Build instruction data
      const discriminator = getInstructionDiscriminator('create_auction');
      const data = Buffer.alloc(8 + 8 + 8 + 8); // discriminator + starting_price + reserve_price + duration
      discriminator.copy(data, 0);
      data.writeBigUInt64LE(BigInt(Math.floor(startingPrice * 1e9)), 8); // Convert to lamports
      data.writeBigUInt64LE(BigInt(Math.floor(reservePrice * 1e9)), 16);
      data.writeBigInt64LE(BigInt(durationSeconds), 24);

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: auctionPda, isSigner: false, isWritable: true },
          { pubkey: slotNftAddress, isSigner: false, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Auction created:', auctionPda.toBase58());
      return { signature, auctionAddress: auctionPda };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create auction';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Place a bid on a Dutch auction
   */
  const placeBid = async (auctionAddress: PublicKey) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_MARKET;

      // Build instruction data
      const discriminator = getInstructionDiscriminator('place_bid');

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: auctionAddress, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        ],
        programId,
        data: discriminator,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Bid placed successfully');
      return { signature };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to place bid';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all slot NFTs for the current user
   */
  const getUserSlotNFTs = async () => {
    if (!wallet.publicKey) {
      return [];
    }

    try {
      const programId = PROGRAM_IDS.CHRONOS_MARKET;

      // Get all program accounts that are slot NFTs for this user
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8, // Skip discriminator
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ],
      });

      // Parse slot NFT data
      const slotNFTs = accounts.map(({ pubkey, account }) => {
        try {
          const data = account.data;

          // Check if this is a slot NFT (has the right size)
          // SlotNFT: discriminator(8) + owner(32) + slot_time(8) + capacity(8) + used_capacity(8) + status(1) + minted_at(8) + bump(1) = 74 bytes
          if (data.length !== 74) {
            return null;
          }

          const owner = new PublicKey(data.subarray(8, 40));
          const slotTime = data.readBigInt64LE(40);
          const capacity = data.readBigUInt64LE(48);
          const usedCapacity = data.readBigUInt64LE(56);
          const status = data.readUInt8(64); // 0 = Available, 1 = Reserved, 2 = Executed, 3 = Expired
          const mintedAt = data.readBigInt64LE(65);

          return {
            address: pubkey.toBase58(),
            owner: owner.toBase58(),
            slotTime: Number(slotTime),
            capacity: Number(capacity),
            usedCapacity: Number(usedCapacity),
            status: ['Available', 'Reserved', 'Executed', 'Expired'][status],
            mintedAt: Number(mintedAt),
          };
        } catch (err) {
          console.error('Error parsing slot NFT:', err);
          return null;
        }
      }).filter(nft => nft !== null);

      return slotNFTs;
    } catch (err) {
      console.error('Error fetching user slot NFTs:', err);
      return [];
    }
  };

  /**
   * Get all active auctions
   */
  const getActiveAuctions = async () => {
    try {
      const programId = PROGRAM_IDS.CHRONOS_MARKET;

      // Get all program accounts
      const accounts = await connection.getProgramAccounts(programId);

      // Parse auction data
      const auctions = accounts.map(({ pubkey, account }) => {
        try {
          const data = account.data;

          // Check if this is an auction account (has the right size)
          // Auction: discriminator(8) + slot_nft(32) + seller(32) + winner(33) + starting_price(8) + reserve_price(8) + current_price(8) + final_price(8) + start_time(8) + end_time(8) + status(1) + bump(1) = 155 bytes
          if (data.length !== 155) {
            return null;
          }

          const slotNft = new PublicKey(data.subarray(8, 40));
          const seller = new PublicKey(data.subarray(40, 72));
          const hasWinner = data.readUInt8(72) === 1;
          const winner = hasWinner ? new PublicKey(data.subarray(73, 105)) : null;
          const startingPrice = data.readBigUInt64LE(105);
          const reservePrice = data.readBigUInt64LE(113);
          const currentPrice = data.readBigUInt64LE(121);
          const finalPrice = data.readBigUInt64LE(129);
          const startTime = data.readBigInt64LE(137);
          const endTime = data.readBigInt64LE(145);
          const status = data.readUInt8(153); // 0 = Active, 1 = Sold, 2 = Cancelled, 3 = Expired

          // Only return active auctions
          if (status !== 0) {
            return null;
          }

          return {
            address: pubkey.toBase58(),
            slotNft: slotNft.toBase58(),
            seller: seller.toBase58(),
            winner: winner?.toBase58() || null,
            startingPrice: Number(startingPrice) / 1e9,
            reservePrice: Number(reservePrice) / 1e9,
            currentPrice: Number(currentPrice) / 1e9,
            finalPrice: Number(finalPrice) / 1e9,
            startTime: Number(startTime),
            endTime: Number(endTime),
            status: ['Active', 'Sold', 'Cancelled', 'Expired'][status],
          };
        } catch (err) {
          console.error('Error parsing auction:', err);
          return null;
        }
      }).filter(auction => auction !== null);

      return auctions;
    } catch (err) {
      console.error('Error fetching active auctions:', err);
      return [];
    }
  };

  /**
   * Get market statistics
   */
  const getMarketStats = async () => {
    try {
      const programId = PROGRAM_IDS.CHRONOS_MARKET;

      // Get all program accounts
      const accounts = await connection.getProgramAccounts(programId);

      let totalSlotsMinted = 0;
      let tradingVolume = 0;
      let activeLeases = 0;
      let floorPrice = Number.MAX_VALUE;

      for (const { account } of accounts) {
        try {
          const data = account.data;

          // Check if this is a slot NFT account (size ~100 bytes)
          if (data.length >= 90 && data.length <= 110) {
            totalSlotsMinted++;

            const status = data.readUInt8(data.length - 10); // Approximate status position
            if (status === 1) { // Reserved
              activeLeases++;
            }
          }

          // Check if this is an auction account (size 155 bytes)
          if (data.length === 155) {
            const startingPrice = data.readBigUInt64LE(105);
            const reservePrice = data.readBigUInt64LE(113);
            const status = data.readUInt8(153);

            // Calculate trading volume from sold auctions
            if (status === 1) { // Sold
              const finalPrice = data.readBigUInt64LE(129);
              tradingVolume += Number(finalPrice) / 1e9;
            }

            // Track floor price from active auctions
            if (status === 0) { // Active
              const currentFloor = Number(reservePrice) / 1e9;
              if (currentFloor < floorPrice) {
                floorPrice = currentFloor;
              }
            }
          }
        } catch (err) {
          console.error('Error parsing market account:', err);
        }
      }

      return {
        totalSlotsMinted,
        tradingVolume,
        activeLeases,
        floorPrice: floorPrice === Number.MAX_VALUE ? 0 : floorPrice,
      };
    } catch (err) {
      console.error('Error fetching market stats:', err);
      return {
        totalSlotsMinted: 0,
        tradingVolume: 0,
        activeLeases: 0,
        floorPrice: 0,
      };
    }
  };

  return {
    programId: PROGRAM_IDS.CHRONOS_MARKET,
    getProgramInfo,
    checkProgramDeployed,
    mintSlotNFT,
    createAuction,
    placeBid,
    getUserSlotNFTs,
    getActiveAuctions,
    getMarketStats,
    loading,
    error,
  };
}

/**
 * Hook for interacting with CHRONOS Orchestrator program
 */
export function useChronosOrchestrator() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProgramInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const accountInfo = await connection.getAccountInfo(PROGRAM_IDS.CHRONOS_ORCHESTRATOR);
      return accountInfo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch program info');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkProgramDeployed = async () => {
    const info = await getProgramInfo();
    return info !== null && info.executable;
  };

  /**
   * Initialize orchestrator
   */
  const initializeOrchestrator = async () => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_ORCHESTRATOR;

      // Derive orchestrator PDA
      const [orchestratorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('orchestrator'), wallet.publicKey.toBuffer()],
        programId
      );

      // Build instruction data
      const discriminator = getInstructionDiscriminator('initialize');

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orchestratorPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: discriminator,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Orchestrator initialized:', signature);
      return { signature, orchestratorAddress: orchestratorPda.toBase58() };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize orchestrator';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reserve a Raiku slot
   */
  const reserveRaikuSlot = async (slotTime: number, reservationType: number, priority: number) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_ORCHESTRATOR;

      // Derive orchestrator PDA
      const [orchestratorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('orchestrator'), wallet.publicKey.toBuffer()],
        programId
      );

      // Derive reservation PDA
      const slotTimeBytes = Buffer.alloc(8);
      slotTimeBytes.writeBigInt64LE(BigInt(slotTime));

      const [reservationPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('reservation'), orchestratorPda.toBuffer(), wallet.publicKey.toBuffer(), slotTimeBytes],
        programId
      );

      // Build instruction data
      const discriminator = getInstructionDiscriminator('reserve_raiku_slot');
      const data = Buffer.alloc(8 + 8 + 1 + 1); // discriminator + slot_time + reservation_type + priority
      discriminator.copy(data, 0);
      data.writeBigInt64LE(BigInt(slotTime), 8);
      data.writeUInt8(reservationType, 16);
      data.writeUInt8(priority, 17);

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orchestratorPda, isSigner: false, isWritable: true },
          { pubkey: reservationPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Raiku slot reserved:', signature);
      return { signature, reservationAddress: reservationPda.toBase58() };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reserve slot';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create execution batch
   */
  const createExecutionBatch = async (batchSize: number) => {
    if (!anchorWallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const programId = PROGRAM_IDS.CHRONOS_ORCHESTRATOR;

      // Derive orchestrator PDA
      const [orchestratorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('orchestrator'), wallet.publicKey.toBuffer()],
        programId
      );

      // Derive batch PDA (using timestamp for uniqueness)
      const timestamp = Date.now();
      const timestampBytes = Buffer.alloc(8);
      timestampBytes.writeBigInt64LE(BigInt(timestamp));

      const [batchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('batch'), orchestratorPda.toBuffer(), wallet.publicKey.toBuffer(), timestampBytes],
        programId
      );

      // Build instruction data
      const discriminator = getInstructionDiscriminator('create_execution_batch');
      const data = Buffer.alloc(8 + 1); // discriminator + batch_size
      discriminator.copy(data, 0);
      data.writeUInt8(batchSize, 8);

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: orchestratorPda, isSigner: false, isWritable: true },
          { pubkey: batchPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
      const signature = await provider.sendAndConfirm(transaction);

      console.log('Execution batch created:', signature);
      return { signature, batchAddress: batchPda.toBase58() };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create batch';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    programId: PROGRAM_IDS.CHRONOS_ORCHESTRATOR,
    getProgramInfo,
    checkProgramDeployed,
    initializeOrchestrator,
    reserveRaikuSlot,
    createExecutionBatch,
    loading,
    error,
  };
}

/**
 * Hook to check all programs deployment status
 */
export function useAllPrograms() {
  const vault = useChronosVault();
  const dex = useChronosDex();
  const market = useChronosMarket();
  const orchestrator = useChronosOrchestrator();

  const checkAllDeployed = async () => {
    const [vaultDeployed, dexDeployed, marketDeployed, orchestratorDeployed] = await Promise.all([
      vault.checkProgramDeployed(),
      dex.checkProgramDeployed(),
      market.checkProgramDeployed(),
      orchestrator.checkProgramDeployed(),
    ]);

    return {
      vault: vaultDeployed,
      dex: dexDeployed,
      market: marketDeployed,
      orchestrator: orchestratorDeployed,
      allDeployed: vaultDeployed && dexDeployed && marketDeployed && orchestratorDeployed,
    };
  };

  return {
    vault,
    dex,
    market,
    orchestrator,
    checkAllDeployed,
  };
}
