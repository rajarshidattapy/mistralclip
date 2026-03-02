#!/usr/bin/env bash
set -euo pipefail

rm -rf backend/.data
mkdir -p backend/.data/assets backend/.data/exports
echo "State reset at backend/.data"
