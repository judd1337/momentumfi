import * as anchor from "@coral-xyz/anchor";
import * as borsh from "borsh";
import { Program } from "@coral-xyz/anchor";
import { Momentumfi } from "../target/types/momentumfi";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount, 
  mintTo, 
  getAccount, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount
 } from "@solana/spl-token";


describe("MomentumFi - Config Tests", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Momentumfi as Program<Momentumfi>;
  
  // Test accounts
  const admin = Keypair.generate();
  const nonAdmin = Keypair.generate();
  let testUser: Keypair;

  // Declaring PDAs, will be assigned later in the tests
  let configPDA: PublicKey;
  let rewardsMintPDA: PublicKey; 
  let userAccountPDA: PublicKey;
  let goalAccountPDA: PublicKey;
  
  beforeEach(async () => {
    // Generate new test accounts for each test
    testUser = Keypair.generate();

    // Airdrop SOL
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(nonAdmin.publicKey, 1 * LAMPORTS_PER_SOL),
    ]);
    
    // Confirm transactions
  const latestBlockhash = await provider.connection.getLatestBlockhash();
  await Promise.all(signatures.map(sig =>
    provider.connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    })
  ));

    // Find PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [rewardsMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPDA.toBuffer()],
      program.programId
    );
  });

  it("Test Initialize admin configuration", async () => {
    const firstCompletedPoints = 1000;
    const dailyPoints = 50;

    // Initialize the config account
    try {
      await program.methods
        .initialize(
          firstCompletedPoints,
          dailyPoints
        )
        .accounts({
          admin: admin.publicKey,
          configAccount: configPDA,
          rewardsMint: rewardsMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([admin])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    const configAccount = await program.account.config.fetch(configPDA);
    expect(configAccount.authority.toString()).to.equal(admin.publicKey.toString());

  });

  it("Test Initialize admin configuration with too big number", async () => {
    const firstCompletedPoints = 30_000;
    const dailyPoints = 50;

    // Initialize the config account
    try {
      await program.methods
        .initialize(
          firstCompletedPoints,
          dailyPoints
        )
        .accounts({
          admin: admin.publicKey,
          configAccount: configPDA,
          rewardsMint: rewardsMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      // Check that the error is an AnchorError
      expect(error).to.have.property("error");
      expect(error.error).to.have.property("errorCode");
      expect(error.error.errorCode.number).to.equal(6002); // 6002 is TooBigPointsValue

      // Check error message
      expect(error.message).to.include("Please set a points per goal value less than 10000");
    }
  });
});

describe("MomentumFi - Test register user", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Momentumfi as Program<Momentumfi>;
  
  // Test accounts
  const admin = Keypair.generate();
  let firstUser: Keypair;
  let secondUser: Keypair;
  let thirdUser: Keypair;

  // Declaring PDAs, will be assigned later in the tests
  let configPDA: PublicKey;
  let rewardsMintPDA: PublicKey; 
  let firstUserAccountPDA: PublicKey;
  let secondUserAccountPDA: PublicKey;
  let thirdUserAccountPDA: PublicKey;
  
  beforeEach(async () => {
    // Generate new test user for each test
    firstUser = Keypair.generate();
    secondUser = Keypair.generate();
    thirdUser = Keypair.generate();

    // Airdrop SOL
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(firstUser.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(secondUser.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(thirdUser.publicKey, 3 * LAMPORTS_PER_SOL),
    ]);
    
    // Confirm transactions
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await Promise.all(signatures.map(sig =>
      provider.connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })
    ));

    // Find PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [rewardsMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPDA.toBuffer()],
      program.programId
    );

    [firstUserAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), firstUser.publicKey.toBuffer()],
      program.programId
    );

    [secondUserAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), secondUser.publicKey.toBuffer()],
      program.programId
    );

    [thirdUserAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), thirdUser.publicKey.toBuffer()],
      program.programId
    );
    
    const firstCompletedPoints = 1000;
    const dailyPoints = 50;
    
    // Initialize the config account
    try {
      await program.methods
        .initialize(
          firstCompletedPoints,
          dailyPoints
        )
        .accounts({
          admin: admin.publicKey,
          configAccount: configPDA,
          rewardsMint: rewardsMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([admin])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }
  });

  it("Test register user", async () => {
    // Registration user
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: firstUser.publicKey,
          userAccount: firstUserAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([firstUser])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    const balance = await provider.connection.getBalance(firstUser.publicKey);
    const registeredUser = await program.account.userAccount.fetch(firstUserAccountPDA);
    expect(registeredUser.owner.toString()).to.equal(firstUser.publicKey.toString()); // Always use .toString() for Pubkeys
    expect(registeredUser.totalPoints.eq(new anchor.BN(0))).to.be.true;  // Use .eq() for BN
    expect(registeredUser.claimableRewards.eq(new anchor.BN(0))).to.be.true;
    expect(registeredUser.solBalance.eq(new anchor.BN(balance))).to.be.true;
    expect(registeredUser.usdBalance.eq(new anchor.BN(0))).to.be.true;
  });

  it("Test register same user twice invalid", async () => {
    // First registration (should succeed)
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: firstUser.publicKey,
          userAccount: firstUserAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([firstUser])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Second registration (should fail because PDA already exists)
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: firstUser.publicKey,
          userAccount: firstUserAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([firstUser])
        .rpc();

      expect.fail("Expected transaction to fail due to duplicate user account, but it succeeded.");
    } catch (error) {  
      // Check if error is a `SendTransactionError`
      expect(error).to.have.property("message");
  
      // Check error message includes "already in use"
      expect(error.message).to.include("already in use");
    }
  });

  it("Test register multiple different user accounts", async () => {
    // First registration 
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: firstUser.publicKey,
          userAccount: firstUserAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([firstUser])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Second registration 
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: secondUser.publicKey,
          userAccount: secondUserAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([secondUser])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Third registration 
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: thirdUser.publicKey,
          userAccount: thirdUserAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([thirdUser])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Fetch registered user accounts
    const firstUserAccount = await program.account.userAccount.fetch(firstUserAccountPDA);
    const secondUserAccount = await program.account.userAccount.fetch(secondUserAccountPDA);
    const thirdUserAccount = await program.account.userAccount.fetch(thirdUserAccountPDA);

    // Assert that each account exists and is owned by the correct user
    expect(firstUserAccount.owner.toString()).to.equal(firstUser.publicKey.toString());
    expect(secondUserAccount.owner.toString()).to.equal(secondUser.publicKey.toString());
    expect(thirdUserAccount.owner.toString()).to.equal(thirdUser.publicKey.toString());

    // Assert that each account has the expected initial values
    expect(firstUserAccount.totalPoints.eq(new anchor.BN(0))).to.be.true;
    expect(firstUserAccount.claimableRewards.eq(new anchor.BN(0))).to.be.true;
    expect(secondUserAccount.totalPoints.eq(new anchor.BN(0))).to.be.true;
    expect(secondUserAccount.claimableRewards.eq(new anchor.BN(0))).to.be.true;
    expect(thirdUserAccount.totalPoints.eq(new anchor.BN(0))).to.be.true;
    expect(thirdUserAccount.claimableRewards.eq(new anchor.BN(0))).to.be.true;

    // Check SOL balance in user accounts
    const firstUserBalance = await provider.connection.getBalance(firstUser.publicKey);
    const secondUserBalance = await provider.connection.getBalance(secondUser.publicKey);
    const thirdUserBalance = await provider.connection.getBalance(thirdUser.publicKey);

    expect(firstUserAccount.solBalance.eq(new anchor.BN(firstUserBalance))).to.be.true;
    expect(secondUserAccount.solBalance.eq(new anchor.BN(secondUserBalance))).to.be.true;
    expect(thirdUserAccount.solBalance.eq(new anchor.BN(thirdUserBalance))).to.be.true;
  });

});



