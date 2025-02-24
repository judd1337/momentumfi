use anchor_lang::prelude::*;

declare_id!("9Z61ua1wnAiVaJHZLJuTeZoSfWn1X9Nb9d42bZjut7U8");

pub mod contexts;
pub mod state;
pub mod errors;

use crate::contexts::*;
use crate::errors::*;

#[program]
pub mod momentumfi {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, points_per_goal: u16, authority: Option<Pubkey>) -> Result<()> {
        ctx.accounts.init(points_per_goal, authority, &ctx.bumps)
    }

    pub fn register_user(ctx: Context<RegisterUser>) -> Result<()> {
        ctx.accounts.register_user(&ctx.bumps)
    }

    pub fn create_goal(ctx: Context<CreateGoal>, usd_goal: u64, deadline: Option<i64>) -> Result<()> {
        ctx.accounts.create_goal(usd_goal, deadline, &ctx.bumps)
    }

    pub fn delete_goal(ctx: Context<DeleteGoal>) -> Result<()> {
        ctx.accounts.delete_goal()
    }

    pub fn update_reward_points(ctx: Context<UpdateRewardPoints>) -> Result<()> {
        UpdateRewardPoints::update_reward_points(ctx)
    }
}
