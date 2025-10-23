/**
 * CHRONOS Protocol - Deployment Verification Script
 * 
 * This script verifies that all programs are deployed correctly
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: '.env.local' });

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 CHRONOS Protocol - Deployment Verification\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  // Read program IDs from target/deploy
  const programIds = [
    { name: 'Chronos Vault', file: 'chronos_vault-keypair.json' },
    { name: 'Chronos DEX', file: 'chronos_dex-keypair.json' },
    { name: 'Chronos Market', file: 'chronos_market-keypair.json' },
    { name: 'Chronos Orchestrator', file: 'chronos_orchestrator-keypair.json' },
  ];

  console.log('📋 Checking deployed programs:\n');

  for (const program of programIds) {
    const keypairPath = path.join(process.cwd(), 'target', 'deploy', program.file);
    
    if (!fs.existsSync(keypairPath)) {
      console.log(`⚠️  ${program.name}: Not deployed yet`);
      continue;
    }

    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const programId = new PublicKey(keypairData);

    try {
      const accountInfo = await connection.getAccountInfo(programId);
      
      if (accountInfo) {
        console.log(`✅ ${program.name}`);
        console.log(`   Program ID: ${programId.toBase58()}`);
        console.log(`   Executable: ${accountInfo.executable}`);
        console.log(`   Owner: ${accountInfo.owner.toBase58()}\n`);
      } else {
        console.log(`❌ ${program.name}: Account not found on devnet\n`);
      }
    } catch (error) {
      console.log(`❌ ${program.name}: Error checking account\n`);
    }
  }

  console.log('✅ Verification complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

