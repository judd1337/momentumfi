use anchor_lang::prelude::*;

use crate::state::GoalAccount;

#[derive(Accounts)]
pub struct CreateGoal<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = GoalAccount::INIT_SPACE + 8,
        seeds = [b"goal_account", user.key().as_ref()],
        bump,
    )]
    pub goal_account: Account<'info, GoalAccount>,

    pub system_program: Program<'info, System>,

}

impl<'info> CreateGoal<'info> {
    pub fn create_goal(&mut self, usd_goal: u64, deadline: Option<i64>, bumps: &CreateGoalBumps) -> Result<()> {
        let clock = Clock::get()?;
        self.goal_account.set_inner(GoalAccount { 
            owner: self.user.key(), 
            total_points: 0,
            creation_timestamp: clock.unix_timestamp,
            deadline: deadline.unwrap_or(0),
            usd_goal,
            completed: false,
            first_completed_bonus: false,
            bump: bumps.goal_account 
        });

        Ok(())
    }
}