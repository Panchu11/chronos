'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowDownUp, Clock, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { WalletButton } from '@/components/ui/WalletButton';
import { useWalletReady } from '@/src/hooks/useProgram';
import { PROGRAM_IDS } from '@/src/config/programs';
import { InitializeMarketForm } from '@/components/dex/InitializeMarketForm';
import { PlaceOrderForm } from '@/components/dex/PlaceOrderForm';
import { useChronosDex } from '@/src/hooks/useChronosPrograms';
import { PublicKey } from '@solana/web3.js';

export default function DEXPage() {
  const { isReady, publicKey } = useWalletReady();
  const { getMarketOrders, getUserOrders, cancelOrder, getDexStats } = useChronosDex();
  const [marketAddress, setMarketAddress] = useState<string | null>(null);
  const [marketOrders, setMarketOrders] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    totalVolume: 0,
    activeOrders: 0,
    mevPrevented: 0,
    avgExecutionTime: 30,
  });

  // Fetch orders when market address changes
  useEffect(() => {
    if (marketAddress) {
      setLoadingOrders(true);
      Promise.all([
        getMarketOrders(new PublicKey(marketAddress)),
        getUserOrders(),
      ]).then(([market, user]) => {
        setMarketOrders(market);
        setUserOrders(user);
        setLoadingOrders(false);
      }).catch((err) => {
        console.error('Error fetching orders:', err);
        setLoadingOrders(false);
      });
    }
  }, [marketAddress]);

  // Refresh orders periodically
  useEffect(() => {
    if (!marketAddress) return;

    const interval = setInterval(() => {
      Promise.all([
        getMarketOrders(new PublicKey(marketAddress)),
        getUserOrders(),
      ]).then(([market, user]) => {
        setMarketOrders(market);
        setUserOrders(user);
      }).catch((err) => {
        console.error('Error refreshing orders:', err);
      });
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [marketAddress]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const dexStats = await getDexStats();
      setStats(dexStats);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  // Separate buy and sell orders
  const buyOrders = marketOrders.filter(o => o.side === 'Buy' && o.status === 'Open').sort((a, b) => b.price - a.price);
  const sellOrders = marketOrders.filter(o => o.side === 'Sell' && o.status === 'Open').sort((a, b) => a.price - b.price);

  // Refresh orders manually
  const refreshOrders = () => {
    if (!marketAddress) return;
    setLoadingOrders(true);
    Promise.all([
      getMarketOrders(new PublicKey(marketAddress)),
      getUserOrders(),
    ]).then(([market, user]) => {
      setMarketOrders(market);
      setUserOrders(user);
      setLoadingOrders(false);
    }).catch((err) => {
      console.error('Error refreshing orders:', err);
      setLoadingOrders(false);
    });
  };

  // Cancel an order
  const handleCancelOrder = async (orderAddress: string) => {
    try {
      setCancellingOrder(orderAddress);
      await cancelOrder(new PublicKey(orderAddress));
      console.log('Order cancelled successfully');
      refreshOrders();
    } catch (err) {
      console.error('Error cancelling order:', err);
    } finally {
      setCancellingOrder(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                CHRONOS
              </span>
              <span className="text-xs text-gray-400 font-normal">by ForgeLabs</span>
            </Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/vaults" className="text-gray-300 hover:text-white transition">
                Vaults
              </Link>
              <Link href="/dex" className="text-white font-semibold">
                DEX
              </Link>
              <Link href="/market" className="text-gray-300 hover:text-white transition">
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
              Deterministic DEX
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              Zero MEV perpetual exchange with FIFO ordering based on slot reservation time.
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
                    Program: {PROGRAM_IDS.CHRONOS_DEX.toBase58().slice(0, 8)}...
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                ⚠️ Please connect your wallet to trade
              </div>
            )}
          </motion.div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <StatCard
              icon={<Shield className="w-6 h-6" />}
              label="MEV Prevented"
              value={`$${stats.mevPrevented.toFixed(2)}`}
              color="text-green-400"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="24h Volume"
              value={`$${stats.totalVolume.toFixed(2)}`}
              color="text-blue-400"
            />
            <StatCard
              icon={<Clock className="w-6 h-6" />}
              label="Avg Fill Time"
              value={`<${stats.avgExecutionTime}ms`}
              color="text-purple-400"
            />
            <StatCard
              icon={<ArrowDownUp className="w-6 h-6" />}
              label="Active Orders"
              value={stats.activeOrders.toString()}
              color="text-yellow-400"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Trading Interface */}
            <div className="lg:col-span-2">
              {/* Initialize Market */}
              {!marketAddress && (
                <Card variant="glass" className="mb-6">
                  <CardHeader>
                    <CardTitle>Initialize Market</CardTitle>
                    <CardDescription>
                      Create a new SOL/USDC market on the DEX
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InitializeMarketForm onMarketCreated={setMarketAddress} />
                  </CardContent>
                </Card>
              )}

              {/* Place Order */}
              {marketAddress && (
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Place Order</CardTitle>
                    <CardDescription>
                      Reserve your slot for guaranteed FIFO execution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlaceOrderForm marketAddress={marketAddress} onOrderPlaced={refreshOrders} />
                  </CardContent>
                </Card>
              )}

              {/* Order Book */}
              {marketAddress && (
                <Card variant="glass" className="mt-6">
                  <CardHeader>
                    <CardTitle>Order Book</CardTitle>
                    <CardDescription>
                      Orders sorted by slot reservation time (FIFO)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingOrders ? (
                      <div className="text-center py-8 text-gray-400">
                        Loading orders...
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 text-sm text-gray-400 mb-2 pb-2 border-b border-gray-700">
                          <div>Price (USDC)</div>
                          <div className="text-right">Amount (SOL)</div>
                          <div className="text-right">Slot Time</div>
                        </div>

                        {/* Sell Orders */}
                        <div className="mb-4">
                          {sellOrders.length > 0 ? (
                            sellOrders.slice(0, 5).map((order, i) => {
                              const now = Math.floor(Date.now() / 1000);
                              const timeUntil = order.slotReservationTime - now;
                              return (
                                <div key={i} className="grid grid-cols-3 text-sm py-1">
                                  <div className="text-red-400">{order.price.toFixed(2)}</div>
                                  <div className="text-right text-white">{order.amount.toFixed(4)}</div>
                                  <div className="text-right text-gray-400">
                                    {timeUntil > 0 ? `+${timeUntil}s` : 'Ready'}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No sell orders
                            </div>
                          )}
                        </div>

                        {/* Spread */}
                        {buyOrders.length > 0 && sellOrders.length > 0 && (
                          <div className="text-center py-2 bg-gray-800/50 rounded mb-4">
                            <span className="text-sm text-gray-400">Spread: </span>
                            <span className="text-sm text-purple-400 font-semibold">
                              {(sellOrders[0].price - buyOrders[0].price).toFixed(2)} USDC
                            </span>
                          </div>
                        )}

                        {/* Buy Orders */}
                        <div>
                          {buyOrders.length > 0 ? (
                            buyOrders.slice(0, 5).map((order, i) => {
                              const now = Math.floor(Date.now() / 1000);
                              const timeUntil = order.slotReservationTime - now;
                              return (
                                <div key={i} className="grid grid-cols-3 text-sm py-1">
                                  <div className="text-green-400">{order.price.toFixed(2)}</div>
                                  <div className="text-right text-white">{order.amount.toFixed(4)}</div>
                                  <div className="text-right text-gray-400">
                                    {timeUntil > 0 ? `+${timeUntil}s` : 'Ready'}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No buy orders
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div>
              {/* Batch Auction Timer */}
              <Card variant="glass" className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Next Batch Auction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-purple-400 mb-2">
                      00:45
                    </div>
                    <div className="text-sm text-gray-400 mb-4">
                      Orders will be matched at uniform clearing price
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Pending Orders</div>
                      <div className="text-2xl font-bold text-white">127</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Your Orders */}
              {isReady && (
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-lg">Your Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingOrders ? (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        Loading...
                      </div>
                    ) : userOrders.length > 0 ? (
                      <div className="space-y-3">
                        {userOrders.map((order, i) => (
                          <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold ${
                                    order.side === 'Buy' ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {order.side}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    order.status === 'Open' ? 'bg-yellow-500/20 text-yellow-400' :
                                    order.status === 'Filled' ? 'bg-green-500/20 text-green-400' :
                                    order.status === 'PartiallyFilled' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {order.amount.toFixed(4)} SOL @ {order.price.toFixed(2)} USDC
                                </div>
                                {order.filledAmount > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Filled: {order.filledAmount.toFixed(4)} SOL
                                  </div>
                                )}
                              </div>
                              {order.status === 'Open' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelOrder(order.address)}
                                  disabled={cancellingOrder === order.address}
                                  className="text-xs"
                                >
                                  {cancellingOrder === order.address ? 'Cancelling...' : 'Cancel'}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No orders yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
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

