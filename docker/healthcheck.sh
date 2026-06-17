#!/bin/sh
# Health check pentru container: verifică că Nginx răspunde pe /health.
# Folosit de HEALTHCHECK în Dockerfile sau de Kubernetes liveness/readiness.
set -eu
PORT="${HEALTHCHECK_PORT:-8080}"
if command -v wget >/dev/null 2>&1; then
  wget -q -O - "http://127.0.0.1:${PORT}/health" | grep -q ok || exit 1
elif command -v curl >/dev/null 2>&1; then
  curl -fsS "http://127.0.0.1:${PORT}/health" | grep -q ok || exit 1
else
  echo "healthcheck: need wget or curl" >&2
  exit 1
fi
