'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle } from 'lucide-react';
import { useWalletReady } from '@/src/hooks/useProgram';
import { useChronosMarket } from '@/src/hooks/useChronosPrograms';
import { getExplorerUrl } from '@/src/config/programs';
import { PublicKey } from '@solana/web3.js';

interface CreateAuctionFormProps {
  slotNftAddress: string | null;
  onAuctionCreated?: () => void;
}

export function CreateAuctionForm({ slotNftAddress, onAuctionCreated }: CreateAuctionFormProps) {
  const { isReady } = useWalletReady();
  const { createAuction, loading } = useChronosMarket();
  const [mounted, setMounted] = useState(false);
  const [startingPrice, setStartingPrice] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [duration, setDuration] = useState('');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [auctionAddress, setAuctionAddress] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!isReady) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please connect your wallet to create auctions</p>
      </div>
    );
  }

  if (!slotNftAddress) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please mint a slot NFT first to create an auction</p>
      </div>
    );
  }

  const handleCreateAuction = async () => {
    try {
      setTxError(null);
      setTxSignature(null);

      if (!startingPrice || !reservePrice || !duration) {
        setTxError('Please fill in all fields');
        return;
      }

      const startingPriceNum = parseFloat(startingPrice);
      const reservePriceNum = parseFloat(reservePrice);
      const durationNum = parseInt(duration);

      if (startingPriceNum <= reservePriceNum) {
        setTxError('Starting price must be higher than reserve price');
        return;
      }

      console.log('Creating auction...');
      console.log('Slot NFT:', slotNftAddress);
      console.log('Starting Price:', startingPriceNum, 'SOL');
      console.log('Reserve Price:', reservePriceNum, 'SOL');
      console.log('Duration:', durationNum, 'seconds');

      const result = await createAuction(
        new PublicKey(slotNftAddress),
        startingPriceNum,
        reservePriceNum,
        durationNum
      );

      const address = result.auctionAddress.toBase58();
      setTxSignature(result.signature);
      setAuctionAddress(address);

      if (onAuctionCreated) {
        onAuctionCreated();
      }

      console.log('Auction created successfully!');
      console.log('Signature:', result.signature);
      console.log('Auction Address:', address);

      // Reset form
      setStartingPrice('');
      setReservePrice('');
      setDuration('');
    } catch (err) {
      console.error('=== Error creating auction ===');
      console.error('Error object:', err);
      setTxError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  if (txSignature && auctionAddress) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-400 mb-2">
              Auction Created Successfully!
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Auction Address:</p>
                <p className="text-sm font-mono text-white break-all">{auctionAddress}</p>
              </div>
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Transaction Signature:</p>
                <p className="text-sm font-mono text-white break-all">{txSignature}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={getExplorerUrl(auctionAddress, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  View Auction on Explorer →
                </a>
                <span className="text-gray-600">|</span>
                <a
                  href={getExplorerUrl(txSignature, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  View Transaction →
                </a>
              </div>
              <Button
                onClick={() => {
                  setTxSignature(null);
                  setAuctionAddress(null);
                }}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                Create Another Auction
              </Button>
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

      <div className="space-y-4">
        <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 mb-1">Slot NFT:</p>
          <p className="text-sm font-mono text-white break-all">{slotNftAddress}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Starting Price (SOL)
          </label>
          <input
            type="number"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            placeholder="e.g., 1.0"
            step="0.01"
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            min="0"
          />
          <p className="text-xs text-gray-400 mt-1">
            Initial price when auction starts
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Reserve Price (SOL)
          </label>
          <input
            type="number"
            value={reservePrice}
            onChange={(e) => setReservePrice(e.target.value)}
            placeholder="e.g., 0.5"
            step="0.01"
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            min="0"
          />
          <p className="text-xs text-gray-400 mt-1">
            Minimum price (price decreases over time)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 3600"
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            min="60"
          />
          <p className="text-xs text-gray-400 mt-1">
            How long the auction runs (minimum 60 seconds)
          </p>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-2">Dutch Auction</h4>
          <p className="text-xs text-gray-400">
            Price starts high and decreases linearly over time until it reaches the reserve price.
            First bidder wins at the current price.
          </p>
        </div>

        <Button
          onClick={handleCreateAuction}
          disabled={loading || !startingPrice || !reservePrice || !duration}
          size="lg"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Auction...
            </>
          ) : (
            'Create Dutch Auction'
          )}
        </Button>
      </div>
    </div>
  );
}

