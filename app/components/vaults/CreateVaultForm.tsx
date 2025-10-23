'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useChronosVault } from '@/src/hooks/useChronosPrograms';
import { useWalletReady } from '@/src/hooks/useProgram';
import { getExplorerUrl } from '@/src/config/programs';

type StrategyType = 'YieldOptimization' | 'DeltaNeutral' | 'Arbitrage';

interface CreateVaultFormProps {
  selectedStrategy: StrategyType | null;
  onSuccess?: () => void;
}

export function CreateVaultForm({ selectedStrategy, onSuccess }: CreateVaultFormProps) {
  const { isReady } = useWalletReady();
  const { initializeVault, checkVaultExists, loading, error } = useChronosVault();

  const [mounted, setMounted] = useState(false);
  const [riskLevel, setRiskLevel] = useState(5);
  const [rebalanceFrequency, setRebalanceFrequency] = useState(3600); // 1 hour in seconds
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [existingVault, setExistingVault] = useState<string | null>(null);
  const [hasCheckedVault, setHasCheckedVault] = useState(false);

  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if vault already exists when wallet is ready (only once)
  useEffect(() => {
    if (isReady && mounted && !hasCheckedVault) {
      setHasCheckedVault(true);
      checkVaultExists().then(({ exists, vaultAddress }) => {
        if (exists && vaultAddress) {
          setExistingVault(vaultAddress.toBase58());
        }
      }).catch((err) => {
        console.error('Error checking vault:', err);
      });
    }

    if (!isReady) {
      setHasCheckedVault(false);
      setExistingVault(null);
    }
  }, [isReady, mounted]);

  const handleCreateVault = async () => {
    if (!selectedStrategy || !isReady) return;

    try {
      setTxError(null);
      setTxSignature(null);

      const result = await initializeVault(
        selectedStrategy,
        riskLevel,
        rebalanceFrequency
      );

      setTxSignature(result.signature);
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  // Don't render until mounted to avoid hydration errors
  if (!mounted) {
    return null;
  }

  if (!selectedStrategy) {
    return (
      <div className="text-center py-8 text-gray-400">
        Please select a strategy above to continue
      </div>
    );
  }

  // Show existing vault message
  if (existingVault) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="border-t border-gray-700 pt-6"
      >
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">
                Vault Already Exists
              </h3>
              <p className="text-gray-300 mb-3">
                You already have a vault created for this wallet.
              </p>
              <div className="bg-gray-800/50 rounded p-3 mb-3">
                <p className="text-xs text-gray-400 mb-1">Vault Address:</p>
                <p className="text-sm font-mono text-white break-all">{existingVault}</p>
              </div>
              <a
                href={getExplorerUrl(existingVault, 'address')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                View on Solana Explorer →
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="border-t border-gray-700 pt-6"
    >
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Initial Deposit (SOL)
          </label>
          <input
            type="number"
            placeholder="0.00"
            step="0.1"
            min="0"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum: 0.1 SOL</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rebalance Frequency
          </label>
          <select 
            value={rebalanceFrequency}
            onChange={(e) => setRebalanceFrequency(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={3600}>Every 1 hour</option>
            <option value={14400}>Every 4 hours</option>
            <option value={43200}>Every 12 hours</option>
            <option value={86400}>Every 24 hours</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Risk Level: <span className="text-purple-400">{riskLevel}</span>
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={riskLevel}
          onChange={(e) => setRiskLevel(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Conservative</span>
          <span>Aggressive</span>
        </div>
      </div>

      {/* Transaction Status */}
      {txSignature && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Vault Created Successfully!</span>
          </div>
          <a
            href={getExplorerUrl(txSignature, 'tx')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300 underline"
          >
            View transaction on Explorer
          </a>
        </div>
      )}

      {txError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Transaction Failed</span>
          </div>
          <p className="text-sm text-gray-300">{txError}</p>
        </div>
      )}

      {error && !txError && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">{error}</p>
        </div>
      )}

      <Button 
        size="lg" 
        className="w-full"
        onClick={handleCreateVault}
        disabled={!isReady || loading || !!txSignature}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Creating Vault...
          </>
        ) : txSignature ? (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Vault Created!
          </>
        ) : (
          <>
            <Plus className="w-5 h-5 mr-2" />
            Create Vault
          </>
        )}
      </Button>

      {!isReady && (
        <p className="text-sm text-yellow-400 mt-2 text-center">
          Please connect your wallet to create a vault
        </p>
      )}
    </motion.div>
  );
}

