# Release 0.2.0

## What's Changed


* Mainnet 
* [x] check your solana version `0.28.0`
* [x] check your anchor version `1.16.16`
* [x] build: `anchor build`
* [x] dump: `solana program dump -u m KdisqEcXbXKaTrBFqeDLhMmBvymLTwj9GmhDcdJyGat ./deps/kdis-mainnet-0.1.0.so`
* [x] copy the .so of the new release: `cp target/deploy/merkle_distributor.so deps/deployment-kdis-0.2.0-mainnet.so`
* [x] check your anchor version `1.18.14`
* [x] build for multisig: `solana program write-buffer target/deploy/merkle_distributor.so -u m -k <payer> --with-compute-unit-price 2000 --max-sign-attempts 1000`
* [x] Set buffer authority `solana program set-buffer-authority <BUFFER> --new-buffer-authority E35i5qn7872eEmBt15e5VGhziUBzCTm43XCSWvDoQNNv -u m -k <payer>`
* [x] Vote in Squads
* [ ] Update IDL `anchor idl upgrade --provider.wallet <scope_admin> --provider.cluster <rpc> --filepath target/idl/merkle_distributor.json KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD`


``