describe("MomentumFi - Test Create Goal", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Momentumfi as Program<Momentumfi>;
  
  // Test accounts
  const admin = Keypair.generate();
  let testUser: Keypair;

  // Declaring PDAs, will be assigned later in the tests
  let configPDA: PublicKey;
  let rewardsMintPDA: PublicKey; 
  let userAccountPDA: PublicKey;
  let goalPDA: PublicKey;
  
  beforeEach(async () => {
    // Generate new test user for each test
    testUser = Keypair.generate();

    // Airdrop SOL
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(testUser.publicKey, 1 * LAMPORTS_PER_SOL),
    ]);
    
    // Confirm transactions
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await Promise.all(signatures.map(sig =>
      provider.connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })
    ));

    // Find PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [rewardsMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPDA.toBuffer()],
      program.programId
    );
    
    // Derive UserAccount PDA
    [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), testUser.publicKey.toBuffer()],
      program.programId
    );

    const firstCompletedPoints = 1000;
    const dailyPoints = 50;
    
    // Initialize the config account
    try {
      await program.methods
        .initialize(
          firstCompletedPoints,
          dailyPoints
        )
        .accounts({
          admin: admin.publicKey,
          configAccount: configPDA,
          rewardsMint: rewardsMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([admin])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Register the user account first
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("User registration failed:", error);
      throw error;
    }
  });

  it("Test successfully create a goal", async () => {
    const targetUsd = new anchor.BN(500);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30); // 30 days from now
    const goalNumber = new anchor.BN(0);
    
    [goalPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal_account"),
        userAccountPDA.toBuffer(),
        goalNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    // Create goal
    try {
      await program.methods
        .createGoal(goalNumber, targetUsd, deadline)
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          goalAccount: goalPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("Goal creation failed:", error);
      throw error;
    }

    // Fetch and verify goal data
    const goal = await program.account.goalAccount.fetch(goalPDA);
    expect(goal.user.toString()).to.equal(testUser.publicKey.toString());
    expect(goal.targetUsd.eq(targetUsd)).to.be.true;
    expect(goal.completed).to.be.false;
    expect(goal.firstCompletedBonus).to.be.false;
    expect(goal.totalPoints.eq(new anchor.BN(0))).to.be.true;
    expect(goal.deadline.eq(deadline)).to.be.true;
    const currentUserAccount = await program.account.userAccount.fetch(userAccountPDA);
    expect(currentUserAccount.goalCount.eq(new anchor.BN(1))).to.be.true;
  });

  it("Test allow creating multiple goals for a single user", async () => {
    const targetUsd1 = 300;
    const targetUsd2 = 700;
    const deadline1 = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 15; // 15 days from now
    const deadline2 = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45; // 45 days from now
    let goalNumber = new anchor.BN(0);

    // Derive first goal PDA
    [goalPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal_account"),
        userAccountPDA.toBuffer(),
        goalNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    // Create first goal
    await program.methods
      .createGoal(goalNumber, new anchor.BN(targetUsd1), new anchor.BN(deadline1))
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    goalNumber = goalNumber.add(new anchor.BN(1));

    // Verify first goal
    const firstGoal = await program.account.goalAccount.fetch(goalPDA);
    expect(firstGoal.targetUsd.eq(new anchor.BN(targetUsd1))).to.be.true;
    expect(firstGoal.deadline.eq(new anchor.BN(deadline1))).to.be.true;

    // Derive second goal PDA
    [goalPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal_account"),
        userAccountPDA.toBuffer(),
        goalNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    // Create second goal
    await program.methods
      .createGoal(goalNumber, new anchor.BN(targetUsd2), new anchor.BN(deadline2))
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Verify second goal
    const secondGoal = await program.account.goalAccount.fetch(goalPDA);
    expect(secondGoal.targetUsd.eq(new anchor.BN(targetUsd2))).to.be.true;
    expect(secondGoal.deadline.eq(new anchor.BN(deadline2))).to.be.true;

    const currentUserAccount = await program.account.userAccount.fetch(userAccountPDA);
    expect(currentUserAccount.goalCount.eq(new anchor.BN(2))).to.be.true;
  });

  it("Test fail if trying to create a duplicate goal", async () => {
    const targetUsd = 500;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    let goalNumber = new anchor.BN(0);

    // Derive first goal PDA
    [goalPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal_account"),
        userAccountPDA.toBuffer(),
        goalNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    // First goal creation (should succeed)
    await program.methods
      .createGoal(goalNumber, new anchor.BN(targetUsd), new anchor.BN(deadline))
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Attempt to create the same goal again (should fail)
    try {
      await program.methods
        .createGoal(goalNumber, new anchor.BN(targetUsd), new anchor.BN(deadline))
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          goalAccount: goalPDA, // Same PDA as before
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();

      expect.fail("Expected transaction to fail due to duplicate goal, but it succeeded.");
    } catch (error) {
      // Check if the error matches the "Account Already Exists" system error
      expect(error.message).to.include("already in use");
    }
  });
});

describe("MomentumFi - Test Delete Goal", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Momentumfi as Program<Momentumfi>;

  // Test accounts
  const admin = Keypair.generate();
  let testUser: Keypair;
  let anotherUser: Keypair;

  // Declaring PDAs
  let configPDA: PublicKey;
  let rewardsMintPDA: PublicKey;
  let userAccountPDA: PublicKey;
  let goalPDA: PublicKey;

  beforeEach(async () => {
    // Generate new test users
    testUser = Keypair.generate();
    anotherUser = Keypair.generate();

    // Airdrop SOL
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(testUser.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(anotherUser.publicKey, 1 * LAMPORTS_PER_SOL),
    ]);

    // Confirm transactions
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await Promise.all(signatures.map(sig =>
      provider.connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })
    ));

    // Find PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [rewardsMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPDA.toBuffer()],
      program.programId
    );

    // Derive UserAccount PDA
    [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), testUser.publicKey.toBuffer()],
      program.programId
    );

    // Initialize the config account
    try {
      await program.methods
        .initialize(1000, 50)
        .accounts({
          admin: admin.publicKey,
          configAccount: configPDA,
          rewardsMint: rewardsMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([admin])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Register the user account first
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("User registration failed:", error);
      throw error;
    }
  });

  it("Test successfully delete a goal", async () => {
    const targetUsd = new anchor.BN(500);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);

    // Derive PDA for the goal
    [goalPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal_account"),
        userAccountPDA.toBuffer(),
        goalNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    // Create a goal
    try {
      await program.methods
        .createGoal(goalNumber, targetUsd, deadline)
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          goalAccount: goalPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("Goal creation failed:", error);
      throw error;
    }
    
    // Fetch initial SOL balance of user before deletion
    const initialBalance = await provider.connection.getBalance(testUser.publicKey);

    // Delete the goal
    try {
      await program.methods
        .deleteGoal()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          goalAccount: goalPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("Goal deletion failed:", error);
      throw error;
    }

    // Ensure goal account is deleted
    const goalAccountInfo = await provider.connection.getAccountInfo(goalPDA);
    expect(goalAccountInfo).to.be.null;

    // Fetch updated SOL balance (should increase due to rent refund)
    const finalBalance = await provider.connection.getBalance(testUser.publicKey);
    expect(finalBalance).to.be.greaterThan(initialBalance);
  });

  it("Test unauthorized goal deletion fails", async () => {
    const targetUsd = new anchor.BN(500);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);
    
    // Derive PDA for the goal
    [goalPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal_account"),
        userAccountPDA.toBuffer(),
        goalNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    // Create a goal
    try {
      await program.methods
        .createGoal(goalNumber, targetUsd, deadline)
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          goalAccount: goalPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("Goal creation failed:", error);
      throw error;
    }

    // Derive another user's userAccount PDA (which doesn't exist)
    const [anotherUserAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), anotherUser.publicKey.toBuffer()],
      program.programId
    );
    
    // Try deleting the goal
    try {
      await program.methods
        .deleteGoal()
        .accounts({
          user: anotherUser.publicKey, // Wrong user
          userAccount: anotherUserAccountPDA, // This PDA doesn't exist
          goalAccount: goalPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([anotherUser])
        .rpc();

      expect.fail("Expected unauthorized deletion to fail, but it succeeded.");
    } catch (error) {
      // Check for ConstraintSeeds error instead of UnauthorizedDelete
      expect(error.toString()).to.include("AccountNotInitialized");
      expect(error.toString()).to.include("user_account");
    }
  });

  it("Test deleting a non-existent goal fails", async () => {
    // Generate a fake goal PDA that doesn't exist
    const [fakeGoalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(999).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    try {
      await program.methods
        .deleteGoal()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          goalAccount: fakeGoalPDA, // Non-existent goal
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();

      expect.fail("Expected error when deleting a non-existent goal, but it succeeded.");
    } catch (error) {
      // Expect "AccountNotInitialized"
      expect(error.toString()).to.include("AccountNotInitialized");
      expect(error.toString()).to.include("goal_account");
    }
  });
  
});


