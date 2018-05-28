# docs-auth-lambda

[![Build Status](https://travis-ci.org/jSherz/docs-auth-lambda.svg?branch=master)](https://travis-ci.org/jSherz/docs-auth-lambda) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/4f4ca65c2f5a41d8b25cd0e4ca412102)](https://www.codacy.com/app/jSherz/docs-auth-lambda?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=jSherz/docs-auth-lambda&amp;utm_campaign=Badge_Grade) [![Coverage Status](https://coveralls.io/repos/github/jSherz/docs-auth-lambda/badge.svg?branch=master)](https://coveralls.io/github/jSherz/docs-auth-lambda?branch=master) [![Known Vulnerabilities](https://snyk.io/test/github/jsherz/docs-auth-lambda/badge.svg?targetFile=package.json)](https://snyk.io/test/github/jsherz/docs-auth-lambda?targetFile=package.json)

## What is this?

This is a Lambda function designed for use with Lambda@Edge to authenticate
requests via Google OAuth. Once logged in and checked against your domain,
users are issued with a JWT that's then used in future requests.

## What's the architecture?

* A `private` ACL S3 bucket.
* A Lambda function in the `node8.10` runtime.
* A CloudFront distribution with an origin access identity.
* S3 bucket policy to allow access from the above policy to the S3 bucket.

## How do I use it?

Blog post coming soon!
