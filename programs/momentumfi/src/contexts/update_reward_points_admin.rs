use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use chrono::{NaiveDateTime, Timelike, Utc}; // Use `chrono` for time calculations

use crate::errors::MomentumFiError;
use crate::state::{UserAccount, GoalAccount, Config};
use crate::utils::{update_sol_price, update_user_account, is_goal_completed};

pub const TWENTY_FOUR_HOURS: u64 = 86_400;

#[derive(Accounts)]
pub struct UpdateRewardPointsAdmin<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_account", user_account.owner.as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    /// CHECK: This account must match the user_account.owner. Verified in the handler.
    pub user_wallet: AccountInfo<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.config_bump,
    )]
    pub config: Account<'info, Config>,

    pub price_update: Account<'info, PriceUpdateV2>,

    pub system_program: Program<'info, System>,
}

impl<'info> UpdateRewardPointsAdmin<'info> {
    pub fn update_reward_points_admin(ctx: Context<UpdateRewardPointsAdmin>) -> Result<()> {
        require!(ctx.accounts.config.authority == ctx.accounts.admin.key(), MomentumFiError::UnauthorizedAccess);
        require!(ctx.accounts.user_wallet.key() == ctx.accounts.user_account.owner, MomentumFiError::UnauthorizedAccess);

        // Get SOL price and update user account
        update_sol_price(&mut ctx.accounts.config, &ctx.accounts.price_update)?;
        update_user_account(&mut ctx.accounts.user_account, &ctx.accounts.user_wallet, &ctx.accounts.config)?;

        let user_account = &mut ctx.accounts.user_account;

        // Convert UNIX timestamp to UTC time
        let current_timestamp = Clock::get()?.unix_timestamp; // Get current timestamp
        let naive_datetime = NaiveDateTime::from_timestamp_opt(current_timestamp, 0).ok_or(MomentumFiError::InvalidTimestamp)?;
        let current_utc_time = naive_datetime.and_utc();
        let noon_utc = current_utc_time.date().and_hms_opt(12, 0, 0).ok_or(MomentumFiError::InvalidTimestamp)?; // 12:00 PM UTC

        let mut new_reward_points = 0;
        // Loop through remaining accounts and manually read/write GoalAccounts
        for account_info in ctx.remaining_accounts.iter() {
            // Get a copy of the original data with discriminator
            let mut goal_account_data = account_info.data.borrow_mut();
            let discriminator = goal_account_data[0..8].to_vec();

            // Deserialize the account data (skipping the 8-byte anchor discriminator)
            let mut goal_account = GoalAccount::try_from_slice(&goal_account_data[8..])?;
            
            goal_account.completed = is_goal_completed(user_account.usd_balance, &mut goal_account);
            
            if goal_account.completed {
                if !goal_account.first_completed_bonus {
                    new_reward_points += ctx.accounts.config.first_completed_points; // Add points as one-time reward for each completed goal
                    goal_account.first_completed_bonus = true; // Mark that this goal has received bonus
                } 
                // Add daily points only if at least 24 hours have passed AND it's past noon UTC
                else if current_timestamp - goal_account.last_daily_reward_timestamp >= 86_400 && current_utc_time >= noon_utc {
                    new_reward_points += ctx.accounts.config.daily_points;
                    goal_account.last_daily_reward_timestamp = current_timestamp; // Update last reward timestamp
                }              
            }

            // When serializing back, manually prepend the discriminator
            let serialized_data = goal_account.try_to_vec()?;

            // Manually serialize discriminator and data back to account
            goal_account_data[0..8].copy_from_slice(&discriminator);
            goal_account_data[8..8+serialized_data.len()].copy_from_slice(&serialized_data);
        }

        // Update user rewards
        user_account.claimable_rewards += new_reward_points as u64;

        Ok(())
    }
}