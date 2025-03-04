use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::errors::MomentumFiError;
use crate::state::{UserAccount, Config};

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = rewards_mint,
        associated_token::authority = user
    )]
    pub user_rewards_ata: Account<'info, TokenAccount>, // User's ATA for the reward tokens
    
    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        seeds = [b"config"],
        bump = config.config_bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"rewards", config.key().as_ref()],
        bump,
    )]
    pub rewards_mint: Account<'info, Mint>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> ClaimRewards<'info> {
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {    
        // Extract claimable rewards first
        let rewards_points = ctx.accounts.user_account.claimable_rewards;
        require!(rewards_points > 0, MomentumFiError::NoPointsToClaim);
        
        // Mint reward tokens and propagate error if it fails
        Self::mint_reward_tokens(&ctx, rewards_points)?;

        // Reset rewards after claiming
        let user_account = &mut ctx.accounts.user_account;
        user_account.claimable_rewards = 0;

        Ok(())
    }

    fn mint_reward_tokens(ctx: &Context<ClaimRewards>, amount: u64) -> Result<()> {
        let cpi_program = ctx.accounts.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: ctx.accounts.rewards_mint.to_account_info(), 
            to: ctx.accounts.user_rewards_ata.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        };

        let seeds = &[
            &b"config"[..],
            &[ctx.accounts.config.config_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let cpi_context= CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        mint_to(cpi_context, amount)
    }
}