use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::{state::Config, errors::MomentumFiError};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        seeds = [b"config", admin.key().as_ref()],
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
        points_per_goal: u16,
        authority: Option<Pubkey>, // you can pass Some|Pubkey or None
        bumps: &InitializeBumps,
    ) -> Result<()> {
        require!(points_per_goal > 10000, MomentumFiError::TooBigPointsValue);

        self.config.set_inner(Config {
            authority,
            points_per_goal,
            config_bump: bumps.config,
            rewards_bump: bumps.rewards_mint,
        });

        Ok(())
    }
}