## Create S3 bucket for Kamino Distributor API docker build image

The Kamino Distributor API requires Merkle trees to load into memory. We store the Merkle trees as JSON files in an S3 bucket.

During the docker build process, the Kamino Distributor API github action will download the Merkle trees from the S3 bucket. It will then transform the JSON files into a binary format to be stored in the final docker image.

This guide will help you create an S3 bucket, and the necessary IAM user and policies, to allow the Kamino Distributor API github docker build action to access the bucket.

#### Create s3-policy.json
```shell
  cluster="k8s.xxx.xx"
cat > s3-policy.json <<EOL
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProdKaminoDistributorS3",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$(echo -n "$cluster")-kamino-distributor/*",
        "arn:aws:s3:::$(echo -n "$cluster")-kamino-distributor"
      ]
    }
  ]
}
EOL
```

#### Create S3 bucket
```shell
cluster="k8s.xxx.xx"
env="Prod"
bucket_name="$cluster-kamino-distributor"
aws s3api create-bucket \
--bucket "$bucket_name" \
--region "eu-west-1" \
--create-bucket-configuration LocationConstraint="eu-west-1"

aws s3api put-public-access-block \
--bucket "$bucket_name" \
--public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

aws s3api put-bucket-encryption --bucket "$bucket_name" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-bucket-versioning --bucket "$bucket_name" --versioning-configuration Status=Enabled

aws s3api put-bucket-tagging --bucket "$bucket_name" --tagging "TagSet=[{Key=KubernetesCluster,Value=$cluster},{Key=Environment,Value=$env}]"
```

#### Create bucket policy and github build user
```shell
  cluster="k8s.xxx.xx"
aws iam create-policy --policy-name "${cluster}-kamino-distributor-s3-policy" --policy-document file://s3-policy.json

aws iam create-user --user-name "${cluster}-kamino-distributor-github-build"
```

#### Attach user to policy
```shell
  cluster="k8s.xxx.xx"
  account_id="xxx"
aws iam attach-user-policy --user-name "${cluster}-kamino-distributor-github-build" --policy-arn "arn:aws:iam::${account_id}:policy/${cluster}-kamino-distributor-s3-policy"
```

#### Create access key

```shell
  cluster="k8s.xxx.xx"
aws iam create-access-key --user-name "${cluster}-kamino-distributor-github-build"
```

#### Add to github secrets

Add the access key and secret to the github repository secrets as `AWS_ACCESS_KEY_ID_DISTRIBUTOR_BUILD` and `AWS_SECRET_ACCESS_KEY_DISTRIBUTOR_BUILD` respectively.
