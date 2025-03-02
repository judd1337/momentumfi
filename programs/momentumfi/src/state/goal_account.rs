use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct GoalAccount {
    pub user: Pubkey,
    pub total_points: u64,  // total points for this goal account
    pub creation_timestamp: i64, // 
    pub target_usd: u64,    // Target USD value to reach
    pub deadline: i64,
    pub last_daily_reward_timestamp: i64,
    pub goal_number: u64,
    pub completed: bool,    // Whether the goal is completed
    pub first_completed_bonus: bool,
    pub bump: u8,
    pub _padding: [u8; 5],  // 5 bytes to ensure 8-byte alignment
}

impl Space for GoalAccount {
    const INIT_SPACE: usize = 8  // Anchor discriminator (needed here to make deserialization/serialization with borsh work)
        + 32   // user: Pubkey
        + 8    // total_points: u64
        + 8    // creation_timestamp: i64
        + 8    // target_usd: u64
        + 8    // deadline: i64
        + 8    // last_daily_reward_timestamp: i64
        + 8    // goal_number: u64
        + 1    // completed: bool
        + 1    // first_completed_bonus: bool
        + 1    // bump: u8
        + 5;   // _padding: [u8; 5]
}