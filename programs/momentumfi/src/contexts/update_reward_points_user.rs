use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2};

use crate::errors::MomentumFiError;
use crate::state::{UserAccount, GoalAccount, Config};
use crate::utils::{update_sol_price, update_user_account, is_goal_completed};

#[derive(Accounts)]
pub struct UpdateRewardPointsUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        seeds = [b"config"],
        bump = config.config_bump,
    )]
    pub config: Account<'info, Config>,

    pub price_update: Account<'info, PriceUpdateV2>,

    pub system_program: Program<'info, System>,
}

impl<'info> UpdateRewardPointsUser<'info> {
    pub fn update_reward_points_user(ctx: Context<UpdateRewardPointsUser>) -> Result<()> {
        // Get SOL price and update user account
        update_sol_price(&mut ctx.accounts.config, &ctx.accounts.price_update)?;
        update_user_account(&mut ctx.accounts.user_account, &ctx.accounts.user, &ctx.accounts.config)?;

        let user_account = &mut ctx.accounts.user_account;
        let mut new_reward_points = 0;
        
        // Loop through remaining accounts and manually read/write GoalAccounts
        for account_info in ctx.remaining_accounts.iter() {
            // Manually deserialize the GoalAccount
            let mut goal_account = GoalAccount::try_from_slice(&account_info.data.borrow())?;

            goal_account.completed = is_goal_completed(user_account.usd_balance, &mut goal_account);

            if goal_account.completed {
                if !goal_account.first_completed_bonus {
                    new_reward_points += ctx.accounts.config.first_completed_points; // Add points as one-time reward for each completed goal
                    goal_account.first_completed_bonus = true; // Mark that this goal has received bonus
                }               
            }

            // Manually serialize back
            goal_account.serialize(&mut *account_info.try_borrow_mut_data()?)?;
        }

        // Update user rewards
        user_account.claimable_rewards += new_reward_points as u64;

        Ok(())
    }
}