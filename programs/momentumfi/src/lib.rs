use anchor_lang::prelude::*;

declare_id!("9Z61ua1wnAiVaJHZLJuTeZoSfWn1X9Nb9d42bZjut7U8");

pub mod contexts;
pub mod state;
pub mod errors;
pub mod utils;

extern crate chrono;
use crate::contexts::*;
use crate::errors::*;

#[program]
pub mod momentumfi {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, first_completed_points: u16, daily_points: u16) -> Result<()> {
        ctx.accounts.init(first_completed_points, daily_points, &ctx.bumps)
    }

    pub fn register_user_account(ctx: Context<RegisterUserAccount>) -> Result<()> {
        ctx.accounts.register_user_account(&ctx.bumps)
    }

    pub fn create_goal(ctx: Context<CreateGoal>, target_usd: u64, deadline: Option<i64>) -> Result<()> {
        CreateGoal::create_goal(ctx, target_usd, deadline)
    }

    pub fn delete_goal(ctx: Context<DeleteGoal>) -> Result<()> {
        DeleteGoal::delete_goal()
    }

    pub fn update_reward_points_admin(ctx: Context<UpdateRewardPointsAdmin>) -> Result<()> {
        UpdateRewardPointsAdmin::update_reward_points_admin(ctx)
    }

    pub fn update_reward_points_user(ctx: Context<UpdateRewardPointsUser>) -> Result<()> {
        UpdateRewardPointsUser::update_reward_points_user(ctx)
    }

    pub fn update_sol_price(ctx: Context<UpdateSolPrice>) -> Result<()> {
        UpdateSolPrice::request_price_update(ctx)
    }
}
