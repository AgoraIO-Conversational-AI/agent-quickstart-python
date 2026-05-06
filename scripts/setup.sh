#!/usr/bin/env bash
set -euo pipefail

bash scripts/dev-check.sh

cd server
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
PIP_INDEX_URL=https://pypi.org/simple pip install -r requirements.txt

echo
echo "✅ Setup complete! Next steps:"
echo "   1. Ensure server/.env.local exists (preferred: agora project env write server/.env.local --with-secrets)"
echo "   2. Run: bun run dev or npm run dev"
echo
