use anchor_lang::prelude::*;

use crate::state::UserAccount;
use crate::state::GoalAccount;
use crate::state::Config;

#[derive(Accounts)]
pub struct UpdateRewardPoints<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_account", user_account.owner.as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        seeds = [b"config", admin.key().as_ref()],
        bump = config.config_bump,
    )]
    pub config: Account<'info, Config>,

    /*
    #[account(
        mut,
    )]
    pub goal_accounts: Account<'info, GoalAccount>,
    */

    pub system_program: Program<'info, System>,

}

impl<'info> UpdateRewardPoints<'info> {
    pub fn update_reward_points(ctx: Context<UpdateRewardPoints>) -> Result<()> {
        
        let user_account = &mut ctx.accounts.user_account;
        let mut total_rewards = 0;

        // Loop through remaining accounts and manually read/write GoalAccounts
        for account_info in ctx.remaining_accounts.iter() {
            // Manually deserialize the GoalAccount
            let mut goal_account = GoalAccount::try_from_slice(&account_info.data.borrow())?;

            if goal_account.completed && !goal_account.first_completed_bonus {
                total_rewards += ctx.accounts.config.points_per_goal; // Add points for each completed goal
                
                // Mark goal as processed
                goal_account.first_completed_bonus = true;

                // Manually serialize back
                goal_account.serialize(&mut *account_info.try_borrow_mut_data()?)?;
            }
        }

        // Update user rewards
        user_account.claimable_rewards += total_rewards as u64;

        Ok(())
    }
}