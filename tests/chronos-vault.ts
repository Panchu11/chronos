import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChronosVault } from "../target/types/chronos_vault";
import { expect } from "chai";

describe("chronos-vault", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ChronosVault as Program<ChronosVault>;
  
  let vaultPda: anchor.web3.PublicKey;
  let vaultBump: number;
  let userPositionPda: anchor.web3.PublicKey;
  let userPositionBump: number;

  const authority = provider.wallet.publicKey;

  before(async () => {
    // Derive PDAs
    [vaultPda, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), authority.toBuffer()],
      program.programId
    );

    [userPositionPda, userPositionBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), vaultPda.toBuffer(), authority.toBuffer()],
      program.programId
    );
  });

  it("Initializes a vault", async () => {
    const strategyType = { yieldOptimization: {} };
    const riskLevel = 5;
    const rebalanceFrequency = new anchor.BN(3600); // 1 hour

    const tx = await program.methods
      .initializeVault(strategyType, riskLevel, rebalanceFrequency)
      .accounts({
        vault: vaultPda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize vault transaction:", tx);

    // Fetch the vault account
    const vaultAccount = await program.account.vault.fetch(vaultPda);

    expect(vaultAccount.authority.toString()).to.equal(authority.toString());
    expect(vaultAccount.riskLevel).to.equal(riskLevel);
    expect(vaultAccount.totalDeposits.toNumber()).to.equal(0);
    expect(vaultAccount.totalShares.toNumber()).to.equal(0);
  });

  it("Deposits funds into vault", async () => {
    const depositAmount = new anchor.BN(1_000_000_000); // 1 SOL

    const tx = await program.methods
      .deposit(depositAmount)
      .accounts({
        vault: vaultPda,
        userPosition: userPositionPda,
        user: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Deposit transaction:", tx);

    // Fetch accounts
    const vaultAccount = await program.account.vault.fetch(vaultPda);
    const positionAccount = await program.account.userPosition.fetch(userPositionPda);

    expect(vaultAccount.totalDeposits.toNumber()).to.equal(depositAmount.toNumber());
    expect(positionAccount.shares.toNumber()).to.be.greaterThan(0);
    expect(positionAccount.depositedAmount.toNumber()).to.equal(depositAmount.toNumber());
  });

  it("Reserves an execution slot", async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const slotTime = new anchor.BN(currentTime + 30); // 30 seconds in future
    const reservationType = { aot: {} };

    const tx = await program.methods
      .reserveExecutionSlot(slotTime, reservationType)
      .accounts({
        vault: vaultPda,
        authority: authority,
      })
      .rpc();

    console.log("Reserve slot transaction:", tx);

    // Fetch vault to verify reservation
    const vaultAccount = await program.account.vault.fetch(vaultPda);
    expect(vaultAccount.reservedSlots.length).to.be.greaterThan(0);
    
    const reservation = vaultAccount.reservedSlots[0];
    expect(reservation.slotTime.toNumber()).to.equal(slotTime.toNumber());
  });

  it("Executes vault strategy", async () => {
    const tx = await program.methods
      .executeStrategy()
      .accounts({
        vault: vaultPda,
        authority: authority,
      })
      .rpc();

    console.log("Execute strategy transaction:", tx);

    // Fetch vault to verify execution
    const vaultAccount = await program.account.vault.fetch(vaultPda);
    expect(vaultAccount.lastRebalance.toNumber()).to.be.greaterThan(0);
  });

  it("Withdraws funds from vault", async () => {
    // First get current position
    const positionBefore = await program.account.userPosition.fetch(userPositionPda);
    const sharesToBurn = positionBefore.shares.div(new anchor.BN(2)); // Withdraw 50%

    const tx = await program.methods
      .withdraw(sharesToBurn)
      .accounts({
        vault: vaultPda,
        userPosition: userPositionPda,
        user: authority,
      })
      .rpc();

    console.log("Withdraw transaction:", tx);

    // Fetch accounts after withdrawal
    const vaultAfter = await program.account.vault.fetch(vaultPda);
    const positionAfter = await program.account.userPosition.fetch(userPositionPda);

    expect(positionAfter.shares.toNumber()).to.be.lessThan(positionBefore.shares.toNumber());
    expect(vaultAfter.totalShares.toNumber()).to.be.lessThan(positionBefore.shares.toNumber());
  });

  it("Fails to reserve slot in the past", async () => {
    const pastTime = new anchor.BN(Math.floor(Date.now() / 1000) - 100);
    const reservationType = { aot: {} };

    try {
      await program.methods
        .reserveExecutionSlot(pastTime, reservationType)
        .accounts({
          vault: vaultPda,
          authority: authority,
        })
        .rpc();
      
      expect.fail("Should have thrown error for past slot time");
    } catch (error) {
      expect(error.toString()).to.include("InvalidSlotTime");
    }
  });

  it("Fails to withdraw more shares than owned", async () => {
    const position = await program.account.userPosition.fetch(userPositionPda);
    const tooManyShares = position.shares.add(new anchor.BN(1_000_000));

    try {
      await program.methods
        .withdraw(tooManyShares)
        .accounts({
          vault: vaultPda,
          userPosition: userPositionPda,
          user: authority,
        })
        .rpc();
      
      expect.fail("Should have thrown error for insufficient shares");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientShares");
    }
  });

  it("Fails unauthorized strategy execution", async () => {
    const unauthorizedUser = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .executeStrategy()
        .accounts({
          vault: vaultPda,
          authority: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();
      
      expect.fail("Should have thrown error for unauthorized access");
    } catch (error) {
      expect(error).to.exist;
    }
  });
});

