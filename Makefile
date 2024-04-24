.PHONY: build-docker-api

build-docker-api:
	DOCKER_BUILDKIT=1 docker build --target runtime . -f ./api/Dockerfile -t hubbleprotocol/kamino-airdrop-api:latest --secret id=aws_access_key_id,env=AWS_ACCESS_KEY_ID --secret id=aws_secret_access_key,env=AWS_SECRET_ACCESS_KEY
