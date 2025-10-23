# CHRONOS Protocol SDK

TypeScript SDK for interacting with CHRONOS Protocol smart contracts and Raiku integration.

## 📦 Installation

```bash
npm install @coral-xyz/anchor @solana/web3.js
```

## 🚀 Quick Start

### Initialize Client

```typescript
import { AnchorProvider } from '@coral-xyz/anchor';
import { createChronosClient } from './sdk/chronos-client';

// Set up provider
const provider = AnchorProvider.env();

// Create client
const chronos = createChronosClient(provider);
```

### Create a Temporal Vault

```typescript
const vaultConfig = {
  strategyType: 'YieldOptimization',
  riskLevel: 5,
  rebalanceFrequency: 3600, // 1 hour
};

const txId = await chronos.createVault(vaultConfig);
console.log('Vault created:', txId);
```

### Deposit to Vault

```typescript
const vaultPda = new PublicKey('...');
const amount = 1_000_000_000; // 1 SOL

const txId = await chronos.depositToVault(vaultPda, amount);
console.log('Deposited:', txId);
```

### Reserve Execution Slot

```typescript
const slotTime = Date.now() + 30000; // 30 seconds from now

const txId = await chronos.reserveVaultExecutionSlot(
  vaultPda,
  slotTime,
  ReservationType.AOT
);
console.log('Slot reserved:', txId);
```

### Place Order on DEX

```typescript
const marketPda = new PublicKey('...');
const orderParams = {
  side: 'Buy',
  price: 1_000_000, // 1 USDC
  amount: 100_000_000, // 0.1 SOL
  slotReservationTime: Date.now() + 10000,
};

const txId = await chronos.placeOrder(marketPda, orderParams);
console.log('Order placed:', txId);
```

### Mint Slot NFT

```typescript
const nftParams = {
  slotTime: Date.now() + 60000, // 1 minute from now
  capacity: 1000,
};

const txId = await chronos.mintSlotNFT(nftParams);
console.log('Slot NFT minted:', txId);
```

## 🔧 Raiku SDK (Mock)

The mock Raiku SDK simulates the official Raiku integration for development.

### Reserve Slot

```typescript
import { getRaikuSDK, ReservationType } from './sdk/raiku-mock';

const raiku = getRaikuSDK();

// Reserve AOT slot
const reservation = await raiku.reserveSlot(
  Date.now() + 30000,
  ReservationType.AOT,
  5 // priority
);

console.log('Reservation:', reservation);
```

### Get Pre-Confirmation

```typescript
const preConf = await raiku.getPreConfirmation(txId);
console.log('Confidence:', preConf.confidence);
console.log('Est. confirmation:', preConf.estimatedConfirmationTime, 'ms');
```

### Get Slot Market Prices

```typescript
const startTime = Date.now();
const endTime = startTime + 60000; // Next minute

const prices = await raiku.getSlotMarketPrices(startTime, endTime);
prices.forEach(p => {
  console.log(`Slot ${p.slotTime}: ${p.currentPrice} lamports (${p.demandLevel})`);
});
```

## 📚 API Reference

### ChronosClient

#### Vault Operations

- `createVault(config: VaultConfig): Promise<string>`
- `depositToVault(vaultPda: PublicKey, amount: number): Promise<string>`
- `withdrawFromVault(vaultPda: PublicKey, shares: number): Promise<string>`
- `reserveVaultExecutionSlot(vaultPda: PublicKey, slotTime: number, type?: ReservationType): Promise<string>`

#### DEX Operations

- `placeOrder(marketPda: PublicKey, params: OrderParams): Promise<string>`
- `cancelOrder(orderPda: PublicKey): Promise<string>`

#### Market Operations

- `mintSlotNFT(params: SlotNFTParams): Promise<string>`
- `createAuction(slotNftPda: PublicKey, startingPrice: number, reservePrice: number, duration: number): Promise<string>`

#### Query Operations

