'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WalletButton } from '@/components/ui/WalletButton';
import { useWalletReady } from '@/src/hooks/useProgram';
import { useChronosOrchestrator } from '@/src/hooks/useChronosPrograms';
import { Loader2, Zap, Clock, Package, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getExplorerUrl } from '@/src/config/programs';

export default function OrchestratorPage() {
  const { isReady } = useWalletReady();
  const { initializeOrchestrator, reserveRaikuSlot, createExecutionBatch, loading } = useChronosOrchestrator();
  
  const [initialized, setInitialized] = useState(false);
  const [orchestratorAddress, setOrchestratorAddress] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  
  // Raiku slot reservation form
  const [slotTime, setSlotTime] = useState('');
  const [reservationType, setReservationType] = useState(0); // 0 = Standard, 1 = Priority, 2 = Guaranteed
  const [priority, setPriority] = useState(5);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  
  // Batch execution form
  const [batchSize, setBatchSize] = useState(3);
  const [batchSuccess, setBatchSuccess] = useState(false);

  const handleInitialize = async () => {
    try {
      const result = await initializeOrchestrator();
      setOrchestratorAddress(result.orchestratorAddress);
      setTxSignature(result.signature);
      setInitialized(true);
    } catch (err) {
      console.error('Error initializing orchestrator:', err);
    }
  };

  const handleReserveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slotTimestamp = new Date(slotTime).getTime() / 1000;
      const result = await reserveRaikuSlot(slotTimestamp, reservationType, priority);
      setTxSignature(result.signature);
      setReservationSuccess(true);
      setTimeout(() => setReservationSuccess(false), 5000);
    } catch (err) {
      console.error('Error reserving slot:', err);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createExecutionBatch(batchSize);
      setTxSignature(result.signature);
      setBatchSuccess(true);
      setTimeout(() => setBatchSuccess(false), 5000);
    } catch (err) {
      console.error('Error creating batch:', err);
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
              <Link href="/dex" className="text-gray-300 hover:text-white transition">
                DEX
              </Link>
              <Link href="/market" className="text-gray-300 hover:text-white transition">
                Market
              </Link>
              <Link href="/orchestrator" className="text-white font-semibold">
                Orchestrator
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
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Orchestrator
            </h1>
            <p className="text-xl text-gray-300">
              Coordinate cross-program workflows with guaranteed execution timing via Raiku integration.
            </p>
          </motion.div>

          {!isReady ? (
            <Card variant="glass">
              <div className="text-center py-12 text-gray-400">
                Connect your wallet to use the Orchestrator
              </div>
            </Card>
          ) : !initialized ? (
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Initialize Orchestrator</CardTitle>
                <CardDescription>
                  Create your orchestrator instance to coordinate cross-program transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleInitialize} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Initialize Orchestrator
                    </>
                  )}
                </Button>
                
                {orchestratorAddress && (
                  <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-green-400 text-sm mb-2">✅ Orchestrator initialized!</p>
                    <p className="text-xs text-gray-400 font-mono mb-2">{orchestratorAddress}</p>
                    {txSignature && (
                      <a
                        href={getExplorerUrl(txSignature, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        View Transaction →
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Reserve Raiku Slot */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Reserve Raiku Slot
                  </CardTitle>
                  <CardDescription>
                    Reserve guaranteed execution time through Raiku's Ackermann Node
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReserveSlot} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Slot Time
                      </label>
                      <input
                        type="datetime-local"
                        value={slotTime}
                        onChange={(e) => setSlotTime(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Reservation Type
                      </label>
                      <select
                        value={reservationType}
                        onChange={(e) => setReservationType(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value={0}>Standard</option>
                        <option value={1}>Priority</option>
                        <option value={2}>Guaranteed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Priority (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={priority}
                        onChange={(e) => setPriority(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-purple-400 font-semibold">{priority}</div>
                    </div>

                    {reservationSuccess && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-green-400 text-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Slot reserved successfully!
                        </p>
                      </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Reserving...
                        </>
                      ) : (
                        'Reserve Slot'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Create Execution Batch */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Create Execution Batch
                  </CardTitle>
                  <CardDescription>
                    Batch multiple transactions for atomic execution with guaranteed ordering
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateBatch} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Batch Size (1-10 transactions)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    {batchSuccess && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-green-400 text-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Batch created successfully!
                        </p>
                      </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Batch'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

