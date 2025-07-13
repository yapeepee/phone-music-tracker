# 🎯 API Paths and Variables Reference (Compact)

> **⚠️ CRITICAL**: Frontend/backend variable names MUST match EXACTLY!

## 📍 Base URLs
- Frontend: `process.env.EXPO_PUBLIC_API_URL = http://192.168.x.x:8000/api/v1`
- Backend: `http://localhost:8000/api/v1`

## 🔐 Authentication
| Method | Path | Request/Response |
|--------|------|------------------|
| POST | `/auth/register` | {email, password, full_name, role, timezone?} |
| POST | `/auth/login` | {email, password} → {user, tokens} |
| POST | `/auth/refresh` | {refresh_token} → {access_token, token_type} |
| GET | `/auth/me` | → User object |
| PUT | `/auth/push-token` | {push_token, platform} |

## 📝 Sessions
| Method | Path | Parameters |
|--------|------|------------|
| GET | `/sessions/` | skip?, limit?, start_date?(ISO), end_date?(ISO) |
| POST | `/sessions/` | {focus?, start_time, tags[], target_tempo?, practice_mode?} |
| GET | `/sessions/{id}` | - |
| PUT | `/sessions/{id}` | {focus?, end_time?, self_rating?, note?, tags?} |
| DELETE | `/sessions/{id}` | - |
| GET | `/sessions/statistics` | days? |
| GET | `/sessions/search` | q(required), skip?, limit? |

## 🎥 Videos
| Method | Path | Notes |
|--------|------|-------|
| POST | `/videos/upload-multipart/{session_id}` | Form field: 'video', Auth required |
| GET | `/videos/session/{session_id}` | Returns videos with presigned URLs |
| GET | `/videos/{video_id}` | Single video with URL |
| DELETE | `/videos/{video_id}` | - |

## 🏷️ Tags & Pieces
| Method | Path | Notes |
|--------|------|-------|
| GET | `/tags/` | skip?, limit? |
| POST | `/tags/` | {name, color?, tag_type?, composer?, difficulty_level?} |
| GET | `/tags/popular` | limit? |
| GET | `/tags/pieces` | tag_type?, skip?, limit? |

## 💬 Forum
| Method | Path | Key Params |
|--------|------|------------|
| GET | `/forum/posts/` | tag?, status?, sort_by?, search?, related_piece_id? |
| POST | `/forum/posts/` | {title, content, tags[], related_piece_id?} |
| GET | `/forum/posts/{id}` | - |
| PUT | `/forum/posts/{id}` | {title?, content?, status?} |
| DELETE | `/forum/posts/{id}` | - |
| POST | `/forum/posts/{id}/vote` | {vote_type: 1\|-1} |
| POST | `/forum/posts/{id}/comments/` | {content, parent_id?} |

## 🎼 Practice Segments
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/practice-segments/pieces` | Get student's pieces |
| GET | `/practice-segments/pieces/{id}/segments` | Get piece segments |
| POST | `/practice-segments/segments` | {piece_tag_id, name, description?} |
| POST | `/practice-segments/segments/click` | {segment_id, session_id?, click_count?} |
| POST | `/practice-segments/pieces/{id}/archive` | Archive piece |
| GET | `/practice-segments/pieces/archived` | Get archived pieces |
| GET | `/practice-segments/analytics/overview` | Get overall practice focus analytics (days? param) |

## 🎯 Current Pieces (NEW)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/current-pieces/` | skip?, limit? → ordered by priority |
| POST | `/current-pieces/{piece_id}` | {notes?, priority?(1-5)} |
| PUT | `/current-pieces/{piece_id}` | {notes?, priority?} |
| DELETE | `/current-pieces/{piece_id}` | Remove from current |
| GET | `/current-pieces/piece-user-counts` | Get user counts per piece |
| GET | `/current-pieces/stats/summary` | Get summary stats |

## 📅 Schedule
| Method | Path | Key Params |
|--------|------|------------|
| GET | `/schedule/` | start_date?, end_date?, event_type?, status? |
| POST | `/schedule/` | {title, start_datetime, end_datetime, participants[]} |
| GET | `/schedule/calendar` | start_date(required), end_date(required) |

## 🏆 Challenges & Reputation
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/challenges/` | type?, status? |
| GET | `/reputation/leaderboard` | skip?, limit? |
| GET | `/reputation/users/{id}/reputation` | User reputation |

## 🔔 Notifications
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/notifications/` | unread_only?, skip?, limit? |
| PUT | `/notifications/{id}/read` | Mark as read |
| GET | `/notification-preferences/` | Get preferences |
| PUT | `/notification-preferences/` | Update preferences |

## 🐢 Tempo Tracking
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/tempo/tracking` | {session_id, tempo_bpm, accuracy_percentage} |
| GET | `/tempo/tracking/{session_id}` | Get session tempo data |
| GET | `/tempo/achievements` | Get user achievements |

## ⏱️ Timer
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/timer/start` | {session_id} → timer_id |
| POST | `/timer/{timer_id}/pause` | Record pause |
| POST | `/timer/{timer_id}/resume` | Resume timer |
| POST | `/timer/{timer_id}/stop` | Stop and get duration |

## 🤝 Practice Partners (NEW)
| Method | Path | Key Params |
|--------|------|------------|
| GET | `/practice-partners/availability` | Get user's availability |
| POST | `/practice-partners/availability` | {day_of_week, start_time, end_time, timezone} |
| DELETE | `/practice-partners/availability/{id}` | Delete availability slot |
| GET | `/practice-partners/preferences` | Get partner preferences |
| PUT | `/practice-partners/preferences` | Update preferences |
| POST | `/practice-partners/discover` | {piece_id?, timezone_diff?, skill_level?} |
| GET | `/practice-partners/matches` | status?, skip?, limit? |
| POST | `/practice-partners/matches` | {partner_id, piece_id, message?} |
| PUT | `/practice-partners/matches/{id}` | {status, partner_message?} |
| GET | `/practice-partners/matches/{id}/compatible-times` | Find overlapping availability |

## 🔍 Key Variable Mappings

### Session Fields
- Frontend: `studentId` → Backend: `student_id`
- Frontend: `startTime` → Backend: `start_time`
- Frontend: `endTime` → Backend: `end_time`
- Frontend: `selfRating` → Backend: `self_rating`
- Frontend: `createdAt` → Backend: `created_at`

### Practice Partner Fields
- Backend DB: `preferred_communication` (NOT communication_preference)
- Backend Model: `preferred_communication`
- Frontend: `communication_preference` (enum values)

### Common Response Fields
- `created_at`, `updated_at` (ISO datetime)
- `id` (UUID string)
- Lists: `{items: [], total: number, page: number, page_size: number}`

### Status Enums
- ProcessingStatus: `pending`, `processing`, `completed`, `failed`
- PostStatus: `draft`, `published`, `closed`, `deleted`
- EventStatus: `scheduled`, `confirmed`, `cancelled`, `completed`

---
**Remember**: Check request/response types in service files for exact field names!