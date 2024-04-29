# Release steps

- [ ] Run: 
```sh
cargo build
cd sdk
yarn
cd ..
```

#### Create the merkle tree proofs

- [ ] Run:
```
target/debug/cli create-merkle-tree --csv-path $csv_path --merkle-tree-path $merkle_tree_path --max-nodes-per-tree $max_nodes_per_tree --amount 0 --decimals $token_decimals
```
This creates the proofs needed in order to create the actual merkleDistributors, as well as provide the data 

#### Decide the config for the distributor

--start-vesting-ts (As we don't have vesting, this can be set to anytime before end-vesting-ts)

--end-vesting-ts (As we don't have vesting, this can be set to 1 day before clawback-start-ts, as this is a requirement at the SC level)

--base-path (Path to a keypair that should be saved and used only for creating this distribution - ensuring uniqueness)

--clawback-start-ts (The start time when tokens that haven't been claimed can be withdrawn, to the ata of the --clawback-receiver-owner)

--clawback-receiver-owner (The account address that will receive - in it's token ATA - the token that haven't been withdrawn when the clawback happens )

--enable-slot ( The slot in which claiming becomes available )

- [ ] start-vesting-ts = 
- [ ] end-vesting-ts = 
- [ ] base-path = 
- [ ] clawback-start-ts = 
- [ ] clawback-receiver-owner = 
- [ ] enable-slot = 

#### Deploy distributor

- [ ] Run: 
```
target/debug/cli --mint $token_mint --priority-fee $priority_fee --keypair-path $keypair_path --rpc-url $rpc new-distributor --start-vesting-ts $start_vesting_ts --end-vesting-ts $end_vesting_ts --merkle-tree-path $merkle_tree_path --base-path $base_path --clawback-start-ts $clawback_start_ts --enable-slot $enable_slot --clawback-receiver-owner $clawback_receiver_owner
```

#### Set the admin to multisig

- [ ] Run:
```
target/debug/cli --mint $token_mint --priority-fee $priority_fee --keypair-path $keypair_path --rpc-url $rpc set-admin --new-admin &multisig_authority --merkle-tree-path $merkle_tree_path
```

#### Check all of the merkleDistributors match the expected values

- [ ] version
- [ ] mint
- [ ] base
- [ ] max_total_claim
- [ ] max_num_nodes
- [ ] max_total_claim of all distributors matches expected distribution total
- [ ] clawback_start_ts
- [ ] clawback_receiver 
- [ ] admin
- [ ] enable_slot
- [ ] closable - ensure false

- [ ] Run:
Verify script to be used: 
```
target/debug/cli --mint $token_mint --base $base_key --rpc-url $rpc verify --merkle-tree-path $merkle_tree_path --clawback-start-ts $clawback_start_ts --enable-slot  $enable_slot --admin $admin --clawback-receiver-owner $clawback_receiver_owner --skip-verify-amount
```

#### Create new s3 bucket to store the trees & update docker

Check `docs/create_s3_bucket.md` 

- [ ] Update docker API configuration to use newly created s3 bucket to sync from

- [ ] Ensure the environemnt variables are updated for the helm chart in `api/helm/value.yaml`

- [ ] Merge these changes to master to publish a new docker image to be used. Ensure pod is reset.

#### Check API returns matching values for each of the address, based on the .csv, and proofs based on /kmno_trees

- [ ] Run:
`npx ts-node sdk/src/cli.ts check-api-returns-all-keys --api-url $url --csv-path $csv_path --decimals-in-csv 6`

or if you want to check against merkle trees and their proofs as well, run this:

`npx ts-node sdk/src/cli.ts check-api-returns-all-keys --api-url $url --csv-path $csv_path --merkle-tree-path $merkle_tree_path --decimals-in-csv $mint_decimals`

#### Load test prod api

- [ ] using `api/load_test.sh`

#### Fund distributor
```
target/debug/cli --mint $token_mint --priority-fee $priority_fee --base $base_key --keypair-path $keypair_path --rpc-url $rpc fund-all --merkle-tree-path $merkle_tree_path
```

Verify script can be used again (wihtout --skip_verify_amount flag this time)
```
target/debug/cli --mint $token_mint --base $base_key --rpc-url $rpc verify --merkle-tree-path $merkle_tree_path --clawback-start-ts $clawback_start_ts --enable-slot  $enable_slot --admin $admin --clawback-receiver-owner $clawback_receiver_owner
```

#### Create Farm & Add to kamino resources 


#### Give PROD API URL