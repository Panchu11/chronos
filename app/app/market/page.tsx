'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, TrendingUp, Zap, Package } from 'lucide-react';
import Link from 'next/link';
import { WalletButton } from '@/components/ui/WalletButton';
import { useWalletReady } from '@/src/hooks/useProgram';
import { PROGRAM_IDS } from '@/src/config/programs';
import { MintSlotNFTForm } from '@/components/market/MintSlotNFTForm';
import { CreateAuctionForm } from '@/components/market/CreateAuctionForm';
import { BidModal } from '@/components/market/BidModal';
import { useChronosMarket } from '@/src/hooks/useChronosPrograms';
import { PublicKey } from '@solana/web3.js';

export default function MarketPage() {
  const [auctionType, setAuctionType] = useState<'dutch' | 'secondary'>('dutch');
  const { isReady, publicKey } = useWalletReady();
  const { getUserSlotNFTs, getActiveAuctions, placeBid, getMarketStats } = useChronosMarket();
  const [slotNftAddress, setSlotNftAddress] = useState<string | null>(null);
  const [userSlotNFTs, setUserSlotNFTs] = useState<any[]>([]);
  const [activeAuctions, setActiveAuctions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<any | null>(null);
  const [selectedAuctionPrice, setSelectedAuctionPrice] = useState<number>(0);

  // Stats state
  const [stats, setStats] = useState({
    totalSlotsMinted: 0,
    tradingVolume: 0,
    activeLeases: 0,
    floorPrice: 0,
  });

  // Fetch user slot NFTs and active auctions
  useEffect(() => {
    if (isReady) {
      setLoadingData(true);
      Promise.all([
        getUserSlotNFTs(),
        getActiveAuctions(),
      ]).then(([nfts, auctions]) => {
        setUserSlotNFTs(nfts);
        setActiveAuctions(auctions);
        setLoadingData(false);
      }).catch((err) => {
        console.error('Error fetching data:', err);
        setLoadingData(false);
      });
    }
  }, [isReady]);

  // Refresh data periodically
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      Promise.all([
        getUserSlotNFTs(),
        getActiveAuctions(),
      ]).then(([nfts, auctions]) => {
        setUserSlotNFTs(nfts);
        setActiveAuctions(auctions);
      }).catch((err) => {
        console.error('Error refreshing data:', err);
      });
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [isReady]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const marketStats = await getMarketStats();
      setStats(marketStats);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setLoadingData(true);
    Promise.all([
      getUserSlotNFTs(),
      getActiveAuctions(),
    ]).then(([nfts, auctions]) => {
      setUserSlotNFTs(nfts);
      setActiveAuctions(auctions);
      setLoadingData(false);
    }).catch((err) => {
      console.error('Error refreshing data:', err);
      setLoadingData(false);
    });
  };

  const handlePlaceBid = async () => {
    if (!selectedAuction) return;

    try {
      await placeBid(new PublicKey(selectedAuction.address));
      setSelectedAuction(null);
      refreshData();
    } catch (err) {
      console.error('Error placing bid:', err);
      throw err;
    }
  };

  const openBidModal = (auction: any, currentPrice: number) => {
    setSelectedAuction(auction);
    setSelectedAuctionPrice(currentPrice);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              CHRONOS
            </Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/vaults" className="text-gray-300 hover:text-white transition">
                Vaults
              </Link>
              <Link href="/dex" className="text-gray-300 hover:text-white transition">
                DEX
              </Link>
              <Link href="/market" className="text-white font-semibold">
                Market
              </Link>
              <Link href="/analytics" className="text-gray-300 hover:text-white transition">
                Analytics
              </Link>
            </div>
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Blockspace Futures Market
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              Trade Solana blockspace as an asset. Mint slot NFTs, run Dutch auctions, lease capacity.
            </p>

            {/* Connection Status */}
            {isReady ? (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400">Connected to Devnet</span>
                </div>
                <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <span className="text-purple-400 font-mono text-xs">
                    Program: {PROGRAM_IDS.CHRONOS_MARKET.toBase58().slice(0, 8)}...
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                ⚠️ Please connect your wallet to trade blockspace
              </div>
            )}
          </motion.div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <StatCard
              icon={<Package className="w-6 h-6" />}
              label="Total Slots Minted"
              value={stats.totalSlotsMinted.toString()}
              color="text-purple-400"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Trading Volume"
              value={`${stats.tradingVolume.toFixed(2)} SOL`}
              color="text-green-400"
            />
            <StatCard
              icon={<Clock className="w-6 h-6" />}
              label="Avg Slot Price"
              value={stats.floorPrice > 0 ? `${stats.floorPrice.toFixed(3)} SOL` : 'N/A'}
              color="text-blue-400"
            />
            <StatCard
              icon={<Zap className="w-6 h-6" />}
              label="Active Leases"
              value={stats.activeLeases.toString()}
              color="text-yellow-400"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Mint & Auction Interface */}
            <div className="lg:col-span-2">
              {/* Mint Slot NFT */}
              {!slotNftAddress && (
                <Card variant="glass" className="mb-6">
                  <CardHeader>
                    <CardTitle>Mint Slot NFT</CardTitle>
                    <CardDescription>
                      Create a new execution slot NFT with guaranteed blockspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MintSlotNFTForm onSlotMinted={(address) => {
                      setSlotNftAddress(address);
                      refreshData();
                    }} />
                  </CardContent>
                </Card>
              )}

              {/* Create Auction */}
              {slotNftAddress && (
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Create Dutch Auction</CardTitle>
                    <CardDescription>
                      Run a Dutch auction for your slot NFT
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CreateAuctionForm slotNftAddress={slotNftAddress} onAuctionCreated={() => {
                      setSlotNftAddress(null);
                      refreshData();
                    }} />
                  </CardContent>
                </Card>
              )}

              {/* Active Auctions */}
              <Card variant="glass" className="mt-6">
                <CardHeader>
                  <CardTitle>Active Auctions</CardTitle>
                  <CardDescription>
                    Live Dutch auctions for slot NFTs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="text-center py-8 text-gray-400">
                      Loading auctions...
                    </div>
                  ) : activeAuctions.length > 0 ? (
                    <div className="space-y-4">
                      {activeAuctions.map((auction, i) => {
                        const now = Math.floor(Date.now() / 1000);
                        const timeRemaining = auction.endTime - now;
                        const elapsed = now - auction.startTime;
                        const duration = auction.endTime - auction.startTime;

                        // Calculate current Dutch auction price
                        const priceDrop = auction.startingPrice - auction.reservePrice;
                        const currentPrice = Math.max(
                          auction.reservePrice,
                          auction.startingPrice - (priceDrop * elapsed) / duration
                        );

                        return (
                          <div key={i} className="bg-gray-800/50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <div className="text-lg font-bold text-white">
                                  Auction #{auction.address.slice(0, 8)}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Time remaining: {timeRemaining > 0 ? `${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s` : 'Ended'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-400 mb-1">Current Price</div>
                                <div className="text-2xl font-bold text-green-400">
                                  {currentPrice.toFixed(4)} SOL
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-gray-400">
                                Reserve: {auction.reservePrice.toFixed(4)} SOL
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openBidModal(auction, currentPrice)}
                                disabled={timeRemaining <= 0}
                              >
                                {timeRemaining > 0 ? 'Place Bid' : 'Auction Ended'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No active auctions yet. Create one to get started!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div>
              {/* Your Slot NFTs */}
              {isReady && (
                <Card variant="glass" className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Your Slot NFTs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingData ? (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        Loading...
                      </div>
                    ) : userSlotNFTs.length > 0 ? (
                      <div className="space-y-3">
                        {userSlotNFTs.map((nft, i) => {
                          const now = Math.floor(Date.now() / 1000);
                          const timeUntil = nft.slotTime - now;
                          const timeStr = timeUntil > 0
                            ? `+${Math.floor(timeUntil / 60)}m ${timeUntil % 60}s`
                            : 'Expired';

                          return (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-sm font-bold text-white">
                                    Slot #{nft.address.slice(0, 8)}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Execution in {timeStr}
                                  </div>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded ${
                                  nft.status === 'Available' ? 'bg-green-500/20 text-green-400' :
                                  nft.status === 'Reserved' ? 'bg-yellow-500/20 text-yellow-400' :
                                  nft.status === 'Executed' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {nft.status}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400">
                                Capacity: {nft.usedCapacity}/{nft.capacity}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No slot NFTs yet. Mint one to get started!
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Capacity Leasing */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Capacity Leasing</CardTitle>
                  <CardDescription className="text-sm">
                    Lease blockspace capacity for recurring needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Slots per Hour
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      placeholder="24"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                    <div className="text-xs text-gray-400 mb-1">Total Cost</div>
                    <div className="text-xl font-bold text-purple-400">12 SOL</div>
                  </div>
                  <Button size="sm" className="w-full">
                    Lease Capacity
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Modal */}
      {selectedAuction && (
        <BidModal
          auction={selectedAuction}
          currentPrice={selectedAuctionPrice}
          onClose={() => setSelectedAuction(null)}
          onBid={handlePlaceBid}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <Card variant="glass">
      <div className="flex items-center gap-3">
        <div className={color}>{icon}</div>
        <div>
          <div className="text-sm text-gray-400">{label}</div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </div>
      </div>
    </Card>
  );
}

