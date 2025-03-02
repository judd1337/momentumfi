use anchor_lang::prelude::*;

use crate::errors::MomentumFiError;
use crate::state::{UserAccount, Config};

#[derive(Accounts)]
pub struct RegisterUserAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = UserAccount::INIT_SPACE + 8,
        seeds = [b"user_account", user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        seeds = [b"config"],
        bump = config_account.config_bump,
    )]
    pub config_account: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

impl<'info> RegisterUserAccount<'info> {
    pub fn register_user_account(&mut self, bumps: &RegisterUserAccountBumps) -> Result<()> {
        let sol_balance = self.user.lamports();
        let usd_balance = (sol_balance as u128 * self.config_account.sol_price as u128 / 1_000_000_000) as u64;

        self.user_account.set_inner(UserAccount { 
            owner: self.user.key(),
            total_points: 0, 
            claimable_rewards: 0,
            sol_balance: sol_balance,
            usd_balance: usd_balance,
            goal_count: 0,
            bump: bumps.user_account 
        });

        Ok(())
    }
}