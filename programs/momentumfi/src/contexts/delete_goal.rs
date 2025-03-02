use anchor_lang::prelude::*;

use crate::errors::MomentumFiError;
use crate::state::{GoalAccount, UserAccount};

#[derive(Accounts)]
pub struct DeleteGoal<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        close = user, // Refund rent to the user when closing the account
        has_one = user @ MomentumFiError::UnauthorizedDelete, // Ensure the user is the owner
        seeds = [b"goal_account", user_account.key().as_ref(), &goal_account.goal_number.to_le_bytes()],
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