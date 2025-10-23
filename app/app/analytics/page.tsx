'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Shield, Clock, Zap, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { WalletButton } from '@/components/ui/WalletButton';
import { useWalletReady } from '@/src/hooks/useProgram';
import { PROGRAM_IDS } from '@/src/config/programs';
import { ProgramStatus } from '@/components/ui/ProgramStatus';
import { useChronosDex, useChronosMarket } from '@/src/hooks/useChronosPrograms';

// Mock data for charts
const volumeData = [
  { time: '00:00', volume: 1200000 },
  { time: '04:00', volume: 1800000 },
  { time: '08:00', volume: 2400000 },
  { time: '12:00', volume: 3200000 },
  { time: '16:00', volume: 2800000 },
  { time: '20:00', volume: 2200000 },
];

const mevData = [
  { protocol: 'Traditional DEX', mev: 95, prevented: 5 },
  { protocol: 'CHRONOS DEX', mev: 5, prevented: 95 },
];

const slotUtilization = [
  { hour: '00', utilization: 45 },
  { hour: '04', utilization: 32 },
  { hour: '08', utilization: 68 },
  { hour: '12', utilization: 89 },
  { hour: '16', utilization: 92 },
  { hour: '20', utilization: 76 },
];

const vaultPerformance = [
  { name: 'Yield Opt', value: 35 },
  { name: 'Delta Neutral', value: 28 },
  { name: 'Arbitrage', value: 22 },
  { name: 'Others', value: 15 },
];

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

export default function AnalyticsPage() {
  const { isReady, publicKey } = useWalletReady();
  const { getMarketOrders, getUserOrders } = useChronosDex();
  const { getUserSlotNFTs, getActiveAuctions } = useChronosMarket();

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalVolume: 0,
    activeAuctions: 0,
    totalSlotNFTs: 0,
    userOrders: 0,
    userSlotNFTs: 0,
  });
  const [loading, setLoading] = useState(false);

  // Fetch real stats from blockchain
  useEffect(() => {
    if (isReady) {
      setLoading(true);
      Promise.all([
        getUserOrders(),
        getUserSlotNFTs(),
        getActiveAuctions(),
      ]).then(([orders, nfts, auctions]) => {
        // Calculate total volume from orders
        const totalVolume = orders.reduce((sum, order) => {
          return sum + (order.price * order.amount);
        }, 0);

        setStats({
          totalOrders: orders.length,
          totalVolume,
          activeAuctions: auctions.length,
          totalSlotNFTs: nfts.length,
          userOrders: orders.filter(o => o.status === 'Open').length,
          userSlotNFTs: nfts.filter(n => n.status === 'Available').length,
        });
        setLoading(false);
      }).catch((err) => {
        console.error('Error fetching stats:', err);
        setLoading(false);
      });
    }
  }, [isReady]);

  // Refresh stats periodically
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      Promise.all([
        getUserOrders(),
        getUserSlotNFTs(),
        getActiveAuctions(),
      ]).then(([orders, nfts, auctions]) => {
        const totalVolume = orders.reduce((sum, order) => {
          return sum + (order.price * order.amount);
        }, 0);

        setStats({
          totalOrders: orders.length,
          totalVolume,
          activeAuctions: auctions.length,
          totalSlotNFTs: nfts.length,
          userOrders: orders.filter(o => o.status === 'Open').length,
          userSlotNFTs: nfts.filter(n => n.status === 'Available').length,
        });
      }).catch((err) => {
        console.error('Error refreshing stats:', err);
      });
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [isReady]);

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
              <Link href="/dex" className="text-gray-300 hover:text-white transition">
                DEX
              </Link>
              <Link href="/market" className="text-gray-300 hover:text-white transition">
                Market
              </Link>
              <Link href="/analytics" className="text-white font-semibold">
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
              Protocol Analytics
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              Real-time insights into CHRONOS Protocol performance and metrics.
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
                    Orchestrator: {PROGRAM_IDS.CHRONOS_ORCHESTRATOR.toBase58().slice(0, 8)}...
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                ⚠️ Connect wallet to view personalized analytics
              </div>
            )}
          </motion.div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            <MetricCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Total Volume"
              value={loading ? '...' : `$${(stats.totalVolume * 100).toFixed(2)}`}
              change=""
              positive
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Total Orders"
              value={loading ? '...' : stats.totalOrders.toString()}
              change=""
              positive
            />
            <MetricCard
              icon={<Shield className="w-5 h-5" />}
              label="Active Auctions"
              value={loading ? '...' : stats.activeAuctions.toString()}
              change=""
              positive
            />
            <MetricCard
              icon={<Clock className="w-5 h-5" />}
              label="Slot NFTs"
              value={loading ? '...' : stats.totalSlotNFTs.toString()}
              change=""
              positive
            />
            <MetricCard
              icon={<Zap className="w-5 h-5" />}
              label="Your Orders"
              value={loading ? '...' : stats.userOrders.toString()}
              change=""
              positive
            />
            <MetricCard
              icon={<Activity className="w-5 h-5" />}
              label="Your Slots"
              value={loading ? '...' : stats.userSlotNFTs.toString()}
              change=""
              positive
            />
          </div>

          {/* Charts Grid */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Trading Volume */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>24h Trading Volume</CardTitle>
                <CardDescription>
                  Volume across all CHRONOS products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Area type="monotone" dataKey="volume" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorVolume)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* MEV Comparison */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>MEV Impact Comparison</CardTitle>
                <CardDescription>
                  CHRONOS vs Traditional DEX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mevData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="protocol" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Bar dataKey="mev" fill="#EF4444" name="MEV Extracted %" />
                    <Bar dataKey="prevented" fill="#10B981" name="MEV Prevented %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Slot Utilization */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Slot Utilization</CardTitle>
                <CardDescription>
                  Hourly slot reservation rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={slotUtilization}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Line type="monotone" dataKey="utilization" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Vault Distribution */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Vault Strategy Distribution</CardTitle>
                <CardDescription>
                  TVL by strategy type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vaultPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {vaultPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Execution Guarantees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MetricRow label="Total Transactions" value="1,234,567" />
                  <MetricRow label="Successful" value="1,233,826" color="text-green-400" />
                  <MetricRow label="Failed" value="741" color="text-red-400" />
                  <MetricRow label="Success Rate" value="99.94%" color="text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Slot Reservations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MetricRow label="Total Reserved" value="45,678" />
                  <MetricRow label="AOT (>10s)" value="32,456" color="text-blue-400" />
                  <MetricRow label="JIT (<10s)" value="13,222" color="text-yellow-400" />
                  <MetricRow label="Avg Lead Time" value="23.4s" color="text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Economic Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MetricRow label="User Savings" value="$2.3M" color="text-green-400" />
                  <MetricRow label="Protocol Revenue" value="$187K" color="text-blue-400" />
                  <MetricRow label="Avg Save/Tx" value="$1.86" color="text-purple-400" />
                  <MetricRow label="ROI vs Trad DEX" value="+340%" color="text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Program Deployment Status */}
          <div className="mt-6">
            <ProgramStatus />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, change, positive }: any) {
  return (
    <Card variant="glass" className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-purple-400">{icon}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className={`text-xs ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {change}
      </div>
    </Card>
  );
}

function MetricRow({ label, value, color = 'text-white' }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

