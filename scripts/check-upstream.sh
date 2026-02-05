#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Checking upstream repository for new changes...${NC}"
echo ""

# Ensure upstream remote exists
if ! git remote | grep -q "^upstream$"; then
    echo -e "${YELLOW}Adding upstream remote...${NC}"
    git remote add upstream https://github.com/tiann/hapi
fi

# Fetch upstream changes
echo -e "${BLUE}Fetching upstream/main...${NC}"
git fetch upstream main

# Count new commits
NEW_COMMITS=$(git log --oneline --no-merges main..upstream/main | wc -l)

if [ "$NEW_COMMITS" -eq 0 ]; then
    echo -e "${GREEN}✅ No new upstream commits${NC}"
    exit 0
fi

echo -e "${YELLOW}📦 $NEW_COMMITS new commits available upstream${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show commits grouped by type
echo -e "${BLUE}Bug Fixes:${NC}"
git log --oneline --no-merges main..upstream/main | grep -E "^[a-f0-9]+ fix" || echo "  None"
echo ""

echo -e "${BLUE}Features:${NC}"
git log --oneline --no-merges main..upstream/main | grep -E "^[a-f0-9]+ feat" || echo "  None"
echo ""

echo -e "${BLUE}Documentation:${NC}"
git log --oneline --no-merges main..upstream/main | grep -E "^[a-f0-9]+ docs" || echo "  None"
echo ""

echo -e "${BLUE}Refactorings:${NC}"
git log --oneline --no-merges main..upstream/main | grep -E "^[a-f0-9]+ refactor" || echo "  None"
echo ""

echo -e "${BLUE}Other:${NC}"
git log --oneline --no-merges main..upstream/main | grep -vE "^[a-f0-9]+ (fix|feat|docs|refactor)" || echo "  None"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show file change summary
echo -e "${BLUE}Files changed:${NC}"
MERGE_BASE=$(git merge-base main upstream/main)
git diff --stat "$MERGE_BASE"..upstream/main | tail -1
echo ""

# Next steps
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Review changes: git log --stat main..upstream/main"
echo "  2. Review specific commit: git show <commit-hash>"
echo "  3. Start sync process: git checkout -b upstream-sync-$(date +%Y-%m-%d)"
echo "  4. Cherry-pick commit: git cherry-pick -x <commit-hash>"
echo ""
echo -e "${YELLOW}See UPSTREAM_SYNC_STRATEGY.md for detailed sync workflow${NC}"
