# Music Practice Tracker

A mobile-first application for music students and teachers to track practice sessions, record videos, and monitor progress.

**Current Status**: Phase 7 (Polish & Optimization) - Core features complete, working on practice focus system redesign and slow practice enforcer.

## 📚 Documentation

See **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** for complete documentation.

**Critical Files (Optimized for Memory)**:
- **[CLAUDE_ACTIVE.md](./CLAUDE_ACTIVE.md)** 🤖 - Condensed critical patterns and active issues only
- **[CURRENT_WORK.md](./CURRENT_WORK.md)** 🚀 - Current tasks and progress (replaces PROJECT_PLAN + NEXT_STEPS)
- **[API_PATHS_AND_VARIABLES.md](./API_PATHS_AND_VARIABLES.md)** ⭐ - All API paths and variables (READ THIS FIRST!)
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Common commands and fixes

> **⚠️ IMPORTANT**: Always update these files throughout the session:
> - **CURRENT_WORK.md** - Mark completed tasks and update active work
> - **API_PATHS_AND_VARIABLES.md** - Document ANY new endpoints, paths, or variable changes IMMEDIATELY!
> - **CLAUDE_ACTIVE.md** - Add new critical patterns discovered

> **💡 Note**: Documentation was optimized on 2025-06-30 to reduce memory usage by 76%. 
> Historical documentation is archived in `/documentation-archive/`

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### 1. Start Backend Services
```bash
# Start all services
docker-compose up -d

# Create MinIO bucket
docker exec musictracker-minio mc mb --ignore-existing myminio/music-tracker

# Check all services are healthy
docker-compose ps
```

### 2. Start Mobile App
```bash
cd mobile-app
npm install
npm start

# For physical device, update .env:
# EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api/v1
```

### 3. Create Test User
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "test123", "full_name": "Test User", "role": "student"}'
```

## 🏗️ Architecture

- **Frontend**: React Native Expo + TypeScript + Redux Toolkit
- **Backend**: FastAPI + PostgreSQL + TimescaleDB
- **Storage**: MinIO (S3-compatible)
- **Queue**: Redis + Celery
- **Video Processing**: FFmpeg

## 🔧 Development

### Common Tasks
```bash
# View logs
docker-compose logs -f backend

# Run database migrations
docker exec musictracker-backend alembic upgrade head

# Access database
docker exec -it musictracker-db psql -U postgres -d musictracker

# Monitor Celery tasks
open http://localhost:5555

# View MinIO console
open http://localhost:9001  # minioadmin/minioadmin
```

### Troubleshooting
See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for common issues and fixes.

## 📝 Key Lesson

> **保持變數的一致性** (Keep variable consistency)

This is the most important lesson from this project. Always check [API_PATHS_AND_VARIABLES.md](./API_PATHS_AND_VARIABLES.md) before making changes!

## 🤝 Contributing

1. Read [API_PATHS_AND_VARIABLES.md](./API_PATHS_AND_VARIABLES.md)
2. Update documentation when changing paths/variables
3. Test with curl before testing in app
4. Update [CLAUDE_ACTIVE.md](./CLAUDE_ACTIVE.md) with new critical patterns

## 📄 License

[Add your license here]

---

Created with 💪 after many hours of debugging path inconsistencies!