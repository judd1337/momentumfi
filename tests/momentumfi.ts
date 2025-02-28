import * as anchor from "@coral-xyz/anchor";
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
  getMint
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

    [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), testUser.publicKey.toBuffer()],
      program.programId
    );

    [goalAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("goal_account"), userAccountPDA.toBuffer()],
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

  it("Test Initialize admin configuration too big number", async () => {

    /*
    const firstCompletedPoints = 100_000_000;
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
          config: configPDA,
          rewardsMint: rewardsMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("Config was already created")) {
        throw error;
      }
    }

    const configAccount = await program.account.config.fetch(configPDA);
    expect(configAccount.authority.toString()).to.equal(admin.publicKey.toString());
    */
  });
  


});
