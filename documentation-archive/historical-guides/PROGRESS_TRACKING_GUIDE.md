# 📊 Progress Tracking Guide

> **This guide ensures consistent progress tracking across all project documentation**

## 🎯 Files That Must Be Updated

### 1. **API_PATHS_AND_VARIABLES.md** (Technical Reference) ⚠️ HIGHEST PRIORITY
Update when:
- Creating ANY new API endpoint
- Defining new request/response fields
- Changing variable names
- Discovering path patterns
- Finding frontend/backend inconsistencies

What to update:
- Add endpoint to the table immediately
- Document exact paths (frontend service → backend handler)
- Map field names between systems
- Add to "Common Pitfalls" if you hit an issue
- Update debug checklist if new checks needed

**⚡ Update this IMMEDIATELY - don't wait until errors occur!**

### 2. **PROJECT_PLAN.md** (Overall Progress)
Update when:
- Completing any task marked with [ ]
- Finishing a major feature
- Moving to a new phase

What to update:
- Change [ ] to [x] for completed tasks
- Update phase percentages (e.g., "40% Complete" → "60% Complete")
- Move items from "Currently Working On" to "Recently Completed"
- Update "Last Updated" date at bottom

### 3. **NEXT_STEPS.md** (Current Focus)
Update when:
- Starting new tasks
- Priorities change
- Discovering new requirements

What to update:
- Move completed items to "Recently Completed" section
- Adjust priority levels
- Add newly discovered tasks
- Update immediate next steps
- Update "Last Updated" date

### 4. **Todo List** (via TodoWrite tool)
Update when:
- Starting a task (status: "in_progress")
- Completing a task (status: "completed")
- Adding new tasks (status: "pending")

### 5. **CLAUDE.md** (AI Knowledge Base)
Update when:
- Learning new patterns
- Fixing recurring issues
- Discovering project quirks
- Adding new quick commands

## 📝 Update Template

When completing a significant task, use this template:

```markdown
### ✅ [Task Name] - [Date]
- **What**: Brief description of what was done
- **Issues Fixed**: Any bugs or problems resolved
- **Files Changed**: Key files modified
- **Documentation**: New docs created or updated
- **Next**: What should happen next
```

## 🔄 Progress Tracking Workflow

1. **Before Starting Work**
   - Check NEXT_STEPS.md for priorities
   - Update todo list to mark task as "in_progress"

2. **During Work** ⚠️ CRITICAL
   - **Document API changes in API_PATHS_AND_VARIABLES.md IMMEDIATELY**
   - Don't wait until you hit errors!
   - Add new endpoints as soon as you create them
   - Document variable names as you define them
   - Note any path patterns discovered

3. **After Completing Work**
   - Update todo list to "completed"
   - Update PROJECT_PLAN.md percentages
   - Move task to "Recently Completed" in NEXT_STEPS.md
   - Add any new discoveries to CLAUDE.md
   - Review API_PATHS_AND_VARIABLES.md for completeness

## 📊 Phase Progress Calculation

Use this guide for updating phase percentages:

### Phase Components
- Each major feature = 20-30%
- Documentation = 10%
- Testing = 10%
- Bug fixes = 5-10%

### Example Calculation
Phase 3 (Analytics & Media Processing):
- ✅ S3/MinIO setup: 10%
- ✅ Video upload endpoints: 15%
- ✅ FFmpeg processing: 20%
- ✅ Celery workers: 15%
- 🚧 Librosa analytics: 0% (of 20%)
- 🚧 TimescaleDB metrics: 0% (of 15%)
- 🚧 Dashboard UI: 0% (of 5%)
**Total: 60% Complete**

## 🚨 Important Reminders

1. **Always update progress immediately** - Don't wait until end of session
2. **Be specific about what was completed** - Helps future debugging
3. **Document problems and solutions** - Saves time later
4. **Keep percentages realistic** - Better to underestimate than overestimate
5. **Update multiple files** - They work together as a system

## 📅 Session Progress Checklist

Throughout the work session:
- [ ] API_PATHS_AND_VARIABLES.md updated IMMEDIATELY when creating endpoints
- [ ] Variable names documented as they're defined
- [ ] Path patterns added when discovered

At the end of each work session:
- [ ] PROJECT_PLAN.md updated with completed tasks
- [ ] NEXT_STEPS.md reflects current priorities
- [ ] Todo list matches actual progress
- [ ] API_PATHS_AND_VARIABLES.md reviewed for completeness
- [ ] Lessons learned added to CLAUDE.md
- [ ] This checklist reviewed

---

**Remember**: Good progress tracking helps everyone understand the project state and prevents repeated work!