import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChronosOrchestrator } from "../target/types/chronos_orchestrator";
import { expect } from "chai";

describe("chronos-orchestrator", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ChronosOrchestrator as Program<ChronosOrchestrator>;
  
  let orchestratorPda: anchor.web3.PublicKey;
  let reservationPda: anchor.web3.PublicKey;
  let batchPda: anchor.web3.PublicKey;

  const authority = provider.wallet.publicKey;
  const currentTime = Math.floor(Date.now() / 1000);

  before(async () => {
    [orchestratorPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("orchestrator")],
      program.programId
    );
  });

  it("Initializes the orchestrator", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        orchestrator: orchestratorPda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize orchestrator transaction:", tx);

    const orchestratorAccount = await program.account.orchestrator.fetch(orchestratorPda);

    expect(orchestratorAccount.authority.toString()).to.equal(authority.toString());
    expect(orchestratorAccount.totalSlotsReserved.toNumber()).to.equal(0);
    expect(orchestratorAccount.totalExecutions.toNumber()).to.equal(0);
    expect(orchestratorAccount.successRate).to.equal(10000); // 100%
  });

  it("Reserves a Raiku slot (AOT)", async () => {
    const slotTime = new anchor.BN(currentTime + 30);
    const reservationType = { aot: {} };
    const priority = 5;

    [reservationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("reservation"),
        authority.toBuffer(),
        slotTime.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .reserveRaikuSlot(slotTime, reservationType, priority)
      .accounts({
        orchestrator: orchestratorPda,
        reservation: reservationPda,
        requester: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Reserve Raiku slot transaction:", tx);

    const reservationAccount = await program.account.slotReservation.fetch(reservationPda);
    const orchestratorAccount = await program.account.orchestrator.fetch(orchestratorPda);

    expect(reservationAccount.requester.toString()).to.equal(authority.toString());
    expect(reservationAccount.slotTime.toNumber()).to.equal(slotTime.toNumber());
    expect(reservationAccount.priority).to.equal(priority);
    expect(reservationAccount.status).to.deep.equal({ pending: {} });
    expect(orchestratorAccount.totalSlotsReserved.toNumber()).to.equal(1);
  });

  it("Reserves a Raiku slot (JIT)", async () => {
    const slotTime = new anchor.BN(currentTime + 5);
    const reservationType = { jit: {} };
    const priority = 10;

    const [jitReservationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("reservation"),
        authority.toBuffer(),
        slotTime.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .reserveRaikuSlot(slotTime, reservationType, priority)
      .accounts({
        orchestrator: orchestratorPda,
        reservation: jitReservationPda,
        requester: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Reserve JIT slot transaction:", tx);

    const reservationAccount = await program.account.slotReservation.fetch(jitReservationPda);
    expect(reservationAccount.reservationType).to.deep.equal({ jit: {} });
  });

  it("Creates an execution batch", async () => {
    const batchSize = 5;

    [batchPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("batch"),
        authority.toBuffer(),
        new anchor.BN(currentTime).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .createExecutionBatch(batchSize)
      .accounts({
        orchestrator: orchestratorPda,
        batch: batchPda,
        creator: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create execution batch transaction:", tx);

    const batchAccount = await program.account.executionBatch.fetch(batchPda);

    expect(batchAccount.creator.toString()).to.equal(authority.toString());
    expect(batchAccount.batchSize).to.equal(batchSize);
    expect(batchAccount.executedCount).to.equal(0);
    expect(batchAccount.status).to.deep.equal({ pending: {} });
  });

  it("Executes a batch", async () => {
    const tx = await program.methods
      .executeBatch()
      .accounts({
        orchestrator: orchestratorPda,
        batch: batchPda,
      })
      .rpc();

    console.log("Execute batch transaction:", tx);

    const batchAccount = await program.account.executionBatch.fetch(batchPda);
    const orchestratorAccount = await program.account.orchestrator.fetch(orchestratorPda);

    expect(batchAccount.status).to.deep.equal({ executed: {} });
    expect(batchAccount.executedCount).to.equal(batchAccount.batchSize);
    expect(batchAccount.executedAt).to.exist;
    expect(orchestratorAccount.totalExecutions.toNumber()).to.be.greaterThan(0);
  });

  it("Confirms slot reservation", async () => {
    const reservationAccount = await program.account.slotReservation.fetch(reservationPda);
    const confirmationId = reservationAccount.raikuConfirmationId;

    const tx = await program.methods
      .confirmSlotReservation(confirmationId)
      .accounts({
        reservation: reservationPda,
      })
      .rpc();

    console.log("Confirm slot reservation transaction:", tx);

    const updatedReservation = await program.account.slotReservation.fetch(reservationPda);
    expect(updatedReservation.status).to.deep.equal({ confirmed: {} });
  });

  it("Gets pre-confirmation status", async () => {
    const tx = await program.methods
      .getPreconfirmation()
      .accounts({
        reservation: reservationPda,
      })
      .rpc();

    console.log("Get pre-confirmation transaction:", tx);
    // This is a read-only operation, just verify it doesn't fail
  });

  it("Handles execution failure", async () => {
    // Create a new batch for failure testing
    const failBatchTime = currentTime + 100;
    const [failBatchPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("batch"),
        authority.toBuffer(),
        new anchor.BN(failBatchTime).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .createExecutionBatch(3)
      .accounts({
        orchestrator: orchestratorPda,
        batch: failBatchPda,
        creator: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const errorCode = 1001;

    const tx = await program.methods
      .handleExecutionFailure(errorCode)
      .accounts({
        orchestrator: orchestratorPda,
        batch: failBatchPda,
      })
      .rpc();

    console.log("Handle execution failure transaction:", tx);

    const batchAccount = await program.account.executionBatch.fetch(failBatchPda);
    expect(batchAccount.status).to.deep.equal({ failed: {} });
    expect(batchAccount.errorCode).to.equal(errorCode);
  });

  it("Fails to reserve slot in the past", async () => {
    const pastTime = new anchor.BN(currentTime - 100);
    const reservationType = { aot: {} };

    const [invalidReservationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("reservation"),
        authority.toBuffer(),
        pastTime.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    try {
      await program.methods
        .reserveRaikuSlot(pastTime, reservationType, 5)
        .accounts({
          orchestrator: orchestratorPda,
          reservation: invalidReservationPda,
          requester: authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have thrown error for past slot time");
    } catch (error) {
      expect(error.toString()).to.include("InvalidSlotTime");
    }
  });

  it("Fails to create batch with invalid size", async () => {
    const invalidBatchSize = 15; // Max is 10

    const [invalidBatchPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("batch"),
        authority.toBuffer(),
        new anchor.BN(currentTime + 200).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    try {
      await program.methods
        .createExecutionBatch(invalidBatchSize)
        .accounts({
          orchestrator: orchestratorPda,
          batch: invalidBatchPda,
          creator: authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have thrown error for invalid batch size");
    } catch (error) {
      expect(error.toString()).to.include("InvalidBatchSize");
    }
  });

  it("Fails to execute already executed batch", async () => {
    try {
      await program.methods
        .executeBatch()
        .accounts({
          orchestrator: orchestratorPda,
          batch: batchPda,
        })
        .rpc();
      
      expect.fail("Should have thrown error for already executed batch");
    } catch (error) {
      expect(error.toString()).to.include("BatchNotPending");
    }
  });
});

