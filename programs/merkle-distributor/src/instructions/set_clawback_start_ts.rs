use anchor_lang::{context::Context, prelude::*, Accounts, Key, Result};

use crate::{error::ErrorCode, state::merkle_distributor::MerkleDistributor, SECONDS_PER_DAY};

/// Accounts for [merkle_distributor::set_clawback_start_ts].
#[derive(Accounts)]
pub struct SetClawbackStartTs<'info> {
    /// [MerkleDistributor].
    #[account(
        mut,
        has_one = admin,
    )]
    pub distributor: Account<'info, MerkleDistributor>,

    /// Payer to create the distributor.
    #[account(mut)]
    pub admin: Signer<'info>,
}

/// set clawback start ts
#[allow(clippy::result_large_err)]
pub fn handle_set_clawback_start_ts(
    ctx: Context<SetClawbackStartTs>,
    clawback_start_ts: i64,
) -> Result<()> {
    let distributor = &mut ctx.accounts.distributor;

    let curr_ts = Clock::get()?.unix_timestamp;

    // clawback_start_ts must be set in the future
    require!(
        clawback_start_ts > curr_ts,
        ErrorCode::TimestampsNotInFuture
    );

    // clawback_start_ts is at least one day after end_vesting_ts
    require!(
        clawback_start_ts
            >= distributor
                .end_ts
                .checked_add(SECONDS_PER_DAY)
                .ok_or(ErrorCode::ArithmeticError)?,
        ErrorCode::InsufficientClawbackDelay
    );

    msg!("Setting clawback_start_ts");
    msg!("curr={:?}", distributor.clawback_start_ts);
    msg!("new={:?}", clawback_start_ts);

    distributor.clawback_start_ts = clawback_start_ts;

    Ok(())
}
