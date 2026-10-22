#!/usr/bin/env bash
# Compare local taekwondo-project/ (HEAD) vs GitHub origin/main (read-only report)
set -euo pipefail
cd /home/z/my-project

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Local project files (strip taekwondo-project/ prefix), excluding build artifacts
git ls-tree -r HEAD --name-only taekwondo-project/ \
  | sed 's|^taekwondo-project/||' \
  | grep -vE '(^|/)(node_modules|dist|dist-single)/|\.env$|(^|/)false$' > "$TMP/local.txt"

# Remote files
git ls-tree -r origin/main --name-only > "$TMP/remote.txt"

echo "=== COUNTS ==="
echo "local project files: $(wc -l < "$TMP/local.txt")"
echo "remote files:        $(wc -l < "$TMP/remote.txt")"

echo ""
echo "=== ONLY IN LOCAL (new files to push) ==="
comm -23 <(sort "$TMP/local.txt") <(sort "$TMP/remote.txt") | tee "$TMP/only_local.txt" | wc -l

echo ""
echo "=== ONLY IN REMOTE (would be removed if replaced) ==="
comm -13 <(sort "$TMP/local.txt") <(sort "$TMP/remote.txt") | tee "$TMP/only_remote.txt" | wc -l

echo ""
echo "=== COMMON FILES ==="
comm -12 <(sort "$TMP/local.txt") <(sort "$TMP/remote.txt") > "$TMP/common.txt"
wc -l < "$TMP/common.txt"

# Compare content hashes for common files
MODIFIED=0; SAME=0
> "$TMP/modified.txt"
while IFS= read -r f; do
  lh=$(git rev-parse "HEAD:taekwondo-project/$f" 2>/dev/null || echo "MISSING")
  rh=$(git rev-parse "origin/main:$f" 2>/dev/null || echo "MISSING")
  if [ "$lh" != "$rh" ]; then
    echo "$f" >> "$TMP/modified.txt"; MODIFIED=$((MODIFIED+1))
  else
    SAME=$((SAME+1))
  fi
done < "$TMP/common.txt"

echo "common files modified: $MODIFIED"
echo "common files identical: $SAME"

echo ""
echo "=== ONLY-IN-LOCAL LIST (top 60) ==="
head -60 "$TMP/only_local.txt"

echo ""
echo "=== ONLY-IN-REMOTE LIST ==="
cat "$TMP/only_remote.txt"
