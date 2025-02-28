use anchor_lang::prelude::*;

use crate::state::{GoalAccount, UserAccount};

#[derive(Accounts)]
pub struct CreateGoal<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init,
        payer = user,
        space = GoalAccount::INIT_SPACE + 8,
        seeds = [b"goal_account", user_account.key().as_ref()],
        bump,
    )]
    pub goal_account: Account<'info, GoalAccount>,

    pub system_program: Program<'info, System>,

}

impl<'info> CreateGoal<'info> {
    pub fn create_goal(ctx: Context<CreateGoal>, target_usd: u64, deadline: Option<i64>) -> Result<()> {
        let clock = Clock::get()?;
        let bumps = &ctx.bumps;
        ctx.accounts.goal_account.set_inner(GoalAccount { 
            user: ctx.accounts.user.key(), 
            total_points: 0,
            creation_timestamp: clock.unix_timestamp,
            deadline: deadline.unwrap_or(0),
            target_usd,
            completed: false,
            first_completed_bonus: false,
            last_daily_reward_timestamp: 0,
            bump: bumps.goal_account
        });

        Ok(())
    }
}