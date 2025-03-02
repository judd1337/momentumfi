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
        // Check if there are any goal accounts provided
        if ctx.remaining_accounts.is_empty() {
            return Err(MomentumFiError::NoGoalsExist.into());
        }

        msg!("UserAccount before updating price: {:?}", ctx.accounts.user_account);

        // Get SOL price and update user account
        update_sol_price(&mut ctx.accounts.config, &ctx.accounts.price_update)?;
        update_user_account(&mut ctx.accounts.user_account, &ctx.accounts.user, &ctx.accounts.config)?;

        let user_account = &mut ctx.accounts.user_account;
        let mut new_reward_points = 0;

        msg!("UserAccount after updating price: {:?}", user_account);
        
        // Loop through remaining accounts and manually read/write GoalAccounts
        for account_info in ctx.remaining_accounts.iter() {            
            // Get a copy of the original data with discriminator
            let mut goal_account_data = account_info.data.borrow_mut();
            let discriminator = goal_account_data[0..8].to_vec();

            // Deserialize the account data (skipping the 8-byte anchor discriminator)
            let mut goal_account = GoalAccount::try_from_slice(&goal_account_data[8..])?;

            msg!("Deserialized GoalAccount: {:?}", goal_account);

            goal_account.completed = is_goal_completed(user_account.usd_balance, &mut goal_account);

            if goal_account.completed {
                if !goal_account.first_completed_bonus {
                    new_reward_points += ctx.accounts.config.first_completed_points; // Add points as one-time reward for each completed goal
                    goal_account.first_completed_bonus = true; // Mark that this goal has received bonus
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