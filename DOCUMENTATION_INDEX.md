# 📚 Music Tracker Documentation Index

## 🎯 Active Documentation (Optimized for Memory)
1. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - One-page cheat sheet for common tasks
2. **[API_PATHS_AND_VARIABLES.md](./API_PATHS_AND_VARIABLES.md)** ⭐ - **CRITICAL**: All API paths and variable mappings
3. **[CLAUDE_ACTIVE.md](./CLAUDE_ACTIVE.md)** 🆕 - **Condensed** critical patterns and active issues only
4. **[CURRENT_WORK.md](./CURRENT_WORK.md)** 🆕 - Current tasks and progress (replaces NEXT_STEPS + PROJECT_PLAN)

## 📋 Essential References
- **[README.md](./README.md)** - Basic project setup
- **[VIDEO_PROCESSING_FLOW.md](./VIDEO_PROCESSING_FLOW.md)** - What happens after upload
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - How to test the application
- **[must-read/](./must-read/)** - Original project specifications

## 📦 Archived Documentation
- **[documentation-archive/](./documentation-archive/)** 📂 - Historical fixes and completed phases
  - `/completed-fixes/` - Resolved video upload issues, complete solutions
  - `/historical-guides/` - WSL2 setup, troubleshooting guides
  - `/completed-phases/` - Detailed phase 1-6 documentation
- **[CLAUDE.md](./CLAUDE.md)** - Full historical AI context (reference only)
- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - Full project history (reference only)
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Superseded by CURRENT_WORK.md

## 🏗️ Architecture
- **Backend**: FastAPI + PostgreSQL + Redis + Celery + MinIO
- **Frontend**: React Native Expo + Redux Toolkit + TypeScript
- **Infrastructure**: Docker Compose

## 📝 Key Lessons Learned

1. **保持變數的一致性** (Keep variable consistency) - The most important lesson!
2. **Document paths and variables immediately** - Don't wait until errors occur
3. **Test with curl first** - Isolates frontend vs backend issues
4. **Read the FULL error message** - Especially Pydantic validation errors
5. **Check all services are healthy** - Many issues come from missing services

## 🚀 Quick Start for New Developers

1. Read **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**
2. Study **[API_PATHS_AND_VARIABLES.md](./API_PATHS_AND_VARIABLES.md)**
3. Follow **[README.md](./README.md)** for setup
4. Check **[CURRENT_WORK.md](./CURRENT_WORK.md)** for active tasks
5. Consult **[CLAUDE_ACTIVE.md](./CLAUDE_ACTIVE.md)** for critical patterns

## 🔄 When Making Changes

**ALWAYS UPDATE**:
1. The code
2. [API_PATHS_AND_VARIABLES.md](./API_PATHS_AND_VARIABLES.md) if paths/variables change
3. [CLAUDE_ACTIVE.md](./CLAUDE_ACTIVE.md) if new critical patterns discovered
4. [CURRENT_WORK.md](./CURRENT_WORK.md) when completing tasks
5. This index if new documentation added

## 💡 Documentation Optimization

**Why optimized?** Original documentation was 420KB+ causing memory issues.
**Result**: 76% reduction in active documentation (now ~100KB)
**Strategy**: Moved historical/completed items to archive, kept only critical active info

---

**Created**: 2025-06-26  
**Optimized**: 2025-06-30 - Reduced memory footprint by 76%  
**Purpose**: Prevent the path/variable inconsistency issues that plagued early development  
**Maintained by**: All contributors (yes, that means YOU!)  