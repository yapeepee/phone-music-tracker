# Session Creation Greenlet Fix

## Problem
Session creation was failing with a 500 error, causing users to fall back to offline mode even when connected to the internet.

## Error
```
MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here. 
Was IO attempted in an unexpected place?
```

This occurred when `PracticeSession.model_validate(session)` tried to access the `tags` relationship field.

## Root Cause
After creating a session, the SQLAlchemy model's `tags` relationship wasn't eagerly loaded. When Pydantic's `model_validate` tried to access it, it triggered a lazy load in an async context without proper greenlet setup.

## Solution
Modified `SessionService.create_session()` to query the session back with eager loading:

```python
# Query back with eager loading to avoid greenlet issues
query = select(PracticeSession).where(
    PracticeSession.id == db_session.id
).options(
    selectinload(PracticeSession.tags)
)
result = await self.db.execute(query)
return result.scalar_one()
```

## Impact
- Sessions can now be created successfully when online
- Users will get UUID session IDs when connected
- Videos will be properly linked to backend sessions
- No more fallback to offline mode when API is accessible

## Related Files
- `/backend/app/services/practice/session_service.py` - Fixed eager loading
- `/backend/app/api/v1/sessions.py` - Endpoint that was failing
- `/mobile-app/src/store/slices/practiceSlice.ts` - Hybrid session creation logic