describe("MomentumFi - Test Update Reward Points User", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Momentumfi as Program<Momentumfi>;

  // Test accounts
  const admin = Keypair.generate();
  let testUser: Keypair;

  // PDAs
  let configPDA: PublicKey;
  let rewardsMintPDA: PublicKey;
  let userAccountPDA: PublicKey;
  let goalPDA: PublicKey;
  let goal2PDA: PublicKey;
  let goal3PDA: PublicKey;

  // ** Cloned Pyth Price Feed Address (from anchor.toml) **
  const priceFeedPDA = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");

  beforeEach(async () => {
    // Generate new test user
    testUser = Keypair.generate();

    // Airdrop SOL
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(testUser.publicKey, 2 * LAMPORTS_PER_SOL),
    ]);

    // Confirm transactions
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await Promise.all(signatures.map(sig =>
      provider.connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })
    ));

    // Find PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [rewardsMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPDA.toBuffer()],
      program.programId
    );

    [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), testUser.publicKey.toBuffer()],
      program.programId
    );

    [goalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [goal2PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [goal3PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(2).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Initialize the config account
    try {
      await program.methods
        .initialize(1000, 50)
        .accounts({
          admin: admin.publicKey,
          configAccount: configPDA,
          rewardsMint: rewardsMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([admin])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Register the user account
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("User registration failed:", error);
      throw error;
    }
  });

  /** Test successful reward update when goal is met */
  it("Test successfully updates reward points when goal is completed", async () => {
    const targetUsd = new anchor.BN(50);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);

    // Create a goal
    await program.methods
      .createGoal(goalNumber, targetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Fetch user account before update
    const userAccountBefore = await program.account.userAccount.fetch(userAccountPDA);
    expect(userAccountBefore.claimableRewards.toNumber()).to.equal(0);

    // Call update_reward_points_user
    await program.methods
      .updateRewardPointsUser()
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        config: configPDA,
        priceUpdate: priceFeedPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: goalPDA, isWritable: true, isSigner: false }
      ])
      .signers([testUser])
      .rpc();

    // Fetch user account after update
    const userAccountAfter = await program.account.userAccount.fetch(userAccountPDA);

    // Check that claimable rewards increased
    expect(userAccountAfter.claimableRewards.toNumber()).to.be.greaterThan(0);

    // Fetch goal account after update
    const goalAccountAfter = await program.account.goalAccount.fetch(goalPDA);

    // Check that goal account was updated
    expect(goalAccountAfter.completed).to.be.true;
    expect(goalAccountAfter.firstCompletedBonus).to.be.true;
  });

  /** Test successful reward update when goal is met */
  it("Test updating multiple goals at the same time", async () => {
    const targetUsd = new anchor.BN(50);
    const unreachedTargetUsd = new anchor.BN(50000);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);
    let goal2Number = new anchor.BN(1);
    let goal3Number = new anchor.BN(2);

    // Create a goal
    await program.methods
      .createGoal(goalNumber, targetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();
    
    // Create second goal
    await program.methods
    .createGoal(goal2Number, targetUsd, deadline)
    .accounts({
      user: testUser.publicKey,
      userAccount: userAccountPDA,
      goalAccount: goal2PDA,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([testUser])
    .rpc();

    // Create third goal
    await program.methods
      .createGoal(goal3Number, unreachedTargetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goal3PDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Fetch user account before update
    const userAccountBefore = await program.account.userAccount.fetch(userAccountPDA);
    expect(userAccountBefore.claimableRewards.toNumber()).to.equal(0);

    // Call update_reward_points_user
    await program.methods
      .updateRewardPointsUser()
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        config: configPDA,
        priceUpdate: priceFeedPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: goalPDA, isWritable: true, isSigner: false },
        { pubkey: goal2PDA, isWritable: true, isSigner: false },
        { pubkey: goal3PDA, isWritable: true, isSigner: false }
      ])
      .signers([testUser])
      .rpc();

    // Fetch user account after update
    const userAccountAfter = await program.account.userAccount.fetch(userAccountPDA);

    // Check that claimable rewards increased
    expect(userAccountAfter.claimableRewards.toNumber()).to.be.greaterThan(0);

    // Fetch goal account after update
    const goalAccountAfter = await program.account.goalAccount.fetch(goalPDA);
    const goal2AccountAfter = await program.account.goalAccount.fetch(goal2PDA);
    const goal3AccountAfter = await program.account.goalAccount.fetch(goal3PDA);

    // Check that goal account was updated
    expect(goalAccountAfter.completed).to.be.true;
    expect(goalAccountAfter.firstCompletedBonus).to.be.true;
    expect(goal2AccountAfter.completed).to.be.true;
    expect(goal2AccountAfter.firstCompletedBonus).to.be.true;
    expect(goal3AccountAfter.completed).to.be.false;
    expect(goal3AccountAfter.firstCompletedBonus).to.be.false;
  });

  it("Test fails if user has no goals", async () => {
    try {
      await program.methods
        .updateRewardPointsUser()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          config: configPDA,
          priceUpdate: priceFeedPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
  
      expect.fail("Expected error due to missing goals, but the transaction succeeded.");
    } catch (error) {
      expect(error.message).to.include("User has no goals");
    }
  });

  it("Test fails if user's balance is too low to complete the goal", async () => {
    const targetUsd = new anchor.BN(5_000); // Too high for current balance
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);
    let goalNumber = new anchor.BN(0);
  
    // Create a goal with an unreachable target
    await program.methods
      .createGoal(goalNumber, targetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();
  
    try {
      await program.methods
        .updateRewardPointsUser()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          config: configPDA,
          priceUpdate: priceFeedPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .remainingAccounts([{ pubkey: goalPDA, isWritable: true, isSigner: false }])
        .signers([testUser])
        .rpc();
  
    } catch (error) {
      console.log("Caught expected error:", error.toString());
    }

    // Fetch user account after update
    const userAccountAfter = await program.account.userAccount.fetch(userAccountPDA);

    // Check that claimable rewards increased
    expect(userAccountAfter.claimableRewards.toNumber()).to.be.equal(0);

    // Fetch goal account after update
    const goalAccountAfter = await program.account.goalAccount.fetch(goalPDA);

    // Check that goal account was updated
    expect(goalAccountAfter.completed).to.be.false;
    expect(goalAccountAfter.firstCompletedBonus).to.be.false;
  });
});


