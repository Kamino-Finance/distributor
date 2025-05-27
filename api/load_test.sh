#!/bin/bash

set -e

export base_url="https://api.kamino.finance/distributor/user"

max_concurrency=10

ORIGINAL_DIR="$(pwd)"
SCRIPT_DIR="$( dirname "${BASH_SOURCE[0]}" )"
cd $SCRIPT_DIR/..

function cleanup() {
  cd $ORIGINAL_DIR
  set +e
}

trap cleanup EXIT

# Read the CSV file and skip the header line
tail -n +2 list/kmno_s3_allocations.csv | awk -F, '{print $1}' | \
xargs -n1 -S1024 -P$max_concurrency -I {} sh -c '{
    # Make a request and capture only the HTTP status code
    http_status=$(curl -s -o /dev/null -w "%{http_code}" "${base_url}/{}")
    if [ "$http_status" != "200" ]; then
        echo "Error for pubkey {}: HTTP Status: $http_status"
    fi
}'

echo "Load testing complete."
