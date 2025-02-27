use anchor_lang::prelude::*;

#[account]
pub struct GoalAccount {
    pub user: Pubkey,
    pub total_points: u64, // total points for this goal account
    pub creation_timestamp: i64, // 
    pub target_usd: u64,   // Target USD value to reach
    pub deadline: i64, // 
    pub completed: bool, // Whether the goal is completed
    pub first_completed_bonus: bool,
    pub last_daily_reward_timestamp: i64,
    pub bump: u8,
}

impl Space for GoalAccount {
    const INIT_SPACE: usize =  32 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 1;
}