describe("MomentumFi - Test Update Reward Points Admin", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Momentumfi as Program<Momentumfi>;

  // Test accounts
  const admin = Keypair.generate();
  let testUser: Keypair;

  // PDAs
  let configPDA: PublicKey;
  let rewardsMintPDA: PublicKey;
  let userAccountPDA: PublicKey;
  let goalPDA: PublicKey;
  let goal2PDA: PublicKey;
  let goal3PDA: PublicKey;

  // ** Cloned Pyth Price Feed Address (from anchor.toml) **
  const priceFeedPDA = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");

  beforeEach(async () => {
    // Generate new test user
    testUser = Keypair.generate();

    // Airdrop SOL
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(testUser.publicKey, 2 * LAMPORTS_PER_SOL),
    ]);

    // Confirm transactions
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await Promise.all(signatures.map(sig =>
      provider.connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })
    ));

    // Find PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [rewardsMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPDA.toBuffer()],
      program.programId
    );

    [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), testUser.publicKey.toBuffer()],
      program.programId
    );

    [goalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [goal2PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [goal3PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(2).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Initialize the config account
    try {
      await program.methods
        .initialize(1000, 50)
        .accounts({
          admin: admin.publicKey,
          configAccount: configPDA,
          rewardsMint: rewardsMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([admin])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Register the user account
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("User registration failed:", error);
      throw error;
    }
  });

  it("Test admin successfully updates reward points when goal is completed", async () => {
    const targetUsd = new anchor.BN(50);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);

    // Create a goal
    await program.methods
      .createGoal(goalNumber, targetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Fetch user account before update
    const userAccountBefore = await program.account.userAccount.fetch(userAccountPDA);
    expect(userAccountBefore.claimableRewards.toNumber()).to.equal(0);

    // Call update_reward_points_user
    await program.methods
      .updateRewardPointsAdmin()
      .accounts({
        admin: admin.publicKey,
        userAccount: userAccountPDA,
        userWallet: testUser.publicKey,
        config: configPDA,
        priceUpdate: priceFeedPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: goalPDA, isWritable: true, isSigner: false }
      ])
      .signers([admin])
      .rpc();

    // Fetch user account after update
    const userAccountAfter = await program.account.userAccount.fetch(userAccountPDA);

    // Check that claimable rewards increased
    expect(userAccountAfter.claimableRewards.toNumber()).to.be.greaterThan(0);

    // Fetch goal account after update
    const goalAccountAfter = await program.account.goalAccount.fetch(goalPDA);

    // Check that goal account was updated
    expect(goalAccountAfter.completed).to.be.true;
    expect(goalAccountAfter.firstCompletedBonus).to.be.true;
  });

  it("Test fails if non-admin attempts to update rewards", async () => {
    const targetUsd = new anchor.BN(50);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);

    // Create a goal
    await program.methods
      .createGoal(goalNumber, targetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Fetch user account before update
    const userAccountBefore = await program.account.userAccount.fetch(userAccountPDA);
    expect(userAccountBefore.claimableRewards.toNumber()).to.equal(0);

    // Call update_reward_points_user
    try {
      await program.methods
      .updateRewardPointsAdmin()
      .accounts({
        admin: testUser.publicKey,
        userAccount: userAccountPDA,
        userWallet: testUser.publicKey,
        config: configPDA,
        priceUpdate: priceFeedPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: goalPDA, isWritable: true, isSigner: false }
      ])
      .signers([testUser])
      .rpc();
      expect.fail("Expected unauthorized access error");    
    } catch (error) {
      expect(error.message).to.include("UnauthorizedAccess");
    }
  });
});



