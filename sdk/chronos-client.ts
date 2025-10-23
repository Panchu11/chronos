/**
 * CHRONOS Protocol - Client SDK
 * 
 * High-level client for interacting with CHRONOS smart contracts
 */

import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getRaikuSDK, ReservationType } from './raiku-mock';

// Types

export interface VaultConfig {
  strategyType: 'YieldOptimization' | 'DeltaNeutral' | 'Arbitrage';
  riskLevel: number; // 1-10
  rebalanceFrequency: number; // seconds
}

export interface OrderParams {
  side: 'Buy' | 'Sell';
  price: number;
  amount: number;
  slotReservationTime: number;
}

export interface SlotNFTParams {
  slotTime: number;
  capacity: number;
}

// CHRONOS Client Class

export class ChronosClient {
  private provider: AnchorProvider;
  private vaultProgram: Program | null = null;
  private dexProgram: Program | null = null;
  private marketProgram: Program | null = null;
  private orchestratorProgram: Program | null = null;
  private raikuSDK = getRaikuSDK();

  constructor(provider: AnchorProvider) {
    this.provider = provider;
  }

  // Vault Operations

  async createVault(config: VaultConfig): Promise<string> {
    if (!this.vaultProgram) {
      throw new Error('Vault program not initialized');
    }

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), this.provider.wallet.publicKey.toBuffer()],
      this.vaultProgram.programId
    );

    const strategyType = { [config.strategyType.toLowerCase()]: {} };
    
    const tx = await this.vaultProgram.methods
      .initializeVault(
        strategyType,
        config.riskLevel,
        new BN(config.rebalanceFrequency)
      )
      .accounts({
        vault: vaultPda,
        authority: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async depositToVault(vaultPda: PublicKey, amount: number): Promise<string> {
    if (!this.vaultProgram) {
      throw new Error('Vault program not initialized');
    }

    const [userPositionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('position'),
        vaultPda.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.vaultProgram.programId
    );

    const tx = await this.vaultProgram.methods
      .deposit(new BN(amount))
      .accounts({
        vault: vaultPda,
        userPosition: userPositionPda,
        user: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async withdrawFromVault(vaultPda: PublicKey, shares: number): Promise<string> {
    if (!this.vaultProgram) {
      throw new Error('Vault program not initialized');
    }

    const [userPositionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('position'),
        vaultPda.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.vaultProgram.programId
    );

    const tx = await this.vaultProgram.methods
      .withdraw(new BN(shares))
      .accounts({
        vault: vaultPda,
        userPosition: userPositionPda,
        user: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async reserveVaultExecutionSlot(
    vaultPda: PublicKey,
    slotTime: number,
    type: ReservationType = ReservationType.AOT
  ): Promise<string> {
    if (!this.vaultProgram) {
      throw new Error('Vault program not initialized');
    }

    // First reserve with Raiku
    const reservation = await this.raikuSDK.reserveSlot(slotTime, type);

    // Then record on-chain
    const reservationType = type === ReservationType.AOT ? { aot: {} } : { jit: {} };
    
    const tx = await this.vaultProgram.methods
      .reserveExecutionSlot(new BN(slotTime), reservationType)
      .accounts({
        vault: vaultPda,
        authority: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  // DEX Operations

  async placeOrder(marketPda: PublicKey, params: OrderParams): Promise<string> {
    if (!this.dexProgram) {
      throw new Error('DEX program not initialized');
    }

    // Reserve slot with Raiku first
    await this.raikuSDK.reserveSlot(
      params.slotReservationTime,
      ReservationType.AOT
    );

    const market = await this.dexProgram.account.market.fetch(marketPda);
    const batchId = market.currentBatchId;

    const [orderPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('order'),
        marketPda.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
        batchId.toArrayLike(Buffer, 'le', 8),
      ],
      this.dexProgram.programId
    );

    const side = params.side === 'Buy' ? { buy: {} } : { sell: {} };

    const tx = await this.dexProgram.methods
      .placeOrder(
        side,
        new BN(params.price),
        new BN(params.amount),
        new BN(params.slotReservationTime)
      )
      .accounts({
        market: marketPda,
        order: orderPda,
        trader: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async cancelOrder(orderPda: PublicKey): Promise<string> {
    if (!this.dexProgram) {
      throw new Error('DEX program not initialized');
    }

    const tx = await this.dexProgram.methods
      .cancelOrder()
      .accounts({
        order: orderPda,
        trader: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  // Market Operations

  async mintSlotNFT(params: SlotNFTParams): Promise<string> {
    if (!this.marketProgram) {
      throw new Error('Market program not initialized');
    }

    const [slotNftPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('slot_nft'),
        this.provider.wallet.publicKey.toBuffer(),
        new BN(params.slotTime).toArrayLike(Buffer, 'le', 8),
      ],
      this.marketProgram.programId
    );

    const tx = await this.marketProgram.methods
      .mintSlotNft(new BN(params.slotTime), new BN(params.capacity))
      .accounts({
        slotNft: slotNftPda,
        minter: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async createAuction(
    slotNftPda: PublicKey,
    startingPrice: number,
    reservePrice: number,
    duration: number
  ): Promise<string> {
    if (!this.marketProgram) {
      throw new Error('Market program not initialized');
    }

    const [auctionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('auction'), slotNftPda.toBuffer()],
      this.marketProgram.programId
    );

    const tx = await this.marketProgram.methods
      .createAuction(
        new BN(startingPrice),
        new BN(reservePrice),
        new BN(duration)
      )
      .accounts({
        auction: auctionPda,
        slotNft: slotNftPda,
        seller: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // Utility Methods

  async getVaultInfo(vaultPda: PublicKey): Promise<any> {
    if (!this.vaultProgram) {
      throw new Error('Vault program not initialized');
    }
    return this.vaultProgram.account.vault.fetch(vaultPda);
  }

  async getUserPosition(vaultPda: PublicKey, userPubkey?: PublicKey): Promise<any> {
    if (!this.vaultProgram) {
      throw new Error('Vault program not initialized');
    }

    const user = userPubkey || this.provider.wallet.publicKey;
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('position'), vaultPda.toBuffer(), user.toBuffer()],
      this.vaultProgram.programId
    );

    return this.vaultProgram.account.userPosition.fetch(positionPda);
  }

  async getMarketInfo(marketPda: PublicKey): Promise<any> {
    if (!this.dexProgram) {
      throw new Error('DEX program not initialized');
    }
    return this.dexProgram.account.market.fetch(marketPda);
  }

  async getSlotNFTInfo(slotNftPda: PublicKey): Promise<any> {
    if (!this.marketProgram) {
      throw new Error('Market program not initialized');
    }
    return this.marketProgram.account.slotNft.fetch(slotNftPda);
  }
}

// Factory function
export function createChronosClient(provider: AnchorProvider): ChronosClient {
  return new ChronosClient(provider);
}

export default ChronosClient;

