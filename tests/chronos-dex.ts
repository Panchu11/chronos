import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChronosDex } from "../target/types/chronos_dex";
import { expect } from "chai";

describe("chronos-dex", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ChronosDex as Program<ChronosDex>;
  
  let marketPda: anchor.web3.PublicKey;
  let marketBump: number;
  let orderPda: anchor.web3.PublicKey;
  let orderBump: number;

  const authority = provider.wallet.publicKey;
  const baseMint = anchor.web3.Keypair.generate().publicKey;
  const quoteMint = anchor.web3.Keypair.generate().publicKey;

  before(async () => {
    [marketPda, marketBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), authority.toBuffer()],
      program.programId
    );
  });

  it("Initializes a DEX market", async () => {
    const tx = await program.methods
      .initializeMarket(baseMint, quoteMint)
      .accounts({
        market: marketPda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize market transaction:", tx);

    const marketAccount = await program.account.market.fetch(marketPda);

    expect(marketAccount.authority.toString()).to.equal(authority.toString());
    expect(marketAccount.baseMint.toString()).to.equal(baseMint.toString());
    expect(marketAccount.quoteMint.toString()).to.equal(quoteMint.toString());
    expect(marketAccount.currentBatchId.toNumber()).to.equal(0);
    expect(marketAccount.totalVolume.toNumber()).to.equal(0);
  });

  it("Places a buy order with slot reservation", async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const slotReservationTime = new anchor.BN(currentTime + 10);
    const price = new anchor.BN(1_000_000); // 1 USDC
    const amount = new anchor.BN(100_000_000); // 0.1 SOL
    const side = { buy: {} };

    const marketAccount = await program.account.market.fetch(marketPda);
    const batchId = marketAccount.currentBatchId;

    [orderPda, orderBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        marketPda.toBuffer(),
        authority.toBuffer(),
        batchId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .placeOrder(side, price, amount, slotReservationTime)
      .accounts({
        market: marketPda,
        order: orderPda,
        trader: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Place order transaction:", tx);

    const orderAccount = await program.account.order.fetch(orderPda);

    expect(orderAccount.market.toString()).to.equal(marketPda.toString());
    expect(orderAccount.trader.toString()).to.equal(authority.toString());
    expect(orderAccount.price.toNumber()).to.equal(price.toNumber());
    expect(orderAccount.amount.toNumber()).to.equal(amount.toNumber());
    expect(orderAccount.filledAmount.toNumber()).to.equal(0);
  });

  it("Places a sell order", async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const slotReservationTime = new anchor.BN(currentTime + 15);
    const price = new anchor.BN(1_100_000); // 1.1 USDC
    const amount = new anchor.BN(50_000_000); // 0.05 SOL
    const side = { sell: {} };

    const marketAccount = await program.account.market.fetch(marketPda);
    const batchId = marketAccount.currentBatchId;

    const [sellOrderPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        marketPda.toBuffer(),
        authority.toBuffer(),
        batchId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .placeOrder(side, price, amount, slotReservationTime)
      .accounts({
        market: marketPda,
        order: sellOrderPda,
        trader: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Place sell order transaction:", tx);

    const orderAccount = await program.account.order.fetch(sellOrderPda);
    expect(orderAccount.price.toNumber()).to.equal(price.toNumber());
  });

  it("Cancels an order", async () => {
    const tx = await program.methods
      .cancelOrder()
      .accounts({
        order: orderPda,
        trader: authority,
      })
      .rpc();

    console.log("Cancel order transaction:", tx);

    const orderAccount = await program.account.order.fetch(orderPda);
    expect(orderAccount.status).to.deep.equal({ cancelled: {} });
  });

  it("Executes batch auction", async () => {
    const tx = await program.methods
      .executeBatchAuction()
      .accounts({
        market: marketPda,
      })
      .rpc();

    console.log("Execute batch auction transaction:", tx);

    const marketAccount = await program.account.market.fetch(marketPda);
    expect(marketAccount.currentBatchId.toNumber()).to.be.greaterThan(0);
  });

  it("Fails to place order with past slot time", async () => {
    const pastTime = new anchor.BN(Math.floor(Date.now() / 1000) - 100);
    const price = new anchor.BN(1_000_000);
    const amount = new anchor.BN(100_000_000);
    const side = { buy: {} };

    const marketAccount = await program.account.market.fetch(marketPda);
    const batchId = marketAccount.currentBatchId;

    const [invalidOrderPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        marketPda.toBuffer(),
        authority.toBuffer(),
        batchId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    try {
      await program.methods
        .placeOrder(side, price, amount, pastTime)
        .accounts({
          market: marketPda,
          order: invalidOrderPda,
          trader: authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have thrown error for past slot time");
    } catch (error) {
      expect(error.toString()).to.include("InvalidSlotReservation");
    }
  });

  it("Fails to cancel already cancelled order", async () => {
    try {
      await program.methods
        .cancelOrder()
        .accounts({
          order: orderPda,
          trader: authority,
        })
        .rpc();
      
      expect.fail("Should have thrown error for already cancelled order");
    } catch (error) {
      expect(error.toString()).to.include("OrderNotOpen");
    }
  });

  it("Fails unauthorized order cancellation", async () => {
    const unauthorizedUser = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .cancelOrder()
        .accounts({
          order: orderPda,
          trader: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();
      
      expect.fail("Should have thrown error for unauthorized cancellation");
    } catch (error) {
      expect(error).to.exist;
    }
  });
});

