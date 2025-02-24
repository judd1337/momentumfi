use anchor_lang::prelude::*;

use crate::state::GoalAccount;

#[derive(Accounts)]
pub struct DeleteGoal<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        close = user,
        seeds = [b"goal_account", user.key().as_ref()],
        bump = goal_account.bump,
    )]
    pub goal_account: Account<'info, GoalAccount>,

    pub system_program: Program<'info, System>,

}

impl<'info> DeleteGoal<'info> {
    pub fn delete_goal(&mut self) -> Result<()> {
        
        // TODO: Should I remove points from user account?

        Ok(())
    }
}