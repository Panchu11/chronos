/**
 * CHRONOS Protocol - Wallet Setup Script
 * 
 * This script:
 * 1. Loads the deployer wallet from private key
 * 2. Checks the balance
 * 3. Derives program addresses
 * 4. Prepares for deployment
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function main() {
  console.log('🚀 CHRONOS Protocol - Wallet Setup\n');

  // 1. Load wallet from private key
  const privateKeyString = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error('DEPLOYER_PRIVATE_KEY not found in .env.local');
  }

  console.log('📝 Loading wallet from private key...');
  const privateKeyBytes = bs58.decode(privateKeyString);
  const keypair = Keypair.fromSecretKey(privateKeyBytes);
  const publicKey = keypair.publicKey;

  console.log('✅ Wallet loaded successfully!');
  console.log(`   Public Key: ${publicKey.toBase58()}\n`);

  // 2. Connect to Solana devnet
  console.log('🌐 Connecting to Solana devnet...');
  const connection = new Connection(DEVNET_RPC, 'confirmed');

  // 3. Check balance
  console.log('💰 Checking wallet balance...');
  const balance = await connection.getBalance(publicKey);
  const balanceSOL = balance / LAMPORTS_PER_SOL;

  console.log(`   Balance: ${balanceSOL} SOL`);
  
  if (balanceSOL < 2) {
    console.log('⚠️  WARNING: Low balance! You need at least 2 SOL for deployment.');
    console.log('   Please add more SOL from: https://faucet.solana.com\n');
  } else {
    console.log('✅ Sufficient balance for deployment!\n');
  }

  // 4. Save wallet keypair to file for Anchor
  console.log('💾 Saving wallet keypair for Anchor...');
  const walletDir = path.join(process.cwd(), '.anchor');
  if (!fs.existsSync(walletDir)) {
    fs.mkdirSync(walletDir, { recursive: true });
  }

  const walletPath = path.join(walletDir, 'deployer-keypair.json');
  fs.writeFileSync(
    walletPath,
    JSON.stringify(Array.from(keypair.secretKey))
  );
  console.log(`   Saved to: ${walletPath}\n`);

  // 5. Display summary
  console.log('📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Wallet Address:  ${publicKey.toBase58()}`);
  console.log(`Network:         Devnet`);
  console.log(`RPC Endpoint:    ${DEVNET_RPC}`);
  console.log(`Balance:         ${balanceSOL} SOL`);
  console.log(`Status:          ${balanceSOL >= 2 ? '✅ Ready' : '⚠️  Needs more SOL'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 6. Next steps
  console.log('🎯 Next Steps:');
  console.log('1. Build Anchor programs: anchor build');
  console.log('2. Deploy to devnet: anchor deploy --provider.cluster devnet');
  console.log('3. Update .env.local with program IDs');
  console.log('4. Test the deployment\n');

  console.log('✅ Wallet setup complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

