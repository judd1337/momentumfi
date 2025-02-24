use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub authority: Option<Pubkey>, // If we want an authority to lock the config account
    pub points_per_goal: u16, // points a user gets when they complete a goal
    pub rewards_bump: u8, // Bump seed for the rewards mint account
    pub config_bump: u8, // Bump seed for the config accounts
}

impl Space for Config {
    const INIT_SPACE: usize =  8 + 2 + 1 + 1;
}