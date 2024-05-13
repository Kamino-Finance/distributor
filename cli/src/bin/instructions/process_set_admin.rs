use solana_sdk::{bs58, compute_budget::ComputeBudgetInstruction, message::Message};

use crate::*;
pub fn process_set_admin(args: &Args, set_admin_args: &SetAdminArgs) {
    let keypair = read_keypair_file(&args.keypair_path.clone().unwrap())
        .expect("Failed reading keypair file");

    let client = RpcClient::new_with_commitment(&args.rpc_url, CommitmentConfig::confirmed());
    let send_client =
        RpcClient::new_with_commitment(&args.extra_send_rpc_url, CommitmentConfig::confirmed());
    let program = args.get_program_client();

    let mut paths: Vec<_> = fs::read_dir(&set_admin_args.merkle_tree_path)
        .unwrap()
        .map(|r| r.unwrap())
        .collect();
    paths.sort_by_key(|dir| dir.path());

    for file in paths {
        let single_tree_path = file.path();

        let merkle_tree =
            AirdropMerkleTree::new_from_file(&single_tree_path).expect("failed to read");

        let (distributor, _bump) = get_merkle_distributor_pda(
            &args.program_id,
            &args.base,
            &args.mint,
            merkle_tree.airdrop_version,
        );

        loop {
            let distributor_state = program.account::<MerkleDistributor>(distributor).unwrap();
            if distributor_state.admin == set_admin_args.new_admin {
                println!(
                    "already the same skip airdrop version {}",
                    merkle_tree.airdrop_version
                );
                break;
            }
            let mut ixs = vec![];
            // check priority fee
            if !args.bs58 {
                if let Some(priority_fee) = args.priority_fee {
                    ixs.push(ComputeBudgetInstruction::set_compute_unit_price(
                        priority_fee,
                    ));
                }
            }
            ixs.push(Instruction {
                program_id: args.program_id,
                accounts: merkle_distributor::accounts::SetAdmin {
                    distributor,
                    admin: distributor_state.admin,
                    new_admin: set_admin_args.new_admin,
                }
                .to_account_metas(None),
                data: merkle_distributor::instruction::SetAdmin {}.data(),
            });

            if args.bs58 {
                let msg = Message::new(&ixs, Some(&distributor_state.admin));
                println!("{}", bs58::encode(msg.serialize()).into_string());
                break;
            } else {
                let tx = Transaction::new_signed_with_payer(
                    &ixs,
                    Some(&keypair.pubkey()),
                    &[&keypair],
                    client.get_latest_blockhash().unwrap(),
                );
                match send_transaction::send_transaction(&tx, &client, &send_client) {
                    Ok(signature) => {
                        println!(
                            "Successfully set admin {} airdrop version {} ! signature: {signature:#?}",
                            set_admin_args.new_admin, merkle_tree.airdrop_version
                        );
                        break;
                    }
                    Err(err) => {
                        println!("airdrop version {} {}", merkle_tree.airdrop_version, err);
                    }
                }
            }
        }
    }
}
