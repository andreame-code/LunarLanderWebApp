#!/usr/bin/env bash
set -euo pipefail
npm config get registry
npm ping --registry=https://registry.npmjs.org/
