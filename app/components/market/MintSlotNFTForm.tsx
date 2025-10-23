'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle } from 'lucide-react';
import { useWalletReady } from '@/src/hooks/useProgram';
import { useChronosMarket } from '@/src/hooks/useChronosPrograms';
import { getExplorerUrl } from '@/src/config/programs';

interface MintSlotNFTFormProps {
  onSlotMinted?: (slotNftAddress: string) => void;
}

export function MintSlotNFTForm({ onSlotMinted }: MintSlotNFTFormProps) {
  const { isReady } = useWalletReady();
  const { mintSlotNFT, loading } = useChronosMarket();
  const [mounted, setMounted] = useState(false);
  const [slotTime, setSlotTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [slotNftAddress, setSlotNftAddress] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!isReady) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please connect your wallet to mint slot NFTs</p>
      </div>
    );
  }

  const handleMintSlot = async () => {
    try {
      setTxError(null);
      setTxSignature(null);

      if (!slotTime || !capacity) {
        setTxError('Please fill in all fields');
        return;
      }

      const slotTimeUnix = Math.floor(new Date(slotTime).getTime() / 1000);
      const capacityNum = parseInt(capacity);

      console.log('Minting slot NFT...');
      console.log('Slot Time:', slotTimeUnix);
      console.log('Capacity:', capacityNum);

      const result = await mintSlotNFT(slotTimeUnix, capacityNum);

      const address = result.slotNftAddress.toBase58();
      setTxSignature(result.signature);
      setSlotNftAddress(address);

      if (onSlotMinted) {
        onSlotMinted(address);
      }

      console.log('Slot NFT minted successfully!');
      console.log('Signature:', result.signature);
      console.log('Slot NFT Address:', address);

      // Reset form
      setSlotTime('');
      setCapacity('');
    } catch (err) {
      console.error('=== Error minting slot NFT ===');
      console.error('Error object:', err);
      setTxError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  if (txSignature && slotNftAddress) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-400 mb-2">
              Slot NFT Minted Successfully!
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Slot NFT Address:</p>
                <p className="text-sm font-mono text-white break-all">{slotNftAddress}</p>
              </div>
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Transaction Signature:</p>
                <p className="text-sm font-mono text-white break-all">{txSignature}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={getExplorerUrl(slotNftAddress, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  View Slot NFT on Explorer →
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
                  setSlotNftAddress(null);
                }}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                Mint Another Slot
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Slot Time
          </label>
          <input
            type="datetime-local"
            value={slotTime}
            onChange={(e) => setSlotTime(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            min={new Date().toISOString().slice(0, 16)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Future time when this slot can be executed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Capacity
          </label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="e.g., 1000"
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            min="1"
          />
          <p className="text-xs text-gray-400 mt-1">
            Number of transactions this slot can hold
          </p>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-2">What is a Slot NFT?</h4>
          <p className="text-xs text-gray-400">
            Slot NFTs represent guaranteed execution time on the blockchain. They can be traded,
            auctioned, or leased to other protocols. Each slot has a specific time and capacity.
          </p>
        </div>

        <Button
          onClick={handleMintSlot}
          disabled={loading || !slotTime || !capacity}
          size="lg"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Minting Slot NFT...
            </>
          ) : (
            'Mint Slot NFT'
          )}
        </Button>
      </div>
    </div>
  );
}

