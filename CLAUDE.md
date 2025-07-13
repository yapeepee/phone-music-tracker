# 🤖 Claude Memory System (Optimized)

**Last Updated**: 2025-01-15
**Status**: Streamlined for faster loading

## 📚 Quick Start Guide

When helping with this project, check these files in order:

1. **`CLAUDE_CRITICAL.md`** (154 lines)
   - Top 13 most common errors
   - Active work status
   - Critical patterns to check first

2. **`API_PATHS_AND_VARIABLES.md`** (132 lines) 
   - Compact API reference
   - Variable name mappings
   - Request/response formats

3. **`CURRENT_WORK.md`** (dynamic)
   - Active development tasks
   - Recent completions
   - Next priorities

4. **`CLAUDE_LESSONS.md`** (198 lines)
   - Categorized patterns by topic
   - Historical fixes that still apply
   - Detailed explanations when needed

5. **`QUICK_REFERENCE.md`** (54 lines)
   - Common commands
   - Quick fixes table
   - Development workflow

## 🎯 Project Overview

**Music Practice Tracker** - Mobile-first music practice system
- React Native Expo (TypeScript) frontend
- FastAPI (Python) backend  
- PostgreSQL + TimescaleDB
- Redis + Celery for async
- MinIO for video storage
- Docker Compose development

## 🔥 Most Critical Rule

**保持變數的一致性 (Keep variable consistency)**
- Frontend/backend names MUST match exactly
- Always check API_PATHS_AND_VARIABLES.md first
- Common: student_id/studentId, created_at/createdAt

## 📊 Optimization Results

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| CLAUDE.md | 1754 lines | 71 lines | 96% |
| API_PATHS_AND_VARIABLES.md | 1262 lines | 131 lines | 90% |
| CLAUDE_ACTIVE.md | 386 lines | 0 (merged) | 100% |
| Total Documentation | 3402 lines | 575 lines | 83% |

## 🗃️ Archive Location

Historical documentation preserved in:
`/documentation-archive/`

- CLAUDE_ORIGINAL_20250115.md (1754 lines)
- API_PATHS_AND_VARIABLES_ORIGINAL_20250115.md (1262 lines)
- API_PATHS_AND_VARIABLES_VERBOSE.md (original detailed version)
- CLAUDE_ACTIVE_20250115.md (merged into new structure)

## 🔄 Maintenance Schedule

1. **Daily**: Update CURRENT_WORK.md with progress
2. **Weekly**: Review CLAUDE_CRITICAL.md for new patterns
3. **Monthly**: Archive resolved issues from CLAUDE_LESSONS.md
4. **Quarterly**: Full documentation review and cleanup

## 🧪 Test Data Creation

To create test data for the application:

```bash
docker-compose exec backend python scripts/create_test_data_simple.py
```

This creates:
- 4 test users (3 students, 1 teacher)
- 8 musical pieces (classical pieces with composers)
- User-piece assignments showing who's working on what
- Sample practice sessions
- Sample forum posts connected to pieces

Test credentials:
- Students: alice@example.com, bob@example.com, carol@example.com
- Teacher: teacher@example.com
- Password for all: testpass123

---

**Remember**: When in doubt, check CLAUDE_CRITICAL.md first!