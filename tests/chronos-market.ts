import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChronosMarket } from "../target/types/chronos_market";
import { expect } from "chai";

describe("chronos-market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ChronosMarket as Program<ChronosMarket>;
  
  let slotNftPda: anchor.web3.PublicKey;
  let auctionPda: anchor.web3.PublicKey;
  let listingPda: anchor.web3.PublicKey;

  const minter = provider.wallet.publicKey;
  const currentTime = Math.floor(Date.now() / 1000);
  const slotTime = new anchor.BN(currentTime + 60);

  before(async () => {
    [slotNftPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("slot_nft"),
        minter.toBuffer(),
        slotTime.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [auctionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), slotNftPda.toBuffer()],
      program.programId
    );

    [listingPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), slotNftPda.toBuffer()],
      program.programId
    );
  });

  it("Mints a slot NFT", async () => {
    const capacity = new anchor.BN(1000);

    const tx = await program.methods
      .mintSlotNft(slotTime, capacity)
      .accounts({
        slotNft: slotNftPda,
        minter: minter,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Mint slot NFT transaction:", tx);

    const nftAccount = await program.account.slotNft.fetch(slotNftPda);

    expect(nftAccount.owner.toString()).to.equal(minter.toString());
    expect(nftAccount.slotTime.toNumber()).to.equal(slotTime.toNumber());
    expect(nftAccount.capacity.toNumber()).to.equal(capacity.toNumber());
    expect(nftAccount.usedCapacity.toNumber()).to.equal(0);
    expect(nftAccount.status).to.deep.equal({ available: {} });
  });

  it("Creates a Dutch auction", async () => {
    const startingPrice = new anchor.BN(5_000_000_000); // 5 SOL
    const reservePrice = new anchor.BN(1_000_000_000); // 1 SOL
    const duration = new anchor.BN(300); // 5 minutes

    const tx = await program.methods
      .createAuction(startingPrice, reservePrice, duration)
      .accounts({
        auction: auctionPda,
        slotNft: slotNftPda,
        seller: minter,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create auction transaction:", tx);

    const auctionAccount = await program.account.auction.fetch(auctionPda);

    expect(auctionAccount.slotNft.toString()).to.equal(slotNftPda.toString());
    expect(auctionAccount.seller.toString()).to.equal(minter.toString());
    expect(auctionAccount.startingPrice.toNumber()).to.equal(startingPrice.toNumber());
    expect(auctionAccount.reservePrice.toNumber()).to.equal(reservePrice.toNumber());
    expect(auctionAccount.status).to.deep.equal({ active: {} });
  });

  it("Places a bid on Dutch auction", async () => {
    const tx = await program.methods
      .placeBid()
      .accounts({
        auction: auctionPda,
        bidder: minter,
      })
      .rpc();

    console.log("Place bid transaction:", tx);

    const auctionAccount = await program.account.auction.fetch(auctionPda);

    expect(auctionAccount.status).to.deep.equal({ sold: {} });
    expect(auctionAccount.winner).to.exist;
    expect(auctionAccount.finalPrice.toNumber()).to.be.greaterThan(0);
  });

  it("Lists slot NFT on secondary market", async () => {
    // First mint a new NFT for secondary market testing
    const newSlotTime = new anchor.BN(currentTime + 120);
    const [newNftPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("slot_nft"),
        minter.toBuffer(),
        newSlotTime.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .mintSlotNft(newSlotTime, new anchor.BN(500))
      .accounts({
        slotNft: newNftPda,
        minter: minter,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const [newListingPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), newNftPda.toBuffer()],
      program.programId
    );

    const price = new anchor.BN(2_000_000_000); // 2 SOL

    const tx = await program.methods
      .listOnSecondary(price)
      .accounts({
        listing: newListingPda,
        slotNft: newNftPda,
        seller: minter,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("List on secondary transaction:", tx);

    const listingAccount = await program.account.listing.fetch(newListingPda);

    expect(listingAccount.slotNft.toString()).to.equal(newNftPda.toString());
    expect(listingAccount.seller.toString()).to.equal(minter.toString());
    expect(listingAccount.price.toNumber()).to.equal(price.toNumber());
    expect(listingAccount.status).to.deep.equal({ active: {} });
  });

  it("Leases capacity from slot NFT", async () => {
    // Mint a new NFT for leasing
    const leaseSlotTime = new anchor.BN(currentTime + 180);
    const [leaseNftPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("slot_nft"),
        minter.toBuffer(),
        leaseSlotTime.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .mintSlotNft(leaseSlotTime, new anchor.BN(1000))
      .accounts({
        slotNft: leaseNftPda,
        minter: minter,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const lessee = anchor.web3.Keypair.generate().publicKey;
    const [leasePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("lease"), leaseNftPda.toBuffer(), lessee.toBuffer()],
      program.programId
    );

    const capacityAmount = new anchor.BN(200);
    const leasePrice = new anchor.BN(500_000_000); // 0.5 SOL

    const tx = await program.methods
      .leaseCapacity(capacityAmount, leasePrice)
      .accounts({
        slotNft: leaseNftPda,
        lease: leasePda,
        lessor: minter,
        lessee: lessee,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Lease capacity transaction:", tx);

    const leaseAccount = await program.account.lease.fetch(leasePda);
    const nftAccount = await program.account.slotNft.fetch(leaseNftPda);

    expect(leaseAccount.capacityAmount.toNumber()).to.equal(capacityAmount.toNumber());
    expect(leaseAccount.leasePrice.toNumber()).to.equal(leasePrice.toNumber());
    expect(leaseAccount.status).to.deep.equal({ active: {} });
    expect(nftAccount.usedCapacity.toNumber()).to.equal(capacityAmount.toNumber());
  });

  it("Fails to mint slot NFT with past time", async () => {
    const pastTime = new anchor.BN(currentTime - 100);
    const [invalidNftPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("slot_nft"),
        minter.toBuffer(),
        pastTime.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    try {
      await program.methods
        .mintSlotNft(pastTime, new anchor.BN(100))
        .accounts({
          slotNft: invalidNftPda,
          minter: minter,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have thrown error for past slot time");
    } catch (error) {
      expect(error.toString()).to.include("InvalidSlotTime");
    }
  });

  it("Fails to lease more capacity than available", async () => {
    const leaseSlotTime = new anchor.BN(currentTime + 240);
    const [nftPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("slot_nft"),
        minter.toBuffer(),
        leaseSlotTime.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .mintSlotNft(leaseSlotTime, new anchor.BN(100))
      .accounts({
        slotNft: nftPda,
        minter: minter,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const lessee = anchor.web3.Keypair.generate().publicKey;
    const [leasePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("lease"), nftPda.toBuffer(), lessee.toBuffer()],
      program.programId
    );

    const tooMuchCapacity = new anchor.BN(200);

    try {
      await program.methods
        .leaseCapacity(tooMuchCapacity, new anchor.BN(100_000_000))
        .accounts({
          slotNft: nftPda,
          lease: leasePda,
          lessor: minter,
          lessee: lessee,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have thrown error for insufficient capacity");
    } catch (error) {
      expect(error.toString()).to.include("InsufficientCapacity");
    }
  });
});

