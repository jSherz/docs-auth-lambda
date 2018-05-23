# docs-auth-lambda

## What is this?

This is a Lambda function designed for use with Lambda@Edge to authenticate
requests via Google OAuth. Once logged in and checked against your domain,
users are issued with a JWT that's then used in future requests.

## What's the architecture

* A `private` ACL S3 bucket.
* A Lambda function in the `node8.10` runtime.
* A CloudFront distribution with an origin access identity.
* S3 bucket policy to allow access from the above policy to the S3 bucket.

## How do I use it?

Read the code! (please)
