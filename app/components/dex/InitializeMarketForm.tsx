'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useChronosDex } from '@/src/hooks/useChronosPrograms';
import { useWalletReady } from '@/src/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { CheckCircle, Loader2 } from 'lucide-react';
import { getExplorerUrl } from '@/src/config/programs';

interface InitializeMarketFormProps {
  onMarketCreated?: (marketAddress: string) => void;
}

export function InitializeMarketForm({ onMarketCreated }: InitializeMarketFormProps) {
  const { isReady, publicKey } = useWalletReady();
  const { initializeMarket, checkMarketExists, loading } = useChronosDex();
  const [mounted, setMounted] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [marketAddress, setMarketAddress] = useState<string | null>(null);
  const [checkingMarket, setCheckingMarket] = useState(false);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if market already exists when wallet connects
  useEffect(() => {
    if (isReady && mounted) {
      setCheckingMarket(true);
      checkMarketExists().then(({ exists, marketAddress: existingMarket }) => {
        if (exists && existingMarket) {
          const address = existingMarket.toBase58();
          setMarketAddress(address);
          if (onMarketCreated) {
            onMarketCreated(address);
          }
          console.log('Found existing market:', address);
        }
        setCheckingMarket(false);
      }).catch((err) => {
        console.error('Error checking market:', err);
        setCheckingMarket(false);
      });
    }
  }, [isReady, mounted, publicKey?.toBase58()]);

  if (!mounted) {
    return null;
  }

  const handleInitializeMarket = async () => {
    try {
      setTxError(null);
      setTxSignature(null);

      // For demo purposes, using placeholder mint addresses
      // In production, these would be actual SPL token mints
      const baseMint = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL
      const quoteMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC (mainnet address for demo)

      console.log('Initializing market...');
      const result = await initializeMarket(baseMint, quoteMint);

      const address = result.marketAddress.toBase58();
      setTxSignature(result.signature);
      setMarketAddress(address);

      if (onMarketCreated) {
        onMarketCreated(address);
      }

      console.log('Market initialized successfully!');
      console.log('Signature:', result.signature);
      console.log('Market Address:', address);
    } catch (err) {
      console.error('=== Error initializing market ===');
      console.error('Error object:', err);
      setTxError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  if (!isReady) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 text-center">
        <p className="text-yellow-400">Please connect your wallet to initialize a market</p>
      </div>
    );
  }

  if (checkingMarket) {
    return (
      <div className="bg-gray-800/30 rounded-lg p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
        <p className="text-gray-400">Checking for existing market...</p>
      </div>
    );
  }

  if (marketAddress) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-400 mb-2">
              Market Ready!
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Market Address:</p>
                <p className="text-sm font-mono text-white break-all">{marketAddress}</p>
              </div>
              {txSignature && (
                <div className="bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Transaction Signature:</p>
                  <p className="text-sm font-mono text-white break-all">{txSignature}</p>
                </div>
              )}
              <div className="flex gap-2">
                <a
                  href={getExplorerUrl(marketAddress, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  View Market on Explorer →
                </a>
                {txSignature && (
                  <>
                    <span className="text-gray-600">|</span>
                    <a
                      href={getExplorerUrl(txSignature, 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      View Transaction →
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {txError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{txError}</p>
        </div>
      )}

      <div className="bg-gray-800/30 rounded-lg p-6 mb-4">
        <h4 className="text-sm font-semibold text-white mb-2">Market Configuration</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Base Token:</span>
            <span className="text-white">Wrapped SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Quote Token:</span>
            <span className="text-white">USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Batch Interval:</span>
            <span className="text-white">60 seconds</span>
          </div>
        </div>
      </div>

      <Button
        onClick={handleInitializeMarket}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Initializing Market...
          </>
        ) : (
          'Initialize DEX Market'
        )}
      </Button>

      <p className="text-xs text-gray-400 mt-3 text-center">
        This will create a new SOL/USDC market on Solana Devnet
      </p>
    </div>
  );
}

