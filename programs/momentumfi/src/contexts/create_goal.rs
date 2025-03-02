use anchor_lang::prelude::*;

use crate::state::{GoalAccount, UserAccount};

#[derive(Accounts)]
#[instruction(goal_number: u64)]
pub struct CreateGoal<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init,
        payer = user,
        space = GoalAccount::INIT_SPACE,
        seeds = [b"goal_account", user_account.key().as_ref(), &goal_number.to_le_bytes()],
        bump,
    )]
    pub goal_account: Account<'info, GoalAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreateGoal<'info> {
    pub fn create_goal(ctx: Context<CreateGoal>, goal_number: u64, target_usd: u64, deadline: i64) -> Result<()> {
        let clock = Clock::get()?;
        let bumps = &ctx.bumps;
        ctx.accounts.goal_account.set_inner(GoalAccount { 
            user: ctx.accounts.user.key(), 
            total_points: 0, // ✅ Explicit
            creation_timestamp: clock.unix_timestamp.to_le(), // ✅ Explicit
            target_usd: target_usd.to_le(),
            deadline: deadline.to_le(),
            last_daily_reward_timestamp: 0, // ✅ Explicit
            goal_number: goal_number.to_le(),
            completed: false, // ✅ Explicit
            first_completed_bonus: false, // ✅ Explicit
            bump: bumps.goal_account,
            _padding: [0; 5], // ✅ Explicit // Set padding to an array of 5 zero bytes
        });

        msg!("📌 Storing GoalAccount with creation_timestamp: {}", clock.unix_timestamp);
        msg!("GoalAccount after creation: {:?}", ctx.accounts.goal_account);

        // Increment goal count for the user
        ctx.accounts.user_account.goal_count += 1;

        Ok(())
    }
}