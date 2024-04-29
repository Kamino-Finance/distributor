# Distributor SDK

Distributor SDK is a TypeScript client SDK used to interact with the distributor contract

## How to install the SDK

[![npm](https://img.shields.io/npm/v/@hubbleprotocol/distributor-sdk)](https://www.npmjs.com/package/@hubbleprotocol/distributor-sdk)

```shell
yarn add @hubbleprotocol/distributor-sdk
```

```shell
yarn update @hubbleprotocol/distributor-sdk
```

## How to use the SDK

```typescript
// Initialize the client and then you can use it to fetch data by calling it
const distributorClient = new Distributor(env.provider.connection);

// To check wether tokens are claimable 
// merkleDistributorPublicKey - should be taken from the api
const isClaimable = await distributorClient.isClaimable(merkleDistributorPublicKey);

// To check wether tokens have been already claimed or not for a specific user
// merkleDistributorPublicKey - should be taken from the api
// userAddress - the address that is claiming
const userClaimed = await distributorClient.userClaimed(merkleDistributorPublicKey, userAddress);

// To get a new claim ixn - this includes the ATA creation ixn if it's needed
// merkleDistributorPublicKey - should be taken from the api
// userAddress - the address that is claiming
// amountLamports - should be taken from the api (it has to match the value from the api - can't do partial claim)
// proof - should be taken from the api
const newClaimIxn = await distributorClient.getNewClaimIx(merkleDistributorPublicKey, userAddress, amountLamports, proof);
```