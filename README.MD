# DevSecOps Pipeline Platform

> A production-grade DevSecOps CI/CD platform that automatically secures, scans, and deploys applications to AWS. Built to demonstrate security-first engineering practices required in **Fintech**, **Healthcare**, and **Telecom** industries.

**Built by:** Uwakwe Obed
**GitHub:** uwakweobed89-png/devsecops-pipeline
**Infrastructure:** uwakweobed89-png/CLOUD-OPS-project
**Stack:** GitHub Actions · Checkov · Trivy · npm audit · Docker · AWS ECR · AWS ECS · Terraform · Node.js

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [How This Connects to CloudOps Infrastructure](#2-how-this-connects-to-cloudops-infrastructure)
3. [Pipeline Architecture](#3-pipeline-architecture)
4. [Project Structure](#4-project-structure)
5. [Applications](#5-applications)
6. [Security Tools Explained](#6-security-tools-explained)
7. [Code Walkthrough](#7-code-walkthrough)
8. [How to Add a New App](#8-how-to-add-a-new-app)
9. [How to Run Locally](#9-how-to-run-locally)
10. [API Documentation](#10-api-documentation)
11. [Security Findings](#11-security-findings)
12. [Industry Use Cases](#12-industry-use-cases)
13. [Key Lessons Learned](#13-key-lessons-learned)

---

## 1. Project Overview

This project builds a **reusable DevSecOps pipeline platform** that:

- Automatically scans every application for security vulnerabilities before deployment
- Deploys to the AWS infrastructure built in the CloudOps Production Platform project
- Can onboard any new application in minutes by changing 5 environment variables
- Generates security reports as artifacts for compliance audits

### The problem it solves

```
Traditional deployment:
  Developer finishes code
  Manually builds Docker image
  Manually pushes to registry
  Manually updates server
  No security scanning
  No audit trail
  Takes 20-30 minutes
  Human errors possible

This platform:
  Developer types: git push
  Pipeline automatically:
    → scans infrastructure for misconfigs   (Checkov)
    → scans container for CVEs              (Trivy)
    → scans dependencies for vulnerabilities (npm audit)
    → builds and pushes image to ECR
    → deploys to ECS Fargate
    → generates security report
  Takes 4-5 minutes
  Zero human error
  Full audit trail
  Security enforced automatically
```

---

## 2. How This Connects to CloudOps Infrastructure

This project does NOT create new AWS infrastructure. It deploys TO the infrastructure already built in the [CloudOps Production Platform](https://github.com/uwakweobed89-png/CLOUD-OPS-project).

### The connection

```
┌─────────────────────────────────────┐
│         GitHub (This Project)        │
│                                      │
│  devsecops-pipeline repo             │
│  fintech-payment-api/                │
│  .github/workflows/                  │
│       fintech-deploy.yml             │
└──────────────┬───────────────────────┘
               │ git push triggers pipeline
               │ OIDC authenticates to AWS
               ↓
┌─────────────────────────────────────┐
│   AWS Account — CloudOps Project    │
│                                      │
│  ECR       → stores Docker images   │
│  ECS       → runs the containers    │
│  VPC       → network isolation      │
│  CloudWatch→ logs and monitoring    │
│  SNS       → alerts and notifications│
└─────────────────────────────────────┘
```

### The 5 environment variables that create the link

```yaml
# In every pipeline yaml file
env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: fintech-payment-api   # where image is stored
  ECS_CLUSTER: cloudops-cluster         # Project 1 cluster
  ECS_SERVICE: cloudops-api-service     # Project 1 service
  CONTAINER_NAME: cloudops-api          # Project 1 container
```

These 5 lines connect this pipeline to the CloudOps infrastructure.
Change them to point to any other cluster, service, or repository.

### What comes from CloudOps Project 1

| Resource | From CloudOps Phase | Used by this pipeline |
|---|---|---|
| GitHubActionsRole (OIDC) | Phase 3 | Authentication to AWS |
| ECR registry | Phase 2 | Stores Docker images |
| ECS cluster | Phase 2 | Runs containers |
| VPC + subnets | Phase 1 | Network for containers |
| CloudWatch | Phase 4 | Logs all container output |
| SNS alerts | Phase 4 | Notifies on issues |

---

## 3. Pipeline Architecture

```
git push to main
       ↓
GitHub Actions detects change
       ↓
┌──────────────────────────────────────────────┐
│              PARALLEL JOBS                    │
│                                              │
│  ┌──────────────┐    ┌────────────────────┐  │
│  │   Checkov    │    │    npm audit       │  │
│  │  IaC Scan    │    │  Dependency Scan   │  │
│  │              │    │                    │  │
│  │ Scans .tf    │    │ Scans package.json │  │
│  │ files for    │    │ for known CVEs     │  │
│  │ misconfigs   │    │ in npm packages    │  │
│  │ ~30 seconds  │    │ ~30 seconds        │  │
│  └──────────────┘    └────────────────────┘  │
└──────────────────────────────────────────────┘
       ↓  (both must complete)
┌──────────────────────────────────────────────┐
│           BUILD + TRIVY SCAN                  │
│                                              │
│  docker build --platform linux/amd64         │
│       ↓                                      │
│  trivy image scan (CVEs in OS + npm)         │
│       ↓                                      │
│  docker push to ECR (SHA + latest tags)      │
│  ~2-3 minutes                                │
└──────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────┐
│                  DEPLOY                       │
│                                              │
│  Download current ECS task definition        │
│  Update with new image SHA                   │
│  Deploy to ECS Fargate                       │
│  Wait for stability                          │
│  ~3-4 minutes                                │
└──────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────┐
│            SECURITY SUMMARY                   │
│                                              │
│  Print consolidated results from all jobs    │
│  Always runs even if a job failed            │
│  Results visible in GitHub Actions logs      │
└──────────────────────────────────────────────┘
```

---

## 4. Project Structure

```
devsecops-pipeline/
├── .github/
│   └── workflows/
│       ├── devsecops.yml          ← pipeline for app/ (demo)
│       └── fintech-deploy.yml     ← pipeline for fintech-payment-api/
│
├── app/                           ← original demo API
│   ├── src/index.js
│   ├── Dockerfile
│   ├── package.json
│   └── package-lock.json
│
├── fintech-payment-api/           ← Fintech Payment API
│   ├── src/index.js               ← payment + fraud detection logic
│   ├── Dockerfile
│   ├── package.json
│   └── package-lock.json
│
├── infrastructure/                ← Terraform (scanned by Checkov)
│   ├── main.tf                    ← provider configuration
│   └── s3.tf                      ← good + bad S3 buckets for testing
│
├── sonarqube/
│   └── sonar-project.properties   ← SonarQube config (future integration)
│
├── zap/
│   └── zap-rules.tsv              ← OWASP ZAP rule configuration
│
├── .gitignore                     ← excludes node_modules, .terraform, secrets
└── README.md
```

---

## 5. Applications

### App 1 — Demo API (`app/`)

A simple Node.js Express API used to demonstrate the pipeline works.

```
GET  /health          → health check
GET  /api/v1/data     → returns service info
GET  /api/v1/health-detailed → detailed health with memory and uptime
```

### App 2 — Fintech Payment API (`fintech-payment-api/`)

A payment processing API with fraud detection. Simulates real Fintech architecture.

```
GET  /health                → service health check
POST /api/v1/payments       → create a payment transaction
GET  /api/v1/payments       → list all transactions
GET  /api/v1/payments/:id   → get transaction by ID
POST /api/v1/fraud-check    → run fraud detection on a transaction
GET  /api/v1/summary        → transaction volume dashboard
```

**Fraud detection rules:**
```
Amount > $10,000          → flagged (HIGH VALUE)
Round number + amount > $1000 → flagged (SUSPICIOUS ROUND AMOUNT)
Sender === Receiver       → flagged (SELF TRANSFER)
Foreign currency + amount > $5,000 → flagged (HIGH VALUE FOREIGN)

Risk scoring:
  0-39  → LOW    → APPROVE
  40-69 → MEDIUM → REVIEW
  70+   → HIGH   → BLOCK
```

---

## 6. Security Tools Explained

### Checkov — Infrastructure as Code Scanner

```
What it scans: Terraform .tf files
When it runs:  Before any deployment (first job)
Why it matters: Catches misconfigs BEFORE they reach AWS

Example: unencrypted S3 bucket
  Without Checkov → deploys to AWS → data exposed
  With Checkov    → caught in 30 seconds → never deployed

Our test: infrastructure/s3.tf has a deliberately
misconfigured bad_bucket and a properly configured
good_bucket — Checkov fails bad_bucket and passes good_bucket
This PROVES the scanner is working
```

### Trivy — Container Vulnerability Scanner

```
What it scans: Docker images
When it runs:  After build, before push to ECR
Why it matters: Catches CVEs in OS packages and npm dependencies

Scans:
  Alpine OS packages   → kernel, openssl, etc
  Node.js packages     → express, lodash, etc
  Application code     → secrets accidentally included

Severity levels:
  CRITICAL → must fix before production
  HIGH     → should fix soon
  MEDIUM   → plan to fix
  LOW      → monitor
```

### npm audit — Dependency Vulnerability Scanner

```
What it scans: package.json and package-lock.json
When it runs:  Parallel with Checkov (no Docker needed)
Why it matters: npm packages are the most common attack vector

How it works:
  Reads all installed packages
  Checks npm security advisory database
  Reports known CVEs with severity and fix version

Example output:
  found 0 vulnerabilities ← what you want
  found 2 HIGH vulnerabilities in lodash ← needs fixing
```

---

## 7. Code Walkthrough

### `.github/workflows/fintech-deploy.yml`

```yaml
# Triggers ONLY when fintech-payment-api/ files change
# Pushing changes to app/ or infrastructure/ does NOT trigger this
# This prevents unnecessary pipeline runs
on:
  push:
    branches: [main]
    paths:
      - 'fintech-payment-api/**'
```

**Why path filtering matters:**
```
Without paths filter:
  Any git push triggers ALL pipelines
  Push a README change → full deploy runs
  Wastes time and AWS resources

With paths filter:
  Only relevant changes trigger the pipeline
  Push to fintech-payment-api/ → fintech pipeline runs
  Push to app/                 → demo pipeline runs
  Push to infrastructure/      → nothing deploys (Checkov only)
```

```yaml
# OIDC authentication — no AWS keys stored anywhere
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::326709068429:role/GitHubActionsRole
    aws-region: us-east-1
```

**Why OIDC instead of access keys:**
```
Access keys stored in GitHub Secrets:
  → Static credentials that never expire
  → If GitHub is compromised, attacker gets AWS access forever
  → Must be manually rotated
  → Violates PCI-DSS and HIPAA security requirements

OIDC (what we use):
  → GitHub proves identity with a short-lived JWT token
  → AWS issues temporary credentials (expire after pipeline run)
  → No static credentials anywhere
  → Industry standard for CI/CD security
```

### `fintech-payment-api/src/index.js`

```javascript
// Security fix 1: hide Express version from response headers
// Without this: every response includes "X-Powered-By: Express"
// Attackers use this to find and exploit Express vulnerabilities
app.disable('x-powered-by');
```

```javascript
// Fraud detection logic
// Risk score accumulates based on transaction characteristics
// Score determines recommendation: APPROVE, REVIEW, or BLOCK

function getRiskLevel(score) {
  if (score >= 70) return 'HIGH';    // BLOCK
  if (score >= 40) return 'MEDIUM';  // REVIEW
  return 'LOW';                       // APPROVE
}

// Each rule adds to the risk score:
// High value (>$10k)     → +40 points
// Round number           → +20 points
// Same sender/receiver   → +50 points
// Foreign currency       → +30 points
```

### `infrastructure/s3.tf` — Testing Checkov

```hcl
# bad_bucket: intentionally misconfigured
# Checkov FAILS this — proves scanner is working
resource "aws_s3_bucket" "bad_bucket" {
  bucket = "devsecops-bad-bucket-demo"
  # Missing: versioning, encryption, public access block
}

# good_bucket: properly configured
# Checkov PASSES this — shows what correct looks like
resource "aws_s3_bucket_server_side_encryption_configuration" "good" {
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

---

## 8. How to Add a New App

This platform is designed to onboard any application in minutes.

### Step 1 — Get the app code

```powershell
# Option A: clone from GitHub
git clone https://github.com/company/their-app.git
Remove-Item -Recurse -Force their-app/.git

# Option B: extract from ZIP
Expand-Archive -Path their-app.zip -DestinationPath their-app-name

# Option C: copy from shared drive
Move-Item C:\Downloads\their-app .\their-app-name
```

### Step 2 — Add Dockerfile if missing

Check what language the app uses:
```
Node.js  → FROM node:22-alpine
Python   → FROM python:3.12-slim
Java     → FROM eclipse-temurin:17-jre-alpine
Go       → FROM golang:1.22-alpine (build) + alpine (runtime)
.NET     → FROM mcr.microsoft.com/dotnet/aspnet:8.0
```

### Step 3 — Create ECR repository

```powershell
aws ecr create-repository `
  --repository-name their-app-name `
  --image-scanning-configuration scanOnPush=true `
  --region us-east-1
```

### Step 4 — Copy and update pipeline

```powershell
# Copy existing pipeline
copy .github/workflows/fintech-deploy.yml `
     .github/workflows/their-app-deploy.yml
```

Change only these 5 values:
```yaml
env:
  ECR_REPOSITORY: their-app-name      # new ECR repo
  ECS_CLUSTER: cloudops-cluster       # same (reuse)
  ECS_SERVICE: their-app-service      # their ECS service
  CONTAINER_NAME: their-app-name      # their container name

on:
  push:
    paths:
      - 'their-app-name/**'           # trigger path
```

### Step 5 — Push and watch

```powershell
git add .
git commit -m "Add their-app to DevSecOps pipeline"
git push origin main
```

Go to GitHub Actions — watch all security scans run automatically.

---

## 9. How to Run Locally

### Prerequisites

```powershell
# Docker Desktop running
docker --version

# AWS CLI configured
aws configure
aws sts get-caller-identity
```

### Run any app locally

```powershell
# Navigate to app folder
cd fintech-payment-api

# Generate package-lock.json (first time only)
npm install

# Build Docker image
docker build --platform linux/amd64 -t fintech-payment-api:latest .

# Run container
docker run -d -p 8080:8080 --name fintech-api fintech-payment-api:latest

# Verify running
docker ps

# Test
curl.exe http://localhost:8080/health

# Stop when done
docker stop fintech-api
docker rm fintech-api
```

---

## 10. API Documentation

### Fintech Payment API

**Base URL (local):** `http://localhost:8080`
**Base URL (AWS):** Your ECS service URL

#### GET /health
```json
Response:
{
  "status": "healthy",
  "service": "fintech-payment-api",
  "timestamp": "2026-06-18T13:48:36.382Z",
  "version": "1.0.0"
}
```

#### POST /api/v1/payments
```json
Request body:
{
  "amount": 500,
  "currency": "USD",
  "sender": "Alice",
  "receiver": "Bob",
  "description": "Invoice payment"
}

Response (normal payment):
{
  "success": true,
  "transaction": {
    "id": "TXN-1781790527450-XX8GD3TSK",
    "amount": 500,
    "currency": "USD",
    "status": "COMPLETED",
    "flagged": false
  }
}

Response (flagged payment > $10,000):
{
  "success": true,
  "transaction": {
    "id": "TXN-1781790537698-V5QJDFOA7",
    "amount": 15000,
    "status": "PENDING_REVIEW",
    "flagged": true,
    "flagReason": "Amount exceeds $10,000 threshold"
  }
}
```

#### POST /api/v1/fraud-check
```json
Request body:
{
  "amount": 15000,
  "currency": "USD",
  "sender": "Alice",
  "receiver": "Charlie"
}

Response:
{
  "success": true,
  "result": {
    "riskScore": 60,
    "riskLevel": "MEDIUM",
    "risks": ["High value transaction", "Suspicious round amount"],
    "recommendation": "REVIEW",
    "checkedAt": "2026-06-18T13:49:05.677Z"
  }
}
```

#### GET /api/v1/summary
```json
Response:
{
  "success": true,
  "summary": {
    "totalTransactions": 2,
    "completed": 1,
    "pendingReview": 1,
    "flaggedForFraud": 1,
    "totalVolume": "15500.00",
    "currency": "USD"
  }
}
```

---

## 11. Security Findings

### Checkov Results

```
Passed checks: good_bucket
  CKV_AWS_21  ✅ S3 versioning enabled
  CKV_AWS_145 ✅ S3 encryption enabled
  CKV_AWS_56  ✅ S3 public access blocked

Failed checks: bad_bucket (intentional — proves scanner works)
  CKV_AWS_21  ❌ S3 versioning not enabled
  CKV_AWS_145 ❌ S3 encryption not enabled
  CKV_AWS_18  ❌ S3 access logging not enabled
```

### Trivy Results

```
fintech-payment-api:latest
  Alpine OS packages   → 0 vulnerabilities ✅
  npm packages         → 0 vulnerabilities ✅
  Result: CLEAN
```

### npm audit Results

```
Fintech Payment API
  found 0 vulnerabilities ✅
  Result: CLEAN
```

### SonarLint Fixes Applied

```
Fix 1: app.disable('x-powered-by')
       Hides Express version from response headers
       Prevents targeted framework attacks

Fix 2: .substring(2, 11) instead of .substr(2, 9)
       substr() is deprecated in modern JavaScript

Fix 3: Number.parseFloat() instead of parseFloat()
       Modern modular style preferred over global function

Fix 4 & 5: Extracted nested ternaries into named functions
           getRiskLevel() and getRecommendation()
           Improves readability and maintainability
```

---

## 12. Industry Use Cases

### Fintech — PCI-DSS Compliance

```
This pipeline directly addresses PCI-DSS requirements:

Requirement 6.3.3 — Protect against known vulnerabilities:
  → Trivy scans every container before deployment
  → npm audit catches vulnerable dependencies
  → Reports saved as artifacts = audit evidence

Requirement 6.4.1 — Protect web-facing applications:
  → Checkov prevents misconfigured infrastructure
  → x-powered-by header disabled (information disclosure)
  → Security scan reports document remediation

The Fintech Payment API demonstrates:
  → Transaction processing with validation
  → Fraud detection with risk scoring
  → PENDING_REVIEW workflow for suspicious transactions
  → Transaction audit trail
```

### Healthcare — HIPAA Compliance

```
HIPAA Security Rule 164.308(a)(1) — Risk Management:
  → Automated vulnerability scanning on every change
  → Infrastructure misconfigs caught before deployment
  → Continuous risk assessment built into SDLC

This pipeline can onboard a patient records API:
  → Same security scanning applies
  → PHI never exposed (private subnets from CloudOps)
  → All deployments logged in CloudTrail
  → Compliance evidence generated automatically
```

### Telecom — SOC2 Type II

```
SOC2 CC8.1 — Change Management:
  → Every change goes through automated security gates
  → Git commit history = complete change audit trail
  → Pipeline artifacts = security evidence package
  → No manual deployments possible (enforced by process)
```

---

## 13. Key Lessons Learned

```
Always create .gitignore before first commit
  node_modules/ can be 100MB+
  Never commit it — add to .gitignore immediately

Always run npm install locally first
  npm ci requires package-lock.json
  Run npm install → generates package-lock.json
  Commit package-lock.json → never commit node_modules/

YAML files must be created in VS Code
  Never paste long YAML into terminal
  Indentation errors break pipelines silently
  Always use VS Code for .yml files

OIDC trust policy wildcard covers all repos
  Original: repo:uwakweobed89-png/CLOUD-OPS-project:*
  Updated:  repo:uwakweobed89-png/*:*
  Now all future repos work without changes

SonarLint warnings are real security issues
  x-powered-by exposes framework version
  Deprecated functions accumulate as technical debt
  Fix all warnings before committing

Intentional misconfigs prove scanners work
  bad_bucket deliberately fails Checkov
  Shows scanner is actually running
  Powerful evidence in interviews and audits

Docker container must run with -d flag
  Without -d: runs in foreground, blocks terminal
  With -d: runs in background, port stays accessible

Path filtering prevents unnecessary pipelines
  paths: ['fintech-payment-api/**']
  Only triggers when relevant files change
  Saves time and avoids accidental deployments

Release Elastic IPs after deleting NAT Gateways
  EIPs cost $0.005/hr when unattached
  Wait 2 minutes after NAT GW deletion
  Then release all unattached EIPs
  Saves ~$14/month
```

---

## Related Projects

- [CloudOps Production Platform](https://github.com/uwakweobed89-png/CLOUD-OPS-project) — the AWS infrastructure this pipeline deploys to

---

*Built by Uwakwe Obed — DevSecOps Engineer targeting Fintech, Telecom, and Healthcare*

*"Security is not a feature you add at the end. It is a discipline you build into every step."*
