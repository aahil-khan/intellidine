#!/bin/bash

# Archive files - Session notes, build logs, and step-by-step progress files
mkdir -p .archive

# Move session/progress notes
for file in SESSION_*.md REVIEW_SESSION_*.md STEP_*.md BUILD_LOG*.md SPRINT_ALIGNMENT.md SHARED_FOLDER_FIXES.md TASKS.md PROGRESS.md CODEBASE_CLEANUP_PLAN.md DELIVERY_SUMMARY.md DEVELOPMENT_PLAN_BACKEND_FOCUSED.md STEP_4_2_IMPLEMENTATION_PLAN.md STEP_4_2_API_DOCUMENTATION.md API_GATEWAY_TESTING.md STEP_4_1_PROGRESS.md STEP_4_1_TESTING.md; do
  if [ -f "$file" ]; then
    mv "$file" .archive/
    echo "Archived: $file"
  fi
done

echo ""
echo "Archive complete! Kept essential files:"
ls -1 *.md 2>/dev/null | head -20
