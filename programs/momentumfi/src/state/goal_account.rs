use anchor_lang::prelude::*;

#[account]
pub struct GoalAccount {
    pub owner: Pubkey,
    pub total_points: u64, // total points for this goal account
    pub creation_timestamp: i64, // 
    pub deadline: i64, // 
    pub usd_goal: u64, // 
    pub completed: bool,
    pub first_completed_bonus: bool,
    pub bump: u8,
}

impl Space for GoalAccount {
    const INIT_SPACE: usize =  32 + 8 + 8 + 8 + 8 + 1;
}