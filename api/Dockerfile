FROM lukemathwalker/cargo-chef:latest-rust-1.73.0-slim-bullseye AS chef

RUN apt-get update \
    && apt-get -y install \
    clang \
    cmake \
    libudev-dev \
    make \
    unzip \
    libssl-dev \
    pkg-config \
    libpq-dev \
    curl \
    awscli

WORKDIR distributor

FROM chef AS prepare

ENV RUST_BACKTRACE=full
ENV RUST_LOG=info

COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS build

COPY --from=prepare /distributor/recipe.json recipe.json

# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --bin kamino-airdrop-api --recipe-path recipe.json
RUN cargo chef cook --release --bin cli --recipe-path recipe.json

# Build application
COPY . .
RUN cargo build --release --bin kamino-airdrop-api --bin cli --locked

ENV AWS_DEFAULT_REGION="eu-west-1"

# Download the merkle tree json files and convert them to blobs in one step to reduce cache layer size
RUN --mount=type=secret,id=aws_access_key_id \
    --mount=type=secret,id=aws_secret_access_key \
    AWS_ACCESS_KEY_ID=$(cat /run/secrets/aws_access_key_id) \
    AWS_SECRET_ACCESS_KEY=$(cat /run/secrets/aws_secret_access_key) \
    aws s3 sync s3://k8s.hubbleprotocol.io-kamino-distributor/KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS_season2 ./kmno_trees --exclude ".DS_Store" --include "*.json" --debug \
    && ./target/release/cli create-merkle-tree-blob --json-path ./kmno_trees --merkle-tree-path ./kmno_tree_blobs \
    && rm -rf ./kmno_trees

FROM debian:bullseye-slim AS runtime

RUN apt-get update && apt-get install -y libssl1.1 libpq-dev ca-certificates && update-ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build /distributor/target/release/kamino-airdrop-api ./

COPY --from=build /distributor/kmno_tree_blobs ./distributor/kmno_trees/

ENV MERKLE_TREE_PATH=./distributor/kmno_trees/
ENV RUST_BACKTRACE=full
ENV RUST_LOG=info
ENV PROGRAM_ID=KdisqEcXbXKaTrBFqeDLhMmBvymLTwj9GmhDcdJyGat 

ENTRYPOINT ["./kamino-airdrop-api"]

# use scratch to dump binary from
FROM scratch AS release-bin

COPY --from=runtime /kamino-airdrop-api .