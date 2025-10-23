# 🚀 CHRONOS Protocol - Frontend Application

**The World's First Deterministic DeFi Orchestration Protocol**

Built for the **Raiku - Inevitable Ideathon** hackathon.

---

## 📋 Overview

CHRONOS is a revolutionary Meta-Protocol that leverages Raiku's deterministic execution capabilities to enable:

- **Temporal Vaults**: DeFi vaults with time-guaranteed execution
- **Zero MEV DEX**: Deterministic order matching with FIFO based on slot reservation
- **Blockspace Futures**: Trade Solana blockspace as an asset

---

## 🎨 Features

### ✅ Landing Page
- Beautiful hero section with gradient animations
- Feature showcase
- Protocol statistics
- Call-to-action sections

### ✅ Temporal Vaults
- Create vaults with 3 strategies:
  - Yield Optimization (18-25% APY)
  - Delta Neutral (12-18% APY)
  - Arbitrage (25-40% APY)
- Configure rebalance frequency
- Adjust risk levels
- View active vaults and performance

### ✅ Deterministic DEX
- Place buy/sell orders
- Reserve execution slots (JIT/AOT)
- View order book with FIFO ordering
- Batch auction timer
- Track your orders

### ✅ Blockspace Futures Market
- Mint slot NFTs
- Run Dutch auctions
- Trade on secondary market
- Lease capacity for recurring needs

### ✅ Analytics Dashboard
- Real-time protocol metrics
- Trading volume charts
- MEV impact comparison
- Slot utilization tracking
- Vault strategy distribution
- Performance metrics

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

### Solana Integration
- **@solana/web3.js** - Solana blockchain interaction
- **@solana/wallet-adapter** - Wallet integration
- **@coral-xyz/anchor** - Smart contract interaction

### Visualizations
- **Recharts** - Charts and graphs
- **Lucide React** - Icons

### State Management
- **Zustand** - Lightweight state management

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Run development server
npm run dev
```

### Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
app/
├── app/
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   ├── vaults/
│   │   └── page.tsx             # Temporal Vaults
│   ├── dex/
│   │   └── page.tsx             # Deterministic DEX
│   ├── market/
│   │   └── page.tsx             # Blockspace Market
│   └── analytics/
│       └── page.tsx             # Analytics Dashboard
├── components/
│   ├── providers/
│   │   └── WalletProvider.tsx   # Solana wallet provider
│   └── ui/
│       ├── Button.tsx           # Button component
│       └── Card.tsx             # Card components
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 🎯 Available Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
```

---

## 🎨 Design System

### Colors
- **Primary**: Purple (#8B5CF6)
- **Secondary**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Error**: Red (#EF4444)
- **Warning**: Yellow (#F59E0B)

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, gradient text
- **Body**: Regular, gray-300

### Effects
- **Glassmorphism**: Frosted glass effect
- **Gradients**: Purple → Blue → Black
- **Animations**: Framer Motion transitions

---

## 🔗 Navigation

- **/** - Landing page
- **/vaults** - Temporal Vaults interface
- **/dex** - Deterministic DEX
- **/market** - Blockspace Futures Market
- **/analytics** - Analytics Dashboard

---

## 🌐 Wallet Integration

The app supports:
- **Phantom Wallet**
- **Solflare Wallet**

Connect your wallet to interact with the protocol.

---

## 📊 Key Metrics Displayed

### Protocol-wide
- Total Value Locked (TVL)
- 24h Trading Volume
- MEV Prevented
- Average Execution Time
- Success Rate
- Active Users

### Vaults
- Vault TVL
- APY by strategy
- Your deposits
- Earnings

### DEX
- Order book depth
- Batch auction timing
- Your orders
- Fill rates

### Market
- Slots minted
- Trading volume
- Average slot price
- Active leases

---

## 🎯 Hackathon Alignment

### Track: Finance Applications ✅

CHRONOS demonstrates:
- ✅ Deterministic execution for DeFi
- ✅ Slot auction integration
- ✅ Pre-confirmation usage
- ✅ MEV resistance
- ✅ Novel financial primitives

---

## 🚧 Development Status

### Completed ✅
- [x] Landing page
- [x] Vaults interface
- [x] DEX interface
- [x] Market interface
- [x] Analytics dashboard
- [x] Wallet provider setup
- [x] UI components
- [x] Responsive design
- [x] Animations

### In Progress 🔄
- [ ] Smart contract integration
- [ ] Real-time data fetching
- [ ] Transaction signing
- [ ] Error handling
- [ ] Loading states

### Planned 📋
- [ ] Mobile optimization
- [ ] Advanced visualizations
- [ ] Documentation page
- [ ] User onboarding
- [ ] Performance optimization

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

---

## 📱 Responsive Design

The app is fully responsive:
- **Mobile**: 320px+
- **Tablet**: 768px+
- **Desktop**: 1024px+

---

## 🎨 Customization

### Tailwind Config
Edit `tailwind.config.ts` to customize:
- Colors
- Spacing
- Border radius
- Animations

### Global Styles
Edit `app/globals.css` for:
- CSS variables
- Custom animations
- Utility classes

---

## 🐛 Known Issues

- Wallet integration is placeholder (needs real implementation)
- Charts use mock data (needs real-time data)
- No error boundaries yet
- Loading states not implemented

---

## 🤝 Contributing

This is a hackathon project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🏆 Hackathon Submission

**Project**: CHRONOS Protocol  
**Track**: Finance Applications  
**Hackathon**: Raiku - Inevitable Ideathon  
**Team**: Solo  
**GitHub**: https://github.com/Panchu11/chronos

---

## 📞 Resources

- **Raiku Docs**: https://raiku.network
- **Solana Docs**: https://docs.solana.com
- **Next.js Docs**: https://nextjs.org/docs
- **Hackathon**: https://earn.superteam.fun/listing/raiku

---

## 🎉 Acknowledgments

Built with ❤️ for the Raiku - Inevitable Ideathon

Special thanks to:
- Raiku team for the innovative technology
- Solana ecosystem
- Superteam for organizing the hackathon

---

**Let's make DeFi deterministic! 🚀**

