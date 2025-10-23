use anchor_lang::prelude::*;

declare_id!("8nAaEjXuKs9NC8MRwiBgyNEiAcY8Ab5YJsAaxnt6JaXJ");

#[program]
pub mod chronos_market {
    use super::*;

    /// Mint a Slot Reservation NFT
    pub fn mint_slot_nft(
        ctx: Context<MintSlotNFT>,
        slot_time: i64,
        capacity: u64,
    ) -> Result<()> {
        let slot_nft = &mut ctx.accounts.slot_nft;
        let clock = Clock::get()?;

        require!(slot_time > clock.unix_timestamp, MarketError::InvalidSlotTime);

        slot_nft.owner = ctx.accounts.minter.key();
        slot_nft.slot_time = slot_time;
        slot_nft.capacity = capacity;
        slot_nft.used_capacity = 0;
        slot_nft.status = SlotStatus::Available;
        slot_nft.minted_at = clock.unix_timestamp;
        slot_nft.bump = ctx.bumps.slot_nft;

        msg!("Slot NFT minted for slot_time: {} with capacity: {}", slot_time, capacity);
        Ok(())
    }

    /// Create a Dutch auction for a slot NFT
    pub fn create_auction(
        ctx: Context<CreateAuction>,
        starting_price: u64,
        reserve_price: u64,
        duration: i64,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let slot_nft = &ctx.accounts.slot_nft;
        let clock = Clock::get()?;

        require!(
            slot_nft.owner == ctx.accounts.seller.key(),
            MarketError::Unauthorized
        );
        require!(
            slot_nft.status == SlotStatus::Available,
            MarketError::SlotNotAvailable
        );

        auction.slot_nft = slot_nft.key();
        auction.seller = ctx.accounts.seller.key();
        auction.starting_price = starting_price;
        auction.reserve_price = reserve_price;
        auction.current_price = starting_price;
        auction.start_time = clock.unix_timestamp;
        auction.end_time = clock.unix_timestamp + duration;
        auction.status = AuctionStatus::Active;
        auction.bump = ctx.bumps.auction;

        msg!(
            "Dutch auction created: {} SOL → {} SOL over {} seconds",
            starting_price,
            reserve_price,
            duration
        );
        Ok(())
    }

    /// Place a bid on a Dutch auction
    pub fn place_bid(ctx: Context<PlaceBid>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(
            auction.status == AuctionStatus::Active,
            MarketError::AuctionNotActive
        );
        require!(
            clock.unix_timestamp <= auction.end_time,
            MarketError::AuctionEnded
        );

        // Calculate current Dutch auction price
        let elapsed = clock.unix_timestamp - auction.start_time;
        let duration = auction.end_time - auction.start_time;
        let price_drop = auction.starting_price - auction.reserve_price;
        
        auction.current_price = auction.starting_price
            - ((price_drop as u128 * elapsed as u128) / duration as u128) as u64;

        // Accept bid at current price
        auction.winner = Some(ctx.accounts.bidder.key());
        auction.final_price = auction.current_price;
        auction.status = AuctionStatus::Sold;

        msg!("Bid accepted at {} SOL", auction.current_price);
        Ok(())
    }

    /// List a slot NFT on secondary market
    pub fn list_on_secondary(
        ctx: Context<ListOnSecondary>,
        price: u64,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        let slot_nft = &ctx.accounts.slot_nft;

        require!(
            slot_nft.owner == ctx.accounts.seller.key(),
            MarketError::Unauthorized
        );

        listing.slot_nft = slot_nft.key();
        listing.seller = ctx.accounts.seller.key();
        listing.price = price;
        listing.status = ListingStatus::Active;
        listing.bump = ctx.bumps.listing;

        msg!("Slot NFT listed on secondary market for {} SOL", price);
        Ok(())
    }

    /// Purchase from secondary market
    pub fn purchase_from_secondary(ctx: Context<PurchaseFromSecondary>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        let slot_nft = &mut ctx.accounts.slot_nft;

        require!(
            listing.status == ListingStatus::Active,
            MarketError::ListingNotActive
        );

        // Transfer ownership
        slot_nft.owner = ctx.accounts.buyer.key();
        listing.status = ListingStatus::Sold;

        msg!("Slot NFT purchased for {} SOL", listing.price);
        Ok(())
    }