- `getVaultInfo(vaultPda: PublicKey): Promise<any>`
- `getUserPosition(vaultPda: PublicKey, userPubkey?: PublicKey): Promise<any>`
- `getMarketInfo(marketPda: PublicKey): Promise<any>`
- `getSlotNFTInfo(slotNftPda: PublicKey): Promise<any>`

### RaikuSDK

- `reserveSlot(slotTime: number, type: ReservationType, priority?: number): Promise<SlotReservation>`
- `getPreConfirmation(transactionId: string): Promise<PreConfirmation>`
- `getSlotMarketPrices(startTime: number, endTime: number): Promise<SlotMarketPrice[]>`
- `executeWithGuarantee(transaction: Transaction, reservationId: string): Promise<string>`
- `getReservationStatus(reservationId: string): Promise<SlotReservation | null>`
- `cancelReservation(reservationId: string): Promise<boolean>`
- `getNetworkStats(): Promise<NetworkStats>`

## 🎯 Examples

### Complete Vault Workflow

```typescript
import { createChronosClient } from './sdk/chronos-client';
import { AnchorProvider } from '@coral-xyz/anchor';

async function vaultWorkflow() {
  const provider = AnchorProvider.env();
  const chronos = createChronosClient(provider);

  // 1. Create vault
  const vaultConfig = {
    strategyType: 'YieldOptimization',
    riskLevel: 5,
    rebalanceFrequency: 3600,
  };
  const createTx = await chronos.createVault(vaultConfig);
  console.log('Vault created:', createTx);

  // 2. Get vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), provider.wallet.publicKey.toBuffer()],
    chronos.vaultProgram.programId
  );

  // 3. Deposit funds
  const depositTx = await chronos.depositToVault(vaultPda, 1_000_000_000);
  console.log('Deposited:', depositTx);

  // 4. Reserve execution slot
  const slotTime = Date.now() + 30000;
  const reserveTx = await chronos.reserveVaultExecutionSlot(vaultPda, slotTime);
  console.log('Slot reserved:', reserveTx);

  // 5. Check vault info
  const vaultInfo = await chronos.getVaultInfo(vaultPda);
  console.log('Vault info:', vaultInfo);

  // 6. Check user position
  const position = await chronos.getUserPosition(vaultPda);
  console.log('User position:', position);
}
```

### Complete DEX Workflow

```typescript
async function dexWorkflow() {
  const provider = AnchorProvider.env();
  const chronos = createChronosClient(provider);

  // Assume market is already initialized
  const marketPda = new PublicKey('...');

  // 1. Place buy order
  const buyOrder = {
    side: 'Buy',
    price: 1_000_000,
    amount: 100_000_000,
    slotReservationTime: Date.now() + 10000,
  };
  const buyTx = await chronos.placeOrder(marketPda, buyOrder);
  console.log('Buy order placed:', buyTx);

  // 2. Place sell order
  const sellOrder = {
    side: 'Sell',
    price: 1_100_000,
    amount: 50_000_000,
    slotReservationTime: Date.now() + 15000,
  };
  const sellTx = await chronos.placeOrder(marketPda, sellOrder);
  console.log('Sell order placed:', sellTx);

  // 3. Check market info
  const marketInfo = await chronos.getMarketInfo(marketPda);
  console.log('Market info:', marketInfo);
}
```

## 🔄 Migration to Official Raiku SDK

When the official Raiku SDK is released, migration is simple:

1. Replace `./sdk/raiku-mock` with the official SDK package
2. Update import statements
3. The interface should remain largely compatible

```typescript
// Before (mock)
import { getRaikuSDK } from './sdk/raiku-mock';

// After (official)
import { getRaikuSDK } from '@raiku/sdk';
```

## 📝 Notes

- The mock Raiku SDK simulates network delays and responses
- All slot reservations are confirmed after ~500ms
- Pre-confirmations show 99.9% confidence and sub-30ms timing
- Slot market prices are dynamically calculated based on time proximity

## 🚀 Next Steps

1. Build the smart contracts: `anchor build`
2. Deploy to devnet: `anchor deploy`
3. Update program IDs in the SDK
4. Start building your frontend!

---

**Happy building with CHRONOS! 🚀**

