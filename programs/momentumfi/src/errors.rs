use anchor_lang::error_code;

#[error_code]
pub enum MomentumFiError{
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Please check for underflow and overflow")]
    ArithmeticOverflow,
    #[msg("Please set a points per goal value less than 10000")]
    TooBigPointsValue,
    #[msg("There are no reward points to claim")]
    NoPointsToClaim,
    #[msg("No authority to delete this account")]
    UnauthorizedDelete,
    #[msg("Couldn't fetch the price")]
    InvalidPrice,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    #[msg("Returned an invalid timestamp")]
    InvalidTimestamp,
}