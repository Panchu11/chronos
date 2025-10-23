use anchor_lang::prelude::*;

declare_id!("5NyVeVkzxmB2XkrR5EnrEfxNVe82mPWdzSEYH5FBoMgF");

#[program]
pub mod chronos_orchestrator {
    use super::*;

    /// Initialize the orchestrator
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let orchestrator = &mut ctx.accounts.orchestrator;
        
        orchestrator.authority = ctx.accounts.authority.key();
        orchestrator.total_slots_reserved = 0;
        orchestrator.total_executions = 0;
        orchestrator.success_rate = 10000; // 100.00% in basis points
        orchestrator.bump = ctx.bumps.orchestrator;
        
        msg!("Orchestrator initialized");
        Ok(())
    }

    /// Reserve a slot through Raiku (simulated integration)
    pub fn reserve_raiku_slot(
        ctx: Context<ReserveRaikuSlot>,
        slot_time: i64,
        reservation_type: RaikuReservationType,
        priority: u8,
    ) -> Result<()> {
        let orchestrator = &mut ctx.accounts.orchestrator;
        let reservation = &mut ctx.accounts.reservation;
        let clock = Clock::get()?;

        require!(
            slot_time > clock.unix_timestamp,
            OrchestratorError::InvalidSlotTime
        );

        // In production, this would call Raiku's Ackermann Node
        // For demo, we simulate the reservation
        reservation.orchestrator = orchestrator.key();
        reservation.requester = ctx.accounts.requester.key();
        reservation.slot_time = slot_time;
        reservation.reservation_type = reservation_type;
        reservation.priority = priority;
        reservation.status = ReservationStatus::Pending;
        reservation.requested_at = clock.unix_timestamp;
        reservation.raiku_confirmation_id = generate_mock_confirmation_id(slot_time);
        reservation.bump = ctx.bumps.reservation;

        orchestrator.total_slots_reserved += 1;

        msg!(
            "Raiku slot reserved: {:?} at {} (confirmation: {})",
            reservation_type,
            slot_time,
            reservation.raiku_confirmation_id
        );
        Ok(())
    }

    /// Batch multiple transactions for atomic execution
    pub fn create_execution_batch(
        ctx: Context<CreateExecutionBatch>,
        batch_size: u8,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        let orchestrator = &ctx.accounts.orchestrator;
        let clock = Clock::get()?;

        require!(batch_size > 0 && batch_size <= 10, OrchestratorError::InvalidBatchSize);

        batch.orchestrator = orchestrator.key();
        batch.creator = ctx.accounts.creator.key();
        batch.batch_size = batch_size;
        batch.executed_count = 0;
        batch.status = BatchStatus::Pending;
        batch.created_at = clock.unix_timestamp;
        batch.bump = ctx.bumps.batch;

        msg!("Execution batch created with size: {}", batch_size);
        Ok(())
    }

    /// Execute a batch with guaranteed ordering
    pub fn execute_batch(ctx: Context<ExecuteBatch>) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        let orchestrator = &mut ctx.accounts.orchestrator;
        let clock = Clock::get()?;

        require!(
            batch.status == BatchStatus::Pending,
            OrchestratorError::BatchNotPending
        );

        // In production, this would:
        // 1. Verify slot reservation with Raiku
        // 2. Execute all transactions atomically
        // 3. Handle rollback if any transaction fails
        // 4. Update execution metrics

        batch.status = BatchStatus::Executed;
        batch.executed_at = Some(clock.unix_timestamp);
        batch.executed_count = batch.batch_size;

        orchestrator.total_executions += batch.batch_size as u64;

        msg!("Batch executed: {} transactions", batch.batch_size);
        Ok(())
    }

    /// Confirm slot reservation from Raiku (callback simulation)
    pub fn confirm_slot_reservation(
        ctx: Context<ConfirmSlotReservation>,
        confirmation_id: u64,
    ) -> Result<()> {
        let reservation = &mut ctx.accounts.reservation;

        require!(
            reservation.raiku_confirmation_id == confirmation_id,
            OrchestratorError::InvalidConfirmation
        );

        reservation.status = ReservationStatus::Confirmed;

        msg!("Slot reservation confirmed: {}", confirmation_id);
        Ok(())
    }

    /// Handle execution failure and rollback
    pub fn handle_execution_failure(
        ctx: Context<HandleExecutionFailure>,
        error_code: u16,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        let orchestrator = &mut ctx.accounts.orchestrator;

        batch.status = BatchStatus::Failed;
        batch.error_code = Some(error_code);

        // Update success rate
        let total_attempts = orchestrator.total_executions + 1;
        let failures = total_attempts - orchestrator.total_executions;
        orchestrator.success_rate = ((orchestrator.total_executions * 10000) / total_attempts) as u16;

        msg!("Execution failed with error code: {}", error_code);
        Ok(())
    }

    /// Get pre-confirmation status (simulates Raiku's sub-30ms pre-confirmations)
    pub fn get_preconfirmation(
        ctx: Context<GetPreconfirmation>,
    ) -> Result<()> {
        let reservation = &ctx.accounts.reservation;

        // In production, this would query Raiku's Ackermann Node
        // For demo, we simulate instant pre-confirmation
        let preconfirmed = reservation.status == ReservationStatus::Confirmed;

        msg!(
            "Pre-confirmation status: {} (slot: {})",
            if preconfirmed { "CONFIRMED" } else { "PENDING" },
            reservation.slot_time
        );
        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Orchestrator::INIT_SPACE,
        seeds = [b"orchestrator"],
        bump
    )]
    pub orchestrator: Account<'info, Orchestrator>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(slot_time: i64)]