describe("MomentumFi - Test Claim Rewards", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Momentumfi as Program<Momentumfi>;

  // Test accounts
  const admin = Keypair.generate();
  let testUser: Keypair;

  // PDAs
  let configPDA: PublicKey;
  let rewardsMintPDA: PublicKey;
  let userAccountPDA: PublicKey;
  let goalPDA: PublicKey;
  let goal2PDA: PublicKey;
  let goal3PDA: PublicKey;
  let userRewardsAta: PublicKey;

  // ** Cloned Pyth Price Feed Address (from anchor.toml) **
  const priceFeedPDA = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");

  beforeEach(async () => {
    // Generate new test user
    testUser = Keypair.generate();

    // Airdrop SOL
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(testUser.publicKey, 2 * LAMPORTS_PER_SOL),
    ]);

    // Confirm transactions
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await Promise.all(signatures.map(sig =>
      provider.connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })
    ));

    // Find PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [rewardsMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPDA.toBuffer()],
      program.programId
    );

    [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), testUser.publicKey.toBuffer()],
      program.programId
    );

    [goalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [goal2PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [goal3PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer(), new anchor.BN(2).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Get or create user rewards ATA
    const ataAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      testUser,
      rewardsMintPDA,
      testUser.publicKey
    );
    userRewardsAta = ataAccount.address;

    // Initialize the config account
    try {
      await program.methods
        .initialize(1000, 50)
        .accounts({
          admin: admin.publicKey,
          configAccount: configPDA,
          rewardsMint: rewardsMintPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([admin])
        .rpc();
    } catch (error) {
      console.error("Initialize failed:", error);
      throw error;
    }

    // Register the user account
    try {
      await program.methods
        .registerUserAccount()
        .accounts({
          user: testUser.publicKey,
          userAccount: userAccountPDA,
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();
    } catch (error) {
      console.error("User registration failed:", error);
      throw error;
    }
  });

  it("Test user successfully claims rewards", async () => {
    const targetUsd = new anchor.BN(50);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);

    // Create a goal
    await program.methods
      .createGoal(goalNumber, targetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Call update_reward_points_user
    await program.methods
      .updateRewardPointsUser()
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        config: configPDA,
        priceUpdate: priceFeedPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: goalPDA, isWritable: true, isSigner: false }
      ])
      .signers([testUser])
      .rpc();

    // Check initial balance (should be zero)
    let ataAccount = await provider.connection.getTokenAccountBalance(userRewardsAta);
    expect(Number(ataAccount.value.amount)).to.equal(0);

    // Claim rewards
    await program.methods
      .claimRewards()
      .accounts({
        user: testUser.publicKey,
        userRewardsAta,
        userAccount: userAccountPDA,
        config: configPDA,
        rewardsMint: rewardsMintPDA,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Check updated balance (should now be 1000)
    ataAccount = await provider.connection.getTokenAccountBalance(userRewardsAta);
    expect(Number(ataAccount.value.amount)).to.equal(1000);

  });

  it("Test user successfully claims rewards multiple times", async () => {
    const targetUsd = new anchor.BN(50);
    const unreachedTargetUsd = new anchor.BN(50000);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);
    let goal2Number = new anchor.BN(1);
    let goal3Number = new anchor.BN(2);

    // Create a goal
    await program.methods
      .createGoal(goalNumber, targetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();
    
    // Create second goal
    await program.methods
    .createGoal(goal2Number, targetUsd, deadline)
    .accounts({
      user: testUser.publicKey,
      userAccount: userAccountPDA,
      goalAccount: goal2PDA,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([testUser])
    .rpc();

    // Create third goal
    await program.methods
      .createGoal(goal3Number, unreachedTargetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goal3PDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Call update_reward_points_user
    await program.methods
      .updateRewardPointsUser()
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        config: configPDA,
        priceUpdate: priceFeedPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: goalPDA, isWritable: true, isSigner: false }
      ])
      .signers([testUser])
      .rpc();

    // Claim rewards
    await program.methods
    .claimRewards()
    .accounts({
      user: testUser.publicKey,
      userRewardsAta,
      userAccount: userAccountPDA,
      config: configPDA,
      rewardsMint: rewardsMintPDA,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([testUser])
    .rpc();

    // Check updated balance (should now be 1000)
    let ataAccount = await provider.connection.getTokenAccountBalance(userRewardsAta);
    expect(Number(ataAccount.value.amount)).to.equal(1000);

    // Call update_reward_points_user
    await program.methods
      .updateRewardPointsUser()
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        config: configPDA,
        priceUpdate: priceFeedPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: goal2PDA, isWritable: true, isSigner: false },
        { pubkey: goal3PDA, isWritable: true, isSigner: false }
      ])
      .signers([testUser])
      .rpc();

    // Claim rewards
    await program.methods
    .claimRewards()
    .accounts({
      user: testUser.publicKey,
      userRewardsAta,
      userAccount: userAccountPDA,
      config: configPDA,
      rewardsMint: rewardsMintPDA,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([testUser])
    .rpc();

    // Check updated balance (should now be 1000)
    ataAccount = await provider.connection.getTokenAccountBalance(userRewardsAta);
    expect(Number(ataAccount.value.amount)).to.equal(2000);
  });

  it("Test fails to claim rewards if user has no claimable rewards", async () => {
    const unreachedTargetUsd = new anchor.BN(50000);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 1 day deadline
    let goalNumber = new anchor.BN(0);

    // Create a goal
    await program.methods
      .createGoal(goalNumber, unreachedTargetUsd, deadline)
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        goalAccount: goalPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testUser])
      .rpc();

    // Call update_reward_points_user
    await program.methods
      .updateRewardPointsUser()
      .accounts({
        user: testUser.publicKey,
        userAccount: userAccountPDA,
        config: configPDA,
        priceUpdate: priceFeedPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        { pubkey: goalPDA, isWritable: true, isSigner: false }
      ])
      .signers([testUser])
      .rpc();

    try {
      await program.methods
        .claimRewards()
        .accounts({
          user: testUser.publicKey,
          userRewardsAta,
          userAccount: userAccountPDA,
          config: configPDA,
          rewardsMint: rewardsMintPDA,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([testUser])
        .rpc();

      throw new Error("Claiming rewards should have failed");
    } catch (err) {
      expect(err.message).to.include("NoPointsToClaim");
    }
  });
});

