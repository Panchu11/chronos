'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, Shield, Zap, Clock, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { WalletButton } from '@/components/ui/WalletButton';
import { useWalletReady } from '@/src/hooks/useProgram';
import { PROGRAM_IDS, getExplorerUrl } from '@/src/config/programs';
import { CreateVaultForm } from '@/components/vaults/CreateVaultForm';
import { DepositWithdrawForm } from '@/components/vaults/DepositWithdrawForm';
import { useChronosVault } from '@/src/hooks/useChronosPrograms';
import { PublicKey } from '@solana/web3.js';

type StrategyType = 'YieldOptimization' | 'DeltaNeutral' | 'Arbitrage';

export default function VaultsPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType | null>(null);
  const { isReady, publicKey } = useWalletReady();
  const { checkVaultExists, getVaultStats } = useChronosVault();
  const [userVault, setUserVault] = useState<PublicKey | null>(null);
  const [loadingVault, setLoadingVault] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    totalValueLocked: 0,
    activeVaults: 0,
    avgAPY: 0,
  });

  // Check for user's vault when wallet connects (only once per wallet change)
  useEffect(() => {
    if (isReady && !hasChecked) {
      setLoadingVault(true);
      setHasChecked(true);
      checkVaultExists().then(({ exists, vaultAddress }) => {
        if (exists && vaultAddress) {
          setUserVault(vaultAddress);
        } else {
          setUserVault(null);
        }
        setLoadingVault(false);
      }).catch((err) => {
        console.error('Failed to check vault:', err);
        setLoadingVault(false);
      });
    } else if (!isReady) {
      setUserVault(null);
      setHasChecked(false);
    }
  }, [isReady, publicKey?.toBase58()]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const vaultStats = await getVaultStats();
      setStats(vaultStats);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

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
              <Link href="/vaults" className="text-white font-semibold">
                Vaults
              </Link>
              <Link href="/dex" className="text-gray-300 hover:text-white transition">
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
              Temporal Vaults
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              DeFi vaults with time-guaranteed execution. Reserve slots in advance for MEV-resistant strategies.
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
                    Program: {PROGRAM_IDS.CHRONOS_VAULT.toBase58().slice(0, 8)}...
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                ⚠️ Please connect your wallet to interact with vaults
              </div>
            )}
          </motion.div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <StatCard
              label="Total Value Locked"
              value={`${stats.totalValueLocked.toFixed(2)} SOL`}
              change=""
              positive
            />
            <StatCard
              label="Active Vaults"
              value={stats.activeVaults.toString()}
              change=""
              positive
            />
            <StatCard
              label="Avg APY"
              value={stats.avgAPY > 0 ? `${stats.avgAPY.toFixed(1)}%` : 'N/A'}
              change=""
              positive
            />
            <StatCard
              label="Success Rate"
              value="99.9%"
              change=""
              positive
            />
          </div>

          {/* Create Vault Section */}
          <Card variant="glass" className="mb-12">
            <CardHeader>
              <CardTitle>Create New Vault</CardTitle>
              <CardDescription>
                Choose a strategy and configure your temporal vault
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <StrategyCard
                  icon={<TrendingUp className="w-8 h-8" />}
                  title="Yield Optimization"
                  description="Automatically rebalance between lending protocols for maximum yield"
                  apy="18-25%"
                  risk="Low"
                  selected={selectedStrategy === 'YieldOptimization'}
                  onClick={() => setSelectedStrategy('YieldOptimization')}
                />
                <StrategyCard
                  icon={<Shield className="w-8 h-8" />}
                  title="Delta Neutral"
                  description="Maintain market-neutral position while earning funding rates"
                  apy="12-18%"
                  risk="Medium"
                  selected={selectedStrategy === 'DeltaNeutral'}
                  onClick={() => setSelectedStrategy('DeltaNeutral')}
                />
                <StrategyCard
                  icon={<Zap className="w-8 h-8" />}
                  title="Arbitrage"
                  description="Execute cross-DEX arbitrage with guaranteed timing"
                  apy="25-40%"
                  risk="High"
                  selected={selectedStrategy === 'Arbitrage'}
                  onClick={() => setSelectedStrategy('Arbitrage')}
                />
              </div>

              <CreateVaultForm
                selectedStrategy={selectedStrategy}
                onSuccess={() => {
                  // Optionally refresh vault list or show success message
                  console.log('Vault created successfully!');
                }}
              />
            </CardContent>
          </Card>

          {/* Deposit/Withdraw Section */}
          {isReady && userVault && (
            <div className="mb-12">
              <DepositWithdrawForm
                onSuccess={() => {
                  console.log('Transaction successful!');
                }}
              />
            </div>
          )}

          {/* Active Vaults */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-white">Your Vaults</h2>
            {!isReady ? (
              <Card variant="glass">
                <div className="text-center py-12 text-gray-400">
                  Connect your wallet to view your vaults
                </div>
              </Card>
            ) : loadingVault ? (
              <Card variant="glass">
                <div className="text-center py-12 text-gray-400">
                  Loading your vaults...
                </div>
              </Card>
            ) : userVault ? (
              <Card variant="glass">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Your Temporal Vault</h3>
                    <p className="text-sm text-gray-400 font-mono">{userVault.toBase58()}</p>
                  </div>
                  <a
                    href={getExplorerUrl(userVault.toBase58(), 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Explorer
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-400">Status</div>
                    <div className="text-lg font-semibold text-green-400">Active</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Network</div>
                    <div className="text-lg font-semibold text-white">Devnet</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => alert('Deposit functionality requires SPL token setup. Coming soon!')}
                  >
                    Deposit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => alert('Withdraw functionality requires SPL token setup. Coming soon!')}
                  >
                    Withdraw
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => alert('Reserve Slot functionality coming soon!')}
                  >
                    Reserve Slot
                  </Button>
                </div>
              </Card>
            ) : (
              <Card variant="glass">
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">You don't have any vaults yet</p>
                  <p className="text-sm text-gray-500">Create your first vault above to get started</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, change, positive }: any) {
  return (
    <Card variant="glass">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className={`text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {change}
      </div>
    </Card>
  );
}

function StrategyCard({ icon, title, description, apy, risk, selected, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-xl border-2 cursor-pointer transition ${
        selected
          ? 'border-purple-500 bg-purple-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      }`}
    >
      <div className="text-purple-400 mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      <div className="flex justify-between text-sm">
        <div>
          <div className="text-gray-400">APY</div>
          <div className="text-green-400 font-semibold">{apy}</div>
        </div>
        <div>
          <div className="text-gray-400">Risk</div>
          <div className="text-yellow-400 font-semibold">{risk}</div>
        </div>
      </div>
    </div>
  );
}

function VaultCard({ name, strategy, tvl, apy, yourDeposit, nextRebalance }: any) {
  return (
    <Card variant="glass">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
          <p className="text-sm text-gray-400">{strategy}</p>
        </div>
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Clock className="w-4 h-4" />
          {nextRebalance}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-400">TVL</div>
          <div className="text-lg font-semibold text-white">{tvl}</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">APY</div>
          <div className="text-lg font-semibold text-green-400">{apy}</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Your Deposit</div>
          <div className="text-lg font-semibold text-white">{yourDeposit}</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Earnings</div>
          <div className="text-lg font-semibold text-purple-400">+0.23 SOL</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          Deposit
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          Withdraw
        </Button>
      </div>
    </Card>
  );
}

