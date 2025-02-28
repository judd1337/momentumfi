use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::errors::MomentumFiError;
use crate::state::Config;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        seeds = [b"config"],
        bump,
        space = Config::INIT_SPACE,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = admin,
        seeds = [b"rewards", config.key().as_ref()],
        mint::decimals = 6,
        mint::authority = config,
        bump,
    )]
    pub rewards_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> Initialize<'info> {
    pub fn init(
        &mut self,
        first_completed_points: u16,
        daily_points: u16,
        bumps: &InitializeBumps,
    ) -> Result<()> {
        require!(first_completed_points > 0 && first_completed_points < 10000, MomentumFiError::TooBigPointsValue);

        self.config.set_inner(Config {
            authority: self.admin.key(),
            first_completed_points,
            daily_points,
            sol_price: 0,
            price_last_updated: 0,
            config_bump: bumps.config,
            rewards_bump: bumps.rewards_mint,
        });

        Ok(())
    }
}