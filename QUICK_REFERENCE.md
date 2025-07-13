# ⚡ Quick Reference Card - Music Practice Tracker

## 🚨 Before You Code
1. Check `API_PATHS_AND_VARIABLES.md` for endpoints
2. Variable names MUST match frontend/backend exactly
3. Test with curl before debugging frontend

## 🔧 Common Commands
```bash
# Start everything
docker-compose up -d

# Watch backend logs
docker-compose logs -f backend

# Test endpoint
curl -X GET http://localhost:8000/api/v1/sessions \
  -H "Authorization: Bearer {token}"

# Apply migration
docker exec musictracker-db psql -U postgres -d musictracker -f /path/to/migration.sql
```

## 📁 Key Locations
- Backend models: `/backend/app/models/`
- API endpoints: `/backend/app/api/v1/endpoints/`
- Frontend services: `/mobile-app/src/services/`
- Screens: `/mobile-app/src/screens/`
- Redux slices: `/mobile-app/src/store/slices/`

## 🎯 Current Sprint Focus
1. **Forum Enhancement Phase 3**: Frontend for "Currently Working On"
2. **Slow Practice Enforcer**: Points display & achievements UI
3. **Practice Focus System**: Rename segments → focuses

## 🐛 Quick Fixes
| Error | Solution |
|-------|----------|
| 404 on new endpoint | Check api.py router registration |
| 500 serialization | Convert SQLAlchemy → Pydantic |
| Import not found | Check Expo/RN compatibility |
| Navigation undefined | Use `navigation?.navigate()` |
| GET endpoint error | Use Query params, not body |

## 📊 Development Workflow
1. Create migration → Apply to DB
2. Update models → Update schemas  
3. Create endpoint → Register in api.py
4. Test with curl → Update service
5. Update UI → Test on device

---
For detailed patterns: See `CLAUDE_CRITICAL.md`
For API details: See `API_PATHS_AND_VARIABLES.md`