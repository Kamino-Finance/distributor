use solana_sdk::{bs58, compute_budget::ComputeBudgetInstruction, message::Message};

use crate::*;

pub fn process_set_clawback_start_ts(
    args: &Args,
    set_clawback_start_ts_args: &SetClawbackStartTsArgs,
) {
    let keypair = read_keypair_file(&args.keypair_path.clone().unwrap())
        .expect("Failed reading keypair file");

    let client = RpcClient::new_with_commitment(&args.rpc_url, CommitmentConfig::confirmed());
    let program = args.get_program_client();

    let from_version = set_clawback_start_ts_args.from_version;
    let to_version = set_clawback_start_ts_args.to_version;
    for version in from_version..=to_version {
        let (distributor, _bump) =
            get_merkle_distributor_pda(&args.program_id, &args.base, &args.mint, version);

        loop {
            let distributor_state = program.account::<MerkleDistributor>(distributor).unwrap();
            if distributor_state.clawback_start_ts == set_clawback_start_ts_args.clawback_start_ts {
                println!("already set slot skip airdrop version {}", version);
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
                accounts: merkle_distributor::accounts::SetClawbackStartTs {
                    distributor,
                    admin: distributor_state.admin,
                }
                .to_account_metas(None),
                data: merkle_distributor::instruction::SetClawbackStartTs {
                    clawback_start_ts: set_clawback_start_ts_args.clawback_start_ts,
                }
                .data(),
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
                match client.send_and_confirm_transaction_with_spinner(&tx) {
                    Ok(signature) => {
                        println!(
                            "Successfully set clawback start ts {} airdrop version {} ! signature: {signature:#?}",
                            set_clawback_start_ts_args.clawback_start_ts, version
                        );
                        break;
                    }
                    Err(err) => {
                        println!("airdrop version {} {}", version, err);
                    }
                }
            }
        }
    }
}
