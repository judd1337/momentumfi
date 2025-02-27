use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::state::Config;
use crate::errors::MomentumFiError;
use crate::utils::update_sol_price;

#[derive(Accounts)]
pub struct UpdateSolPrice<'info> {
    #[account(mut)]
    pub admin: Signer<'info>, // Can be both user or admin

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
    )]
    pub config: Account<'info, Config>,

    pub price_update: Account<'info, PriceUpdateV2>,

    pub system_program: Program<'info, System>,
}

impl<'info> UpdateSolPrice<'info> {
    pub fn request_price_update(ctx: Context<UpdateSolPrice>) -> Result<()> {
        require!(ctx.accounts.config.authority == ctx.accounts.admin.key(), MomentumFiError::UnauthorizedAccess);
        
        update_sol_price(&mut ctx.accounts.config, &ctx.accounts.price_update)?;
        msg!("Updated SOL price: {}", ctx.accounts.config.sol_price);

        Ok(())
    }
}