pub struct ReserveRaikuSlot<'info> {
    #[account(
        mut,
        seeds = [b"orchestrator"],
        bump = orchestrator.bump
    )]
    pub orchestrator: Account<'info, Orchestrator>,
    
    #[account(
        init,
        payer = requester,
        space = 8 + SlotReservation::INIT_SPACE,
        seeds = [
            b"reservation",
            requester.key().as_ref(),
            &slot_time.to_le_bytes()
        ],
        bump
    )]
    pub reservation: Account<'info, SlotReservation>,
    
    #[account(mut)]
    pub requester: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateExecutionBatch<'info> {
    #[account(
        seeds = [b"orchestrator"],
        bump = orchestrator.bump
    )]
    pub orchestrator: Account<'info, Orchestrator>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + ExecutionBatch::INIT_SPACE,
        seeds = [b"batch", creator.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub batch: Account<'info, ExecutionBatch>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteBatch<'info> {
    #[account(
        mut,
        seeds = [b"orchestrator"],
        bump = orchestrator.bump
    )]
    pub orchestrator: Account<'info, Orchestrator>,
    
    #[account(mut)]
    pub batch: Account<'info, ExecutionBatch>,
}

#[derive(Accounts)]
pub struct ConfirmSlotReservation<'info> {
    #[account(mut)]
    pub reservation: Account<'info, SlotReservation>,
}

#[derive(Accounts)]
pub struct HandleExecutionFailure<'info> {
    #[account(
        mut,
        seeds = [b"orchestrator"],
        bump = orchestrator.bump
    )]
    pub orchestrator: Account<'info, Orchestrator>,
    
    #[account(mut)]
    pub batch: Account<'info, ExecutionBatch>,
}

#[derive(Accounts)]
pub struct GetPreconfirmation<'info> {
    pub reservation: Account<'info, SlotReservation>,
}

// Data Structures

#[account]
#[derive(InitSpace)]
pub struct Orchestrator {
    pub authority: Pubkey,
    pub total_slots_reserved: u64,
    pub total_executions: u64,
    pub success_rate: u16, // In basis points (10000 = 100%)
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SlotReservation {
    pub orchestrator: Pubkey,
    pub requester: Pubkey,
    pub slot_time: i64,
    pub reservation_type: RaikuReservationType,
    pub priority: u8,
    pub status: ReservationStatus,
    pub requested_at: i64,
    pub raiku_confirmation_id: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ExecutionBatch {
    pub orchestrator: Pubkey,
    pub creator: Pubkey,
    pub batch_size: u8,
    pub executed_count: u8,
    pub status: BatchStatus,
    pub created_at: i64,
    pub executed_at: Option<i64>,
    pub error_code: Option<u16>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum RaikuReservationType {
    AOT, // Ahead of Time (up to 60 seconds in advance)
    JIT, // Just in Time (immediate)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum ReservationStatus {
    Pending,
    Confirmed,
    Executed,
    Failed,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum BatchStatus {
    Pending,
    Executed,
    Failed,
    Cancelled,
}

// Helper Functions

fn generate_mock_confirmation_id(slot_time: i64) -> u64 {
    // In production, this would be returned by Raiku's Ackermann Node
    // For demo, we generate a deterministic ID based on slot_time
    (slot_time as u64).wrapping_mul(31337)
}

// Errors

#[error_code]
pub enum OrchestratorError {
    #[msg("Invalid slot time - must be in the future")]
    InvalidSlotTime,
    #[msg("Invalid batch size - must be between 1 and 10")]
    InvalidBatchSize,
    #[msg("Batch is not in pending status")]
    BatchNotPending,
    #[msg("Invalid confirmation ID")]
    InvalidConfirmation,
}

