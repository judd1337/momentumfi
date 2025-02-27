use anchor_lang::prelude::*;

use crate::state::GoalAccount;
use crate::errors::MomentumFiError;

#[derive(Accounts)]
pub struct DeleteGoal<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        close = user, // Refund rent to the user when closing the account
        has_one = user @ MomentumFiError::UnauthorizedDelete, // Ensure the user is the owner
        seeds = [b"goal_account", user.key().as_ref()],
        bump = goal_account.bump,
    )]
    pub goal_account: Account<'info, GoalAccount>,

    pub system_program: Program<'info, System>,

}

impl<'info> DeleteGoal<'info> {
    pub fn delete_goal() -> Result<()> {
        // The goal_account is automatically closed by the `close = user` constraint.
        msg!("Goal successfully deleted.");
        Ok(())
    }
}