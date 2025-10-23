use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("EjG3EGtjpC9VtgrzuW6aJ55KcJuWF5buuvhF4S5B7EcP");

#[program]
pub mod chronos_vault {
    use super::*;

    /// Initialize a new Temporal Vault with strategy parameters
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        strategy_type: StrategyType,
        risk_level: u8,
        rebalance_frequency: i64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        vault.authority = ctx.accounts.authority.key();
        vault.strategy_type = strategy_type;
        vault.risk_level = risk_level;
        vault.rebalance_frequency = rebalance_frequency;
        vault.total_deposits = 0;
        vault.total_shares = 0;
        vault.last_rebalance = Clock::get()?.unix_timestamp;
        vault.reserved_slots = Vec::new();
        vault.bump = ctx.bumps.vault;
        
        msg!("Temporal Vault initialized with strategy: {:?}", strategy_type);
        Ok(())
    }

    /// Deposit funds into the vault
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        // Calculate shares to mint
        let shares_to_mint = if vault.total_shares == 0 {
            amount
        } else {
            (amount as u128)
                .checked_mul(vault.total_shares as u128)
                .unwrap()
                .checked_div(vault.total_deposits as u128)
                .unwrap() as u64
        };

        // Transfer tokens to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update vault state
        vault.total_deposits = vault.total_deposits.checked_add(amount).unwrap();
        vault.total_shares = vault.total_shares.checked_add(shares_to_mint).unwrap();

        // Update user position
        let user_position = &mut ctx.accounts.user_position;
        user_position.shares = user_position.shares.checked_add(shares_to_mint).unwrap();
        user_position.deposited_amount = user_position.deposited_amount.checked_add(amount).unwrap();

        msg!("Deposited {} tokens, minted {} shares", amount, shares_to_mint);
        Ok(())
    }

    /// Withdraw funds from the vault
    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let user_position = &mut ctx.accounts.user_position;

        require!(user_position.shares >= shares, VaultError::InsufficientShares);

        // Calculate tokens to withdraw
        let tokens_to_withdraw = (shares as u128)
            .checked_mul(vault.total_deposits as u128)
            .unwrap()
            .checked_div(vault.total_shares as u128)
            .unwrap() as u64;

        // Transfer tokens from vault to user
        let seeds = &[
            b"vault",
            vault.authority.as_ref(),
            &[vault.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, tokens_to_withdraw)?;

        // Update vault state
        vault.total_deposits = vault.total_deposits.checked_sub(tokens_to_withdraw).unwrap();
        vault.total_shares = vault.total_shares.checked_sub(shares).unwrap();

        // Update user position
        user_position.shares = user_position.shares.checked_sub(shares).unwrap();

        msg!("Withdrew {} tokens by burning {} shares", tokens_to_withdraw, shares);
        Ok(())
    }

    /// Reserve a slot for guaranteed execution (integrates with Raiku)
    pub fn reserve_execution_slot(
        ctx: Context<ReserveSlot>,
        slot_time: i64,
        reservation_type: ReservationType,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;

        // Validate slot time is in the future
        require!(
            slot_time > clock.unix_timestamp,
            VaultError::InvalidSlotTime
        );

        // Create slot reservation
        let reservation = SlotReservation {
            slot_time,
            reservation_type,
            status: ReservationStatus::Pending,
            reserved_at: clock.unix_timestamp,
        };

        vault.reserved_slots.push(reservation);

        msg!(
            "Reserved {:?} slot for execution at timestamp: {}",
            reservation_type,
            slot_time
        );
        Ok(())
    }

    /// Execute vault strategy with guaranteed timing
    pub fn execute_strategy(ctx: Context<ExecuteStrategy>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;

        // Check if rebalancing is needed
        let time_since_last_rebalance = clock.unix_timestamp - vault.last_rebalance;
        require!(
            time_since_last_rebalance >= vault.rebalance_frequency,
            VaultError::RebalanceTooSoon
        );

        // Execute strategy based on type
        match vault.strategy_type {
            StrategyType::YieldOptimization => {
                msg!("Executing yield optimization strategy");
                // Strategy logic here (simulated for demo)
            }
            StrategyType::DeltaNeutral => {
                msg!("Executing delta-neutral strategy");
                // Strategy logic here (simulated for demo)
            }
            StrategyType::Arbitrage => {
                msg!("Executing arbitrage strategy");
                // Strategy logic here (simulated for demo)
            }
        }

        vault.last_rebalance = clock.unix_timestamp;
        msg!("Strategy executed successfully");
        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"position", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        seeds = [b"position", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ReserveSlot<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump,
        has_one = authority
    )]
    pub vault: Account<'info, Vault>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteStrategy<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
}

// Data Structures

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,
    pub strategy_type: StrategyType,
    pub risk_level: u8,
    pub rebalance_frequency: i64,
    pub total_deposits: u64,
    pub total_shares: u64,
    pub last_rebalance: i64,
    #[max_len(10)]
    pub reserved_slots: Vec<SlotReservation>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    pub shares: u64,
    pub deposited_amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum StrategyType {
    YieldOptimization,
    DeltaNeutral,
    Arbitrage,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum ReservationType {
    AOT, // Ahead of Time
    JIT, // Just in Time
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum ReservationStatus {
    Pending,
    Confirmed,
    Executed,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, InitSpace)]
pub struct SlotReservation {
    pub slot_time: i64,
    pub reservation_type: ReservationType,
    pub status: ReservationStatus,
    pub reserved_at: i64,
}

// Errors

#[error_code]
pub enum VaultError {
    #[msg("Insufficient shares for withdrawal")]
    InsufficientShares,
    #[msg("Invalid slot time - must be in the future")]
    InvalidSlotTime,
    #[msg("Rebalancing attempted too soon")]
    RebalanceTooSoon,
}

