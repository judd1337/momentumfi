use anchor_lang::prelude::*;

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub total_points: u64, // total points for this user account
    pub claimable_rewards: u64, // reward tokens available to claim
    pub sol_amount: u64, // total amount of SOL (in lamports) in the related user account wallet
    pub usd_value: u64, // total amount of SOL in the related user account wallet
    pub bump: u8,
}

impl Space for UserAccount {
    const INIT_SPACE: usize =  8 + 8 + 4 + 8 + 1;
}