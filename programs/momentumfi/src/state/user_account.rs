use anchor_lang::prelude::*;

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub total_points: u64, // total points for this user account
    pub claimable_rewards: u64, // reward tokens available to claim
    pub sol_balance: u64, // Amount of SOL (in lamports) in the related user account wallet
    pub usd_balance: u64,  // Cached USD value of user's SOL balance
    pub bump: u8,
}

impl Space for UserAccount {
    const INIT_SPACE: usize =  32 + 8 + 8 + 8 + 8 + 1;
}