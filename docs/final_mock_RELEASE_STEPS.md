# Release steps

- [ ] Run: 
```sh
cargo build
cd sdk
yarn
cd ..
```

- mint: 66CEH8e45SR9tjB1RmYdS7nUJWvjJdwGv4KAkkuxv7Wv
- amount distributed: 749997277
- base: CWkJGg7EphboQ3a5zcVP8wsJ74jiVR4BsyuTgqAsvPNP

#### Create the merkle tree proofs

- [x] Run:
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

- [x] create base-path `solana-keygen new -o ./keys/base.json`

- [x] start-vesting-ts = 1714737600
- [x] end-vesting-ts = 1714737609
- [x] base-path = ./keys/base.json
- [x] clawback-start-ts = 1714827609
- [x] clawback-receiver-owner = BxdLNhoRXVs45wTVAZBrYQUkxbex5zXFCaJtsuRpoqMj
- [x] enable-slot = 262927265

#### Deploy distributor

- [x] Run: 
```
target/debug/cli --mint $token_mint --priority-fee $priority_fee --keypair-path $keypair_path --rpc-url $rpc --extra-send-rpc-url $extra_send_rpc_url new-distributor --start-vesting-ts $start_vesting_ts --end-vesting-ts $end_vesting_ts --merkle-tree-path $merkle_tree_path --base-path $base_path --clawback-start-ts $clawback_start_ts --enable-slot $enable_slot --clawback-receiver-owner $clawback_receiver_owner
```

#### Set the admin to multisig

- [x] Run:
```
target/debug/cli --mint $token_mint --priority-fee $priority_fee --keypair-path $keypair_path --rpc-url $rpc set-admin --new-admin &multisig_authority --merkle-tree-path $merkle_tree_path
```

#### Check all of the merkleDistributors match the expected values

amount:
44946283443089 +65813376267847 +44322329168417 +48504769349268 +38290986112075 +44681061853030 +51591938600774 +55860672918743 +46294290908070 +40637795769233 +36136136935859 +59010331045037 +42201253226585 +37274727900998 +43556288593717 +50875034077027 =

749_997_276.169769

16100 * 15 + 15927
15,927 final distr num

clawback_rec: 7ZFB6zTTrHqSgCo9K6nYPZJwU7JQeYX9ygTpm3ew85Ng
- mint: 66CEH8e45SR9tjB1RmYdS7nUJWvjJdwGv4KAkkuxv7Wv
- amount distributed: 749997277
- base: CWkJGg7EphboQ3a5zcVP8wsJ74jiVR4BsyuTgqAsvPNP
- [x] start-vesting-ts = 1714737600
- [x] end-vesting-ts = 1714737609
- [x] base-path = ./keys/base.json
- [x] clawback-start-ts = 1714827609
- [x] clawback-receiver-owner = BxdLNhoRXVs45wTVAZBrYQUkxbex5zXFCaJtsuRpoqMj
- [x] enable-slot = 262927265

262927265 - 262921575=  5690 * 0.5=    2845 / 60=47.416667

- [x] version
- [x] mint
- [x] base
- [x] max_total_claim
- [x] max_num_nodes
- [x] max_total_claim of all distributors matches expected distribution total
- [x] clawback_start_ts
- [x] clawback_receiver 
- [x] admin
- [x] enable_slot
- [x] closable - ensure false

- [x] Run:
Verify script to be used: 
```
target/debug/cli --mint $token_mint --base $base_key --rpc-url $rpc verify --merkle-tree-path $merkle_tree_path --clawback-start-ts $clawback_start_ts --enable-slot  $enable_slot --admin $admin --clawback-receiver-owner $clawback_receiver_owner --skip-verify-amount
```

