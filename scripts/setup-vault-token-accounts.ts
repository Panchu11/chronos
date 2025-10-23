import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to create token accounts for vaults
 * 
 * This will create Associated Token Accounts (ATAs) for:
 * 1. User's wallet (if not exists)
 * 2. Vault PDA (if not exists)
 */

async function main() {
  // Connect to Devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load the payer keypair
  const payerKeypairPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  
  if (!fs.existsSync(payerKeypairPath)) {
    console.error('❌ Keypair not found at:', payerKeypairPath);
    process.exit(1);
  }

  const payerKeypairData = JSON.parse(fs.readFileSync(payerKeypairPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(payerKeypairData));

  console.log('🔑 Payer:', payer.publicKey.toBase58());

  // Load token config
  const tokenConfigPath = path.join(__dirname, '..', 'app', 'src', 'config', 'token.ts');
  if (!fs.existsSync(tokenConfigPath)) {
    console.error('❌ Token config not found. Please run create-test-token.ts first');
    process.exit(1);
  }

  // Extract mint address from config file
  const configContent = fs.readFileSync(tokenConfigPath, 'utf-8');
  const mintMatch = configContent.match(/new PublicKey\('([^']+)'\)/);
  if (!mintMatch) {
    console.error('❌ Could not parse mint address from config');
    process.exit(1);
  }

  const mint = new PublicKey(mintMatch[1]);
  console.log('🪙 Token Mint:', mint.toBase58());

  // Derive vault PDA
  const VAULT_PROGRAM_ID = new PublicKey('EjG3EGtjpC9VtgrzuW6aJ55KcJuWF5buuvhF4S5B7EcP');
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), payer.publicKey.toBuffer()],
    VAULT_PROGRAM_ID
  );

  console.log('🏦 Vault PDA:', vaultPda.toBase58());

  // Create user's token account (if not exists)
  console.log('\n📝 Setting up user token account...');
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log('✅ User Token Account:', userTokenAccount.address.toBase58());

  // Create vault's token account (if not exists)
  console.log('\n📝 Setting up vault token account...');
  const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    vaultPda,
    true // allowOwnerOffCurve - allows PDA as owner
  );
  console.log('✅ Vault Token Account:', vaultTokenAccount.address.toBase58());

  console.log('\n🎉 Setup complete!');
  console.log('\n📋 Summary:');
  console.log('   Token Mint:', mint.toBase58());
  console.log('   User Token Account:', userTokenAccount.address.toBase58());
  console.log('   Vault PDA:', vaultPda.toBase58());
  console.log('   Vault Token Account:', vaultTokenAccount.address.toBase58());
  console.log('\n💡 You can now deposit/withdraw from your vault!');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});

