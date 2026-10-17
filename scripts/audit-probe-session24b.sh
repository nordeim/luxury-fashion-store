#!/usr/bin/env bash
# Fresh-audit wire probe (session-24 continuation): boots the standalone on
# :3200, runs the seam probes, kills by LISTENING pid. One invocation = one
# process group (the sandbox kills backgrounded servers between calls).
set -u
cd /home/z/my-project
PORT=3200
export NODE_ENV=production
export AUTH_SECRET="dev-only-secret-0123456789abcdef0123456789abcdef"
export DATABASE_URL="file:/home/z/my-project/db/custom.db"

PORT=$PORT node .next/standalone/server.js > /tmp/standalone-3200.log 2>&1 &
SRV=$!
for i in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/health" && break
  sleep 1
done

probe() { echo "=== $1 ==="; shift; "$@"; echo; }

echo "############ CLONE HOME HEAD (curated) ############"
curl -s "http://127.0.0.1:$PORT/" > /tmp/clone-home.html
echo "-- preload links --";         rg -o '<link[^>]*preload[^>]*>' /tmp/clone-home.html | head -16
echo "-- theme-color --";           rg -o '<meta[^>]*theme-color[^>]*>' /tmp/clone-home.html
echo "-- robots meta --";           rg -o '<meta[^>]*name="robots"[^>]*>' /tmp/clone-home.html
echo "-- twitter:card --";          rg -o '<meta[^>]*twitter:card[^>]*>' /tmp/clone-home.html
echo "-- ld+json count --";         rg -c 'application/ld\+json' /tmp/clone-home.html || echo 0
echo "-- og:image --";              rg -o '<meta[^>]*property="og:image"[^>]*>' /tmp/clone-home.html

echo "############ CLONE PDP HEAD (curated) ############"
curl -s "http://127.0.0.1:$PORT/product/silk-draped-evening-gown" > /tmp/clone-pdp.html
echo "-- ld+json count --";         rg -c 'application/ld\+json' /tmp/clone-pdp.html || echo 0
echo "-- ld+json types --";         rg -o '"@type":\s*"[^"]+"' /tmp/clone-pdp.html | sort | uniq -c
echo "-- robots meta --";           rg -o '<meta[^>]*name="robots"[^>]*>' /tmp/clone-pdp.html
echo "-- canonical --";             rg -o '<link[^>]*canonical[^>]*>' /tmp/clone-pdp.html

echo "############ CLONE 404 HEAD ############"
curl -s -o /tmp/clone-404.html -w "status=%{http_code}\n" "http://127.0.0.1:3200/nonexistent-page-xyz"
rg -o '<meta[^>]*name="robots"[^>]*>' /tmp/clone-404.html || echo "(no robots meta)"

echo "############ COMPRESSION / ETAG ############"
curl -s -H "Accept-Encoding: gzip" -o /dev/null -w "home gzip: %{size_download} bytes, encoding=%{header_json}\n" "http://127.0.0.1:$PORT/" 2>/dev/null | head -c 300
echo
curl -sI -H "Accept-Encoding: gzip" "http://127.0.0.1:$PORT/" | rg -i 'content-encoding|etag|vary|cache-control' | head -6

echo "############ WELL-KNOWN / SECURITY.TXT ############"
curl -s -o /dev/null -w "/.well-known/security.txt -> %{http_code}\n" "http://127.0.0.1:$PORT/.well-known/security.txt"

echo "############ ROBOTS + SITEMAP (spot) ############"
curl -s -o /dev/null -w "/robots.txt -> %{http_code} %{content_type}\n" "http://127.0.0.1:$PORT/robots.txt"
curl -s -o /dev/null -w "/sitemap.xml -> %{http_code} %{content_type}\n" "http://127.0.0.1:$PORT/sitemap.xml"

kill "$SRV" 2>/dev/null
sleep 1
LISTEN=$(ss -tlnp 2>/dev/null | rg ":$PORT" | rg -o 'pid=[0-9]+' | head -1 | cut -d= -f2)
if [ -n "${LISTEN:-}" ]; then kill -9 "$LISTEN" 2>/dev/null; echo "killed lingering listener pid=$LISTEN"; else echo "port $PORT clean"; fi
