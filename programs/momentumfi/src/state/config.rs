use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub authority: Pubkey, // The authority that is allowed to edit the config account
    pub daily_points: u16, // points a user gets when they are above a goal every day
    pub first_completed_points: u16, // points a user gets when they complete a goal
    pub sol_price: u64,  // Stored price in USD with 6 decimals (1 SOL = 123.456 USD -> 123456000)
    pub price_last_updated: i64, // Timestamp of last update
    pub rewards_bump: u8, // Bump seed for the rewards mint account
    pub config_bump: u8, // Bump seed for the config accounts
}

impl Space for Config {
    const INIT_SPACE: usize =  8 + 2 + 1 + 1;
}