# INTENTIONALLY MISCONFIGURED — Checkov should catch these

# Bad bucket 1: no encryption, no versioning, public access not blocked
resource "aws_s3_bucket" "bad_bucket" {
bucket = "${var.project_name}-bad-bucket-demo"
tags = {
    Name        = "bad-bucket"
    Environment = "dev"
    Purpose     = "checkov-test"
}
}

# Good bucket: properly configured — Checkov should pass
resource "aws_s3_bucket" "good_bucket" {
bucket = "${var.project_name}-good-bucket-demo"
tags = {
    Name        = "good-bucket"
    Environment = "dev"
}
}

resource "aws_s3_bucket_versioning" "good_bucket" {
bucket = aws_s3_bucket.good_bucket.id
versioning_configuration {
    status = "Enabled"
}
}

resource "aws_s3_bucket_server_side_encryption_configuration" "good_bucket" {
bucket = aws_s3_bucket.good_bucket.id
rule {
    apply_server_side_encryption_by_default {
    sse_algorithm = "AES256"
    }
}
}

resource "aws_s3_bucket_public_access_block" "good_bucket" {
bucket                  = aws_s3_bucket.good_bucket.id
block_public_acls       = true
block_public_policy     = true
ignore_public_acls      = true
restrict_public_buckets = true
}
