use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FstLfRbswUSasgad1grV8ZY5Bh79CcAUe32vRoqNvJo6");

#[program]
pub mod chronos_dex {
    use super::*;

    /// Initialize the DEX market
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        base_mint: Pubkey,
        quote_mint: Pubkey,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        market.authority = ctx.accounts.authority.key();
        market.base_mint = base_mint;
        market.quote_mint = quote_mint;
        market.current_batch_id = 0;
        market.total_volume = 0;
        market.bump = ctx.bumps.market;
        
        msg!("DEX Market initialized for {}/{}", base_mint, quote_mint);
        Ok(())
    }

    /// Place an order with slot reservation
    pub fn place_order(
        ctx: Context<PlaceOrder>,
        side: OrderSide,
        price: u64,
        amount: u64,
        slot_reservation_time: i64,
    ) -> Result<()> {
        let order = &mut ctx.accounts.order;
        let market = &ctx.accounts.market;
        let clock = Clock::get()?;

        // Validate slot reservation
        require!(
            slot_reservation_time >= clock.unix_timestamp,
            DexError::InvalidSlotReservation
        );

        // Initialize order
        order.market = market.key();
        order.trader = ctx.accounts.trader.key();
        order.side = side;
        order.price = price;
        order.amount = amount;
        order.filled_amount = 0;
        order.slot_reservation_time = slot_reservation_time;
        order.status = OrderStatus::Open;
        order.created_at = clock.unix_timestamp;
        order.batch_id = market.current_batch_id;

        msg!(
            "Order placed: {:?} {} @ {} (slot: {})",
            side,
            amount,
            price,
            slot_reservation_time
        );
        Ok(())
    }

    /// Cancel an open order
    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        let order = &mut ctx.accounts.order;
        
        require!(order.status == OrderStatus::Open, DexError::OrderNotOpen);
        require!(order.trader == ctx.accounts.trader.key(), DexError::Unauthorized);

        order.status = OrderStatus::Cancelled;
        
        msg!("Order cancelled");
        Ok(())
    }

    /// Execute batch auction for deterministic matching
    pub fn execute_batch_auction(ctx: Context<ExecuteBatchAuction>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        // In production, this would:
        // 1. Collect all orders in the current batch
        // 2. Sort by slot_reservation_time (FIFO)
        // 3. Match orders at uniform clearing price
        // 4. Execute settlements atomically

        msg!("Executing batch auction for batch_id: {}", market.current_batch_id);
        
        // Increment batch ID for next round
        market.current_batch_id = market.current_batch_id.checked_add(1).unwrap();
        
        msg!("Batch auction completed at {}", clock.unix_timestamp);
        Ok(())
    }

    /// Settle a matched trade
    pub fn settle_trade(
        ctx: Context<SettleTrade>,
        amount: u64,
        price: u64,
    ) -> Result<()> {
        let market = &ctx.accounts.market;
        
        // Calculate quote amount
        let quote_amount = (amount as u128)
            .checked_mul(price as u128)
            .unwrap()
            .checked_div(1_000_000) // Price precision
            .unwrap() as u64;

        // Transfer base tokens from buyer to seller
        let cpi_accounts_base = Transfer {
            from: ctx.accounts.buyer_base_account.to_account_info(),
            to: ctx.accounts.seller_base_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_base = CpiContext::new(cpi_program.clone(), cpi_accounts_base);
        token::transfer(cpi_ctx_base, amount)?;

        // Transfer quote tokens from seller to buyer
        let cpi_accounts_quote = Transfer {
            from: ctx.accounts.seller_quote_account.to_account_info(),
            to: ctx.accounts.buyer_quote_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_ctx_quote = CpiContext::new(cpi_program, cpi_accounts_quote);
        token::transfer(cpi_ctx_quote, quote_amount)?;

        msg!("Trade settled: {} base @ {} = {} quote", amount, price, quote_amount);
        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", authority.key().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceOrder<'info> {
    #[account(
        seeds = [b"market", market.authority.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(
        init,
        payer = trader,
        space = 8 + Order::INIT_SPACE,
        seeds = [
            b"order",
            market.key().as_ref(),
            trader.key().as_ref(),
            &market.current_batch_id.to_le_bytes()
        ],
        bump
    )]
    pub order: Account<'info, Order>,
    
    #[account(mut)]
    pub trader: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub order: Account<'info, Order>,
    
    pub trader: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteBatchAuction<'info> {
    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,
}

#[derive(Accounts)]
pub struct SettleTrade<'info> {
    #[account(
        seeds = [b"market", market.authority.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,
    
    pub buyer: Signer<'info>,
    pub seller: Signer<'info>,
    
    #[account(mut)]
    pub buyer_base_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub buyer_quote_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub seller_base_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub seller_quote_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

// Data Structures

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub current_batch_id: u64,
    pub total_volume: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Order {
    pub market: Pubkey,
    pub trader: Pubkey,
    pub side: OrderSide,
    pub price: u64,
    pub amount: u64,
    pub filled_amount: u64,
    pub slot_reservation_time: i64,
    pub status: OrderStatus,
    pub created_at: i64,
    pub batch_id: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum OrderSide {
    Buy,
    Sell,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
}

// Errors

#[error_code]
pub enum DexError {
    #[msg("Invalid slot reservation time")]
    InvalidSlotReservation,
    #[msg("Order is not open")]
    OrderNotOpen,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
}