    /// Lease unused capacity to another protocol
    pub fn lease_capacity(
        ctx: Context<LeaseCapacity>,
        capacity_amount: u64,
        lease_price: u64,
    ) -> Result<()> {
        let slot_nft = &mut ctx.accounts.slot_nft;
        let lease = &mut ctx.accounts.lease;

        require!(
            slot_nft.owner == ctx.accounts.lessor.key(),
            MarketError::Unauthorized
        );
        require!(
            slot_nft.capacity - slot_nft.used_capacity >= capacity_amount,
            MarketError::InsufficientCapacity
        );

        lease.slot_nft = slot_nft.key();
        lease.lessor = ctx.accounts.lessor.key();
        lease.lessee = ctx.accounts.lessee.key();
        lease.capacity_amount = capacity_amount;
        lease.lease_price = lease_price;
        lease.status = LeaseStatus::Active;

        slot_nft.used_capacity += capacity_amount;

        msg!("Capacity leased: {} units for {} SOL", capacity_amount, lease_price);
        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
#[instruction(slot_time: i64)]
pub struct MintSlotNFT<'info> {
    #[account(
        init,
        payer = minter,
        space = 8 + SlotNFT::INIT_SPACE,
        seeds = [b"slot_nft", minter.key().as_ref(), &slot_time.to_le_bytes()],
        bump
    )]
    pub slot_nft: Account<'info, SlotNFT>,
    
    #[account(mut)]
    pub minter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateAuction<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + Auction::INIT_SPACE,
        seeds = [b"auction", slot_nft.key().as_ref()],
        bump
    )]
    pub auction: Account<'info, Auction>,
    
    pub slot_nft: Account<'info, SlotNFT>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    
    #[account(mut)]
    pub bidder: Signer<'info>,
}

#[derive(Accounts)]
pub struct ListOnSecondary<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", slot_nft.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    
    pub slot_nft: Account<'info, SlotNFT>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseFromSecondary<'info> {
    #[account(mut)]
    pub listing: Account<'info, Listing>,
    
    #[account(mut)]
    pub slot_nft: Account<'info, SlotNFT>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
}

#[derive(Accounts)]
pub struct LeaseCapacity<'info> {
    #[account(mut)]
    pub slot_nft: Account<'info, SlotNFT>,
    
    #[account(
        init,
        payer = lessor,
        space = 8 + Lease::INIT_SPACE,
        seeds = [b"lease", slot_nft.key().as_ref(), lessee.key().as_ref()],
        bump
    )]
    pub lease: Account<'info, Lease>,
    
    #[account(mut)]
    pub lessor: Signer<'info>,
    
    /// CHECK: Lessee doesn't need to sign for lease creation
    pub lessee: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

// Data Structures

#[account]
#[derive(InitSpace)]
pub struct SlotNFT {
    pub owner: Pubkey,
    pub slot_time: i64,
    pub capacity: u64,
    pub used_capacity: u64,
    pub status: SlotStatus,
    pub minted_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Auction {
    pub slot_nft: Pubkey,
    pub seller: Pubkey,
    pub winner: Option<Pubkey>,
    pub starting_price: u64,
    pub reserve_price: u64,
    pub current_price: u64,
    pub final_price: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub status: AuctionStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub slot_nft: Pubkey,
    pub seller: Pubkey,
    pub price: u64,
    pub status: ListingStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Lease {
    pub slot_nft: Pubkey,
    pub lessor: Pubkey,
    pub lessee: Pubkey,
    pub capacity_amount: u64,
    pub lease_price: u64,
    pub status: LeaseStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum SlotStatus {
    Available,
    Reserved,
    Executed,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum AuctionStatus {
    Active,
    Sold,
    Cancelled,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum ListingStatus {
    Active,
    Sold,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum LeaseStatus {
    Active,
    Completed,
    Cancelled,
}

// Errors

#[error_code]
pub enum MarketError {
    #[msg("Invalid slot time - must be in the future")]
    InvalidSlotTime,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Slot not available")]
    SlotNotAvailable,
    #[msg("Auction not active")]
    AuctionNotActive,
    #[msg("Auction has ended")]
    AuctionEnded,
    #[msg("Listing not active")]
    ListingNotActive,
    #[msg("Insufficient capacity")]
    InsufficientCapacity,
}

