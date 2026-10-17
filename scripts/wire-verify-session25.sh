#!/usr/bin/env bash
# Wire verification of the session-25 artifacts (F-N/F-O/F-P/F-Q) on the
# built standalone. One invocation = boot + probes + kill by listening pid.
set -u
cd /home/z/my-project
PORT=3200
export NODE_ENV=production
export AUTH_SECRET="dev-only-secret-0123456789abcdef0123456789abcdef"
export DATABASE_URL="file:/home/z/my-project/db/custom.db"

PORT=$PORT node .next/standalone/server.js > /tmp/standalone-3200.log 2>&1 &
for i in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/health" && break
  sleep 1
done

echo "=== F-N: home JSON-LD blocks (served bytes) ==="
curl -s "http://127.0.0.1:$PORT/" > /tmp/h.html
NONCE=$(rg -o "script-src 'self' 'nonce-[^']+'" /tmp/h.html | rg -o '[A-Za-z0-9+/_-]+={0,2}$')
rg -o '<script type="application/ld\+json"[^>]*>' /tmp/h.html
echo "blocks:"; rg -o '<script type="application/ld\+json">[^<]*</script>' /tmp/h.html | head -4
echo "nonce expected: $NONCE"

echo
echo "=== F-O: font preloads ==="
rg -o '<link[^>]*rel="preload"[^>]*as="font"[^>]*>' /tmp/h.html | head -4

echo
echo "=== F-P: theme-color ==="
rg -o '<meta[^>]*theme-color[^>]*>' /tmp/h.html

echo
echo "=== F-Q: security.txt ==="
curl -s -w "\nstatus=%{http_code} type=%{content_type}\n" "http://127.0.0.1:$PORT/.well-known/security.txt"

echo
echo "=== PDP JSON-LD still nonceless-and-untouched ==="
curl -s "http://127.0.0.1:$PORT/product/silk-draped-evening-gown" | rg -o '<script type="application/ld\+json"[^>]*>' | head -2

# kill by LISTENING pid (trap-#36 discipline)
LISTEN=$(ss -tlnp 2>/dev/null | rg ":$PORT" | rg -o 'pid=[0-9]+' | head -1 | cut -d= -f2)
if [ -n "${LISTEN:-}" ]; then kill -9 "$LISTEN"; echo "killed listener pid=$LISTEN"; else echo "port clean"; fi
