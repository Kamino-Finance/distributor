FROM lukemathwalker/cargo-chef:latest-rust-slim-bullseye AS chef

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
    curl

WORKDIR distributor

FROM chef AS prepare

ENV RUST_BACKTRACE=full
ENV RUST_LOG=info

COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS build

RUN apt-get install -y awscli

RUN --mount=type=secret,id=aws_access_key_id \
    --mount=type=secret,id=aws_secret_access_key \
    AWS_ACCESS_KEY_ID=$(cat /run/secrets/aws_access_key_id) \
    AWS_SECRET_ACCESS_KEY=$(cat /run/secrets/aws_secret_access_key) \
    aws s3 sync s3://k8s.hubbleprotocol.io-kamino-distributor/Gg5Y6LvxzDMVxArK7mcGM2vB4fiwcvUnYnviLM2uqjVY ./kmno_trees --exclude ".DS_Store" --include "*.json"

COPY --from=prepare /distributor/recipe.json recipe.json

# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json

# Build application
COPY . .
RUN  cargo run --bin cli  create-merkle-tree-blob --json-path ./kmno_trees --merkle-tree-path ./kmno_tree_blobs
RUN cargo build --release --bin kamino-airdrop-api --locked

FROM debian:bullseye-slim AS runtime

RUN apt-get update && apt-get install -y libssl1.1 libpq-dev ca-certificates && update-ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build /distributor/target/release/kamino-airdrop-api ./

COPY --from=build /distributor/kmno_tree_blobs ./distributor/kmno_trees/

ENV MERKLE_TREE_PATH=./distributor/kmno_trees/

ENTRYPOINT ["./kamino-airdrop-api"]

# use scratch to dump binary from
FROM scratch AS release-bin

COPY --from=runtime /kamino-airdrop-api .