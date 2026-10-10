#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT/bin/broadcastgrid.js"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
export BROADCASTGRID_DATA="$WORK/data.json"

pass() { echo "ok - $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

# --version
ver="$(node "$CLI" --version)"
[ "$ver" = "0.1.0" ] || fail "--version expected 0.1.0, got '$ver'"
pass "--version prints 0.1.0"

# --help
node "$CLI" --help | grep -q "post add" || fail "--help missing commands"
pass "--help lists commands"

# post add
first="$(node "$CLI" post add --channel mastodon --text "hello world")"
[ "$first" = "QUEUED p1" ] || fail "first add: '$first'"
second="$(node "$CLI" post add --channel slack --text "second post")"
[ "$second" = "QUEUED p2" ] || fail "second add: '$second'"
pass "post add queues posts"

# post list (default: all)
all="$(node "$CLI" post list)"
row1="$(printf 'p1\tqueued\tmastodon\thello world')"
row2="$(printf 'p2\tqueued\tslack\tsecond post')"
[ "$all" = "$(printf '%s\n%s' "$row1" "$row2")" ] || fail "list all mismatch: $all"
pass "post list shows all queued posts"

# post list --limit
limited="$(node "$CLI" post list --limit 1)"
[ "$limited" = "$row1" ] || fail "limit 1 mismatch: $limited"
pass "post list --limit 1"

# bad --limit exits 2
set +e
node "$CLI" post list --limit abc >/dev/null 2>&1
badcode=$?
set -e
[ "$badcode" -eq 2 ] || fail "bad --limit expected exit 2, got $badcode"
pass "post list --limit abc exits 2"

# queue run --once
ran="$(node "$CLI" queue run --once)"
[ "$ran" = "PUBLISHED p1" ] || fail "run expected PUBLISHED p1, got '$ran'"
published="$(node "$CLI" post list --limit 1)"
pubrow="$(printf 'p1\tpublished\tmastodon\thello world')"
[ "$published" = "$pubrow" ] || fail "p1 not marked published: $published"
pass "queue run --once publishes oldest post"

# drain queue
ran2="$(node "$CLI" queue run --once)"
[ "$ran2" = "PUBLISHED p2" ] || fail "run2 expected PUBLISHED p2, got '$ran2'"
empty="$(node "$CLI" queue run --once)"
[ "$empty" = "QUEUE EMPTY" ] || fail "empty expected QUEUE EMPTY, got '$empty'"
pass "queue drains then reports empty"

# no stray state in the repo
[ ! -e "$ROOT/data.json" ] || fail "stray data.json created in repo"
pass "no stray data.json in repo"

echo "SMOKE PASS"
