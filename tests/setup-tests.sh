#!/bin/bash

# ============================================
# Test Setup Script
# CNC-Pilot MVP - Operations Tests
# ============================================

echo "🔧 Setting up tests for CNC-Pilot MVP..."
echo ""

# Check if .env.test exists
if [ ! -f .env.test ]; then
  echo "📝 Creating .env.test file..."
  cat > .env.test << EOF
# Test environment variables
TEST_USER_EMAIL=test@metaltech.pl
TEST_USER_PASSWORD=TestPassword123!

# Base URL (optional - defaults to http://localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3000
EOF
  echo "✅ Created .env.test"
  echo "⚠️  IMPORTANT: Update TEST_USER_EMAIL and TEST_USER_PASSWORD with valid credentials!"
  echo ""
fi

# Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
  echo "📦 Installing Playwright..."
  npm install -D @playwright/test
  npx playwright install chromium
  echo "✅ Playwright installed"
  echo ""
fi

# Check if Vitest is installed
if ! npx vitest --version > /dev/null 2>&1; then
  echo "📦 Installing Vitest..."
  npm install -D vitest
  echo "✅ Vitest installed"
  echo ""
fi

echo "🧪 Running unit tests..."
npm run test
UNIT_RESULT=$?

if [ $UNIT_RESULT -eq 0 ]; then
  echo "✅ Unit tests passed!"
  echo ""
else
  echo "❌ Unit tests failed!"
  echo ""
  exit 1
fi

echo "🎭 Setting up E2E tests..."
echo ""

# Check if dev server is running
if curl -s http://localhost:3000 > /dev/null; then
  echo "✅ Dev server is running on http://localhost:3000"
  echo ""
else
  echo "⚠️  Dev server is not running!"
  echo "   Start it with: npm run dev"
  echo ""
fi

echo "📋 Test setup complete!"
echo ""
echo "Available commands:"
echo "  npm run test              # Run unit tests"
echo "  npm run test:watch        # Run unit tests in watch mode"
echo "  npm run test:coverage     # Run unit tests with coverage"
echo "  npm run test:e2e          # Run E2E tests"
echo "  npm run test:e2e:ui       # Run E2E tests in UI mode"
echo "  npm run test:e2e:report   # Show last E2E test report"
echo ""
echo "For E2E tests, make sure:"
echo "  1. Dev server is running (npm run dev)"
echo "  2. Test user exists in database (check .env.test)"
echo "  3. At least one order exists in the system"
echo ""
echo "🚀 Ready to test!"
