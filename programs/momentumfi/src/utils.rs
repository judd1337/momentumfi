use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::state::{UserAccount, GoalAccount, Config};

// Constants
pub const MAXIMUM_AGE: u64 = 1800; // 30 Minutes
pub const FEED_ID: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

// Function to get the current SOL price and update the config
pub fn update_sol_price<'info>(
    config: &mut Account<'info, Config>,
    price_update: &Account<'info, PriceUpdateV2>,
) -> Result<()> {
    let feed_id: [u8; 32] = get_feed_id_from_hex(FEED_ID)?;
    //let price = price_update.get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &feed_id)?; 
    let price = price_update.get_price_unchecked(&feed_id)?;

    msg!("Updating SOL price: ({} ± {}) * 10^{}", price.price, price.conf, price.exponent);

    config.sol_price = price.price as u64;
    config.price_last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}

// Function to update the user's SOL and USD balance
pub fn update_user_account<'info>(
    user_account: &mut Account<'info, UserAccount>,
    user_wallet: &AccountInfo<'info>,
    config: &Account<'info, Config>,
) -> Result<()> {
    user_account.sol_balance = user_wallet.lamports();
    user_account.usd_balance = (user_account.sol_balance as u128 * config.sol_price as u128 / 1_000_000_000) as u64;

    Ok(())
}

// Checks if a goal is completed based on the user's USD balance.
// Returns `true` if the goal is completed, otherwise `false`.
pub fn is_goal_completed(user_usd_balance: u64, goal_account: &mut GoalAccount) -> bool {
    if user_usd_balance >= goal_account.target_usd {
        msg!("Goal completed! Target was: {} The USD balance is now: {}", goal_account.target_usd, user_usd_balance);
        true
    } else {
        false
    }
}
