const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.disable('x-powered-by'); // Fix 1: hide Express version from response headers
app.use(express.json());

// In-memory transaction store (simulates a database)
const transactions = [];

// ── Health Check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'fintech-payment-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ── Create Payment Transaction ────────────────────────
// POST /api/v1/payments
// Body: { amount, currency, sender, receiver, description }
app.post('/api/v1/payments', (req, res) => {
  const { amount, currency, sender, receiver, description } = req.body;

  // Basic validation
  if (!amount || !currency || !sender || !receiver) {
    return res.status(400).json({
      error: 'Missing required fields: amount, currency, sender, receiver'
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      error: 'Amount must be greater than 0'
    });
  }

  // Fraud detection simulation
  // Flag transactions over $10,000 for review
  const isFlagged = amount > 10000;

  const transaction = {
    id: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`, // Fix 2: substr → substring
    amount: Number.parseFloat(amount), // Fix 3: parseFloat → Number.parseFloat
    currency: currency.toUpperCase(),
    sender,
    receiver,
    description: description || 'Payment',
    status: isFlagged ? 'PENDING_REVIEW' : 'COMPLETED',
    flagged: isFlagged,
    flagReason: isFlagged ? 'Amount exceeds $10,000 threshold' : null,
    createdAt: new Date().toISOString(),
    processedAt: isFlagged ? null : new Date().toISOString()
  };

  transactions.push(transaction);

  console.log(`Transaction created: ${transaction.id} | Amount: ${amount} ${currency} | Status: ${transaction.status}`);

  res.status(201).json({
    success: true,
    transaction
  });
});

// ── Get Transaction by ID ─────────────────────────────
// GET /api/v1/payments/:id
app.get('/api/v1/payments/:id', (req, res) => {
  const transaction = transactions.find(t => t.id === req.params.id);

  if (!transaction) {
    return res.status(404).json({
      error: `Transaction ${req.params.id} not found`
    });
  }

  res.json({ success: true, transaction });
});

// ── List All Transactions ─────────────────────────────
// GET /api/v1/payments
app.get('/api/v1/payments', (req, res) => {
  const { status, currency } = req.query;

  let filtered = [...transactions];

  if (status) {
    filtered = filtered.filter(t =>
      t.status === status.toUpperCase()
    );
  }

  if (currency) {
    filtered = filtered.filter(t =>
      t.currency === currency.toUpperCase()
    );
  }

  res.json({
    success: true,
    count: filtered.length,
    transactions: filtered
  });
});

// ── Helper functions for fraud scoring ───────────────
// Fix 4 & 5: extracted nested ternaries into named functions
function getRiskLevel(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function getRecommendation(score) {
  if (score >= 70) return 'BLOCK';
  if (score >= 40) return 'REVIEW';
  return 'APPROVE';
}

// ── Fraud Detection Check ─────────────────────────────
// POST /api/v1/fraud-check
app.post('/api/v1/fraud-check', (req, res) => {
  const { amount, sender, receiver, currency } = req.body;

  const risks = [];
  let riskScore = 0;

  // Rule 1: High value transaction
  if (amount > 10000) {
    risks.push('High value transaction');
    riskScore += 40;
  }

  // Rule 2: Round number (common in fraud)
  if (amount % 1000 === 0 && amount > 1000) {
    risks.push('Suspicious round amount');
    riskScore += 20;
  }

  // Rule 3: Same sender and receiver
  if (sender === receiver) {
    risks.push('Sender and receiver are the same');
    riskScore += 50;
  }

  // Rule 4: Foreign currency high value
  if (currency !== 'USD' && amount > 5000) {
    risks.push('High value foreign currency transaction');
    riskScore += 30;
  }

  const result = {
    riskScore,
    riskLevel: getRiskLevel(riskScore),       // Fix 4: extracted nested ternary
    risks,
    recommendation: getRecommendation(riskScore), // Fix 5: extracted nested ternary
    checkedAt: new Date().toISOString()
  };

  console.log(`Fraud check: Score ${riskScore} | Level: ${result.riskLevel} | Recommendation: ${result.recommendation}`);

  res.json({ success: true, result });
});

// ── Transaction Summary ───────────────────────────────
// GET /api/v1/summary
app.get('/api/v1/summary', (req, res) => {
  const total = transactions.length;
  const completed = transactions.filter(t => t.status === 'COMPLETED').length;
  const pending = transactions.filter(t => t.status === 'PENDING_REVIEW').length;
  const flagged = transactions.filter(t => t.flagged).length;
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

  res.json({
    success: true,
    summary: {
      totalTransactions: total,
      completed,
      pendingReview: pending,
      flaggedForFraud: flagged,
      totalVolume: totalVolume.toFixed(2),
      currency: 'USD'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Fintech Payment API running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET  /health`);
  console.log(`  POST /api/v1/payments`);
  console.log(`  GET  /api/v1/payments`);
  console.log(`  GET  /api/v1/payments/:id`);
  console.log(`  POST /api/v1/fraud-check`);
  console.log(`  GET  /api/v1/summary`);
});

module.exports = app;
