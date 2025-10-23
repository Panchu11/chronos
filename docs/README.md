# 📚 CHRONOS Protocol Documentation

Welcome to the CHRONOS Protocol documentation! This directory contains all technical documentation, guides, and resources.

---

## 📄 Available Documentation

### Core Documentation

- **[Technical Whitepaper](./TECHNICAL_WHITEPAPER.md)** - Complete technical specification (10 pages)
- **[Full HTML Whitepaper](./CHRONOS_Whitepaper_FULL.html)** - Browser-viewable version with print-to-PDF support

### Architecture & Design

- **[System Architecture](#)** - High-level system design
- **[Smart Contract API](#)** - Program interfaces and instructions
- **[Integration Guide](#)** - How to integrate with CHRONOS

---

## 🏗️ Architecture Overview

CHRONOS Protocol consists of 4 main programs:

### 1. Chronos Vault (`chronos_vault`)
**Purpose**: Temporal vaults with time-guaranteed execution

**Key Features**:
- Deterministic rebalancing with Raiku slot reservation
- MEV-resistant strategy execution
- Liquidation protection through pre-reserved slots

**Program ID**: `EjG3EGtjpC9VtgrzuW6aJ55KcJuWF5buuvhF4S5B7EcP`

### 2. Chronos DEX (`chronos_dex`)
**Purpose**: Zero-MEV deterministic order matching

**Key Features**:
- Slot-reserved order execution
- Fair FIFO ordering
- Batch auction mechanism

**Program ID**: `FstLfRbswUSasgad1grV8ZY5Bh79CcAUe32vRoqNvJo6`

### 3. Chronos Market (`chronos_market`)
**Purpose**: Blockspace futures marketplace

**Key Features**:
- Slot NFT minting and trading
- Dutch auction price discovery
- Secondary market for reservations

**Program ID**: `8nAaEjXuKs9NC8MRwiBgyNEiAcY8Ab5YJsAaxnt6JaXJ`

### 4. Chronos Orchestrator (`chronos_orchestrator`)
**Purpose**: Cross-program coordination and Raiku integration

**Key Features**:
- Raiku SDK integration layer
- Multi-program atomic execution
- Slot reservation management

**Program ID**: `5NyVeVkzxmB2XkrR5EnrEfxNVe82mPWdzSEYH5FBoMgF`

---

## 🚀 Quick Start

### For Users

1. **Connect Wallet**: Use Phantom, Solflare, or any Solana wallet
2. **Get Devnet SOL**: Airdrop from https://faucet.solana.com
3. **Interact**: Visit the frontend to create vaults, trade, or mint slot NFTs

### For Developers

1. **Read the Whitepaper**: Start with [TECHNICAL_WHITEPAPER.md](./TECHNICAL_WHITEPAPER.md)
2. **Explore Programs**: Check the `programs/` directory for smart contract code
3. **Run Tests**: See test files in `tests/` directory
4. **Integration**: Use the SDK in `sdk/` directory

---

## 📊 Economic Simulations

See the `simulations/` directory for:

- **MEV Impact Analysis**: Demonstrates 100% MEV elimination
- **Slot Pricing Model**: Dynamic pricing under congestion
- **Vault Performance**: 30-day strategy backtesting

Run simulations:
```bash
cd simulations
pip install -r requirements.txt
jupyter notebook
```

---

## 🔗 Useful Links

- **Main README**: [../README.md](../README.md)
- **Deployment Info**: See main README for deployed program addresses
- **Simulations**: [../simulations/README.md](../simulations/README.md)
- **SDK Documentation**: [../sdk/README.md](../sdk/README.md)

---

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check the main README for contact information
- Review the technical whitepaper for detailed explanations

---

**Last Updated**: October 2025  
**Version**: 1.0  
**Status**: Raiku Hackathon Submission

