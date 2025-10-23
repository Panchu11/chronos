'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useChronosDex } from '@/src/hooks/useChronosPrograms';
import { useWalletReady } from '@/src/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';
import { CheckCircle, Loader2 } from 'lucide-react';
import { getExplorerUrl } from '@/src/config/programs';

interface PlaceOrderFormProps {
  marketAddress: string | null;
  onOrderPlaced?: () => void;
}

export function PlaceOrderForm({ marketAddress, onOrderPlaced }: PlaceOrderFormProps) {
  const { isReady } = useWalletReady();
  const { placeOrder, loading } = useChronosDex();
  const [mounted, setMounted] = useState(false);
  const [orderSide, setOrderSide] = useState<'Buy' | 'Sell'>('Buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [slotReservation, setSlotReservation] = useState(10);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [orderAddress, setOrderAddress] = useState<string | null>(null);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!marketAddress) {
      setTxError('Please initialize a market first');
      return;
    }

    if (!price || !amount) {
      setTxError('Please enter price and amount');
      return;
    }

    try {
      setTxError(null);
      setTxSignature(null);

      const marketPubkey = new PublicKey(marketAddress);
      const priceNum = parseFloat(price);
      const amountNum = parseFloat(amount);

      console.log('Placing order...');
      console.log('Side:', orderSide);
      console.log('Price:', priceNum);
      console.log('Amount:', amountNum);
      console.log('Slot Reservation:', slotReservation, 'seconds');

      const result = await placeOrder(
        marketPubkey,
        orderSide,
        priceNum,
        amountNum,
        slotReservation
      );

      setTxSignature(result.signature);
      setOrderAddress(result.orderAddress.toBase58());
      console.log('Order placed successfully!');
      console.log('Signature:', result.signature);
      console.log('Order Address:', result.orderAddress.toBase58());

      // Trigger refresh
      if (onOrderPlaced) {
        onOrderPlaced();
      }

      // Reset form
      setPrice('');
      setAmount('');
    } catch (err) {
      console.error('=== Error placing order ===');
      console.error('Error object:', err);
      setTxError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  if (!isReady) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 text-center">
        <p className="text-yellow-400">Please connect your wallet to place orders</p>
      </div>
    );
  }

  if (!marketAddress) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center">
        <p className="text-blue-400">Please initialize a market first to start trading</p>
      </div>
    );
  }

  return (
    <div>
      {txSignature && orderAddress && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-400 mb-2">
                Order Placed Successfully!
              </h4>
              <div className="space-y-2">
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-xs text-gray-400 mb-1">Order Address:</p>
                  <p className="text-xs font-mono text-white break-all">{orderAddress}</p>
                </div>
                <a
                  href={getExplorerUrl(txSignature, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  View Transaction →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {txError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{txError}</p>
        </div>
      )}

      {/* Order Type Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setOrderSide('Buy')}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            orderSide === 'Buy'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setOrderSide('Sell')}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            orderSide === 'Sell'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Price Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Price (USDC)
        </label>
        <input
          type="number"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Amount (SOL)
        </label>
        <input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Slot Reservation */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Slot Reservation: <span className="text-purple-400">{slotReservation}s</span>
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={slotReservation}
          onChange={(e) => setSlotReservation(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>JIT (1s)</span>
          <span>AOT (60s)</span>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Total</span>
          <span className="text-white font-semibold">
            {price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : '0.00'} USDC
          </span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Slot Fee</span>
          <span className="text-white">~0.001 SOL</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Execution Guarantee</span>
          <span className="text-green-400 font-semibold">FIFO</span>
        </div>
      </div>

      <Button
        onClick={handlePlaceOrder}
        disabled={loading || !price || !amount}
        size="lg"
        className={`w-full ${
          orderSide === 'Buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Placing Order...
          </>
        ) : (
          `Place ${orderSide} Order`
        )}
      </Button>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Orders are matched in FIFO order based on slot reservation time
      </p>
    </div>
  );
}

