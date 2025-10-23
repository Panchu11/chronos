'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, X, CheckCircle } from 'lucide-react';
import { getExplorerUrl } from '@/src/config/programs';

interface BidModalProps {
  auction: any;
  currentPrice: number;
  onClose: () => void;
  onBid: () => Promise<void>;
}

export function BidModal({ auction, currentPrice, onClose, onBid }: BidModalProps) {
  const [bidding, setBidding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleBid = async () => {
    try {
      setBidding(true);
      setError(null);
      await onBid();
      setSuccess(true);
    } catch (err) {
      console.error('Error placing bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to place bid');
    } finally {
      setBidding(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-green-500/30">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Bid Placed Successfully!
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                You won the auction at {currentPrice.toFixed(4)} SOL
              </p>
              {txSignature && (
                <a
                  href={getExplorerUrl(txSignature, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  View Transaction →
                </a>
              )}
            </div>
          </div>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-purple-500/30">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white">Confirm Bid</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Auction</div>
            <div className="text-white font-mono text-sm">
              #{auction.address.slice(0, 8)}...{auction.address.slice(-8)}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Current Price</div>
            <div className="text-2xl font-bold text-green-400">
              {currentPrice.toFixed(4)} SOL
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Starting Price</div>
            <div className="text-white">{auction.startingPrice.toFixed(4)} SOL</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Reserve Price</div>
            <div className="text-white">{auction.reservePrice.toFixed(4)} SOL</div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="text-sm text-purple-300">
              💡 This is a Dutch auction. The price decreases over time. You'll win at the current price shown above.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={bidding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBid}
            className="flex-1"
            disabled={bidding}
          >
            {bidding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Bid...
              </>
            ) : (
              'Confirm Bid'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