Verify merkle tree airdrop version 0 DSgAbQLSuHhWvjiV9GR7LcJb78QsYLrxQ87tTKbzg3wm
Verify merkle tree airdrop version 1 52HMTcSh9Y3U3W27M4FNCLnwdwhkt8FwGaUQbSwc1LyS
Verify merkle tree airdrop version 10 CJiAoZ8K7HdQUsYZwij7Mvs542tiYGVM7nEav6KMC224
Verify merkle tree airdrop version 11 9fxeDt5UwsGAeb5uEepZNNeFCMJ7V7rXuC8bjNDuRwCh
Verify merkle tree airdrop version 12 CV2rgk6z2XYeYhAdA8G4gZeEHoEZtBNjsHHnWv9VQ89n
Verify merkle tree airdrop version 13 J6qmGLnirbvzbNkk5c2Fj9Td9vwdjaTwRdHYtgDup7ho
Verify merkle tree airdrop version 14 2VvZUC6d1RFUy46RRAAUUUcXqnWTwMe4aLupVMUqqUQQ
Verify merkle tree airdrop version 15 8nWG5kgdm85APo9H9HHeeNFj32HmLoGen9cfyMMpRtEs
Verify merkle tree airdrop version 2 Gh7qrVUTokur33Rvdsh9Wk3QHqzZ2M4GUaM52WeVUnGx
Verify merkle tree airdrop version 3 GE9vLJF2JNd8PVCS4nyqg1s6qhFDKnCM5B8XYem4YqKk
Verify merkle tree airdrop version 4 CB1Tuwnpk5GfezxVbuzeA1yqBxNikmyymDEMpbRmsV22
Verify merkle tree airdrop version 5 Hg4zRTB3x1rVdpYbGBkquoapwJACLWe22c1z6gTievSb
Verify merkle tree airdrop version 6 6pAz25JFuWsYAACAmhmyteUq3QUQJJcbyEgRvGDK8BU2
Verify merkle tree airdrop version 7 HJn1ZnMMz24gSwdBZzvZK8VZDiFeg942qnSKfJkt3UFt
Verify merkle tree airdrop version 8 A2RHFnKQwe4ML1ELPQz5Rkbw4Xs3Zgw37Pt4fjufbdeC
Verify merkle tree airdrop version 9 4gtwcLEDucFow87mBxJ5BpsW3hiRfP2Wc6GXUPgr9Kxn 

#### Create new s3 bucket to store the trees & update docker

Check `docs/create_s3_bucket.md` 

- [x] Run sync command from local to s3 bucket replacing the mint 

`aws s3 sync ./kmno_trees s3://k8s.hubbleprotocol.io-kamino-distributor/$mint`

- [x] Check in aws console that sync worked properly

- [x] Update docker API configuration to use newly created s3 bucket to sync from

- [x] Ensure the environemnt variables are updated for the helm chart in `api/helm/values.yaml`

- [x] Merge these changes to master to publish a new docker image to be used. Ensure pod is reset.

#### Check API returns matching values for each of the address, based on the .csv, and proofs based on /kmno_trees

- [ ] Run:
`npx ts-node sdk/src/cli.ts check-api-returns-all-keys --api-url $url --csv-path $csv_path --decimals-in-csv 6`

or if you want to check against merkle trees and their proofs as well, run this:

`npx ts-node sdk/src/cli.ts check-api-returns-all-keys --api-url $url --csv-path $csv_path --merkle-tree-path $merkle_tree_path --decimals-in-csv $mint_decimals`

#### Load test prod api

- [x] using `api/load_test.sh`

#### Fund distributor

- [x] Run:
```
target/debug/cli --mint $token_mint --priority-fee $priority_fee --base $base_key --keypair-path $keypair_path --rpc-url $rpc --extra-send-rpc-url $extra_send_rpc_url fund-all --merkle-tree-path $merkle_tree_path
```

- [x] Run check script:
Verify script can be used again (wihtout --skip_verify_amount flag this time)
```
target/debug/cli --mint $token_mint --base $base_key --rpc-url $rpc verify --merkle-tree-path $merkle_tree_path --clawback-start-ts $clawback_start_ts --enable-slot  $enable_slot --admin $admin --clawback-receiver-owner $clawback_receiver_owner
```

#### Create Farm & Add to kamino resources 


#### Give PROD API URL
