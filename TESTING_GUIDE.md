# Music Practice Tracker - Testing Guide

## 🧪 Testing Mobile-Backend Connection

### Prerequisites
1. Ensure Docker is installed and running
2. Node.js and npm installed
3. Expo CLI installed globally: `npm install -g expo-cli`

### Step 1: Start Backend Services

```bash
# From project root
cd /home/dialunds/music-tracker

# Start all backend services
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs if needed
docker-compose logs -f backend
```

### Step 2: Verify Backend API

1. Open browser: http://localhost:8000
   - Should see: `{"message":"Music Practice Tracker API","version":"0.1.0","docs":"/api/v1/docs"}`

2. Check API docs: http://localhost:8000/api/v1/docs
   - Interactive Swagger UI should load

3. Test health endpoint:
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"healthy"}
   ```

### Step 3: Configure Mobile App

1. Update environment file if using physical device:
   ```bash
   cd mobile-app
   # Edit .env file
   # Replace localhost with your machine's IP address
   # Example: EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Step 4: Start Mobile App

```bash
# In mobile-app directory
npm start

# This will open Expo DevTools in your browser
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Or scan QR code with Expo Go app on physical device
```

### Step 5: Test Authentication Flow

1. **Register New User**:
   - Open app
   - Tap "Sign Up" on login screen
   - Fill in:
     - Full Name: Test User
     - Email: test@example.com
     - Password: password123
     - Select role: Student or Teacher
   - Tap "Sign Up"
   - Should navigate to home screen

2. **Verify Registration in Backend**:
   ```bash
   # Check backend logs
   docker-compose logs backend | grep "POST /api/v1/auth/register"
   
   # Or use API directly
   curl -X GET http://localhost:8000/api/v1/auth/me \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

3. **Test Logout/Login**:
   - Go to Profile tab
   - Tap Logout
   - Should return to login screen
   - Login with same credentials
   - Should navigate to home screen

4. **Test Token Refresh**:
   - App will automatically refresh tokens when they expire
   - Check network logs in browser DevTools

### Step 6: Test Practice Session (Offline)

1. **Create Session While Online**:
   - From home screen, tap "Start Practice Session"
   - Select focus area
   - Add tags
   - Start session
   - End session with rating and notes
   - Session should sync to backend

2. **Test Offline Mode**:
   - Enable airplane mode on device
   - Create another practice session
   - Session saves locally
   - Disable airplane mode
   - Session should auto-sync

### Common Issues & Solutions

#### CORS Error
- Backend is configured for localhost:3000, :19006, :8081
- Add your IP to CORS origins in docker-compose.yml if needed

#### Connection Refused
- Ensure backend is running: `docker-compose ps`
- Check firewall settings
- Use correct IP address (not localhost) for physical devices

#### Token Issues
- Clear app data/cache
- Check token expiry settings in backend
- Verify SECRET_KEY is set in backend .env

### Debugging Tips

1. **Mobile App Logs**:
   - Shake device or press Cmd+D (iOS) / Cmd+M (Android)
   - Select "Debug Remote JS"
   - Open browser console for logs

2. **Backend Logs**:
   ```bash
   # All services
   docker-compose logs -f
   
   # Just backend
   docker-compose logs -f backend
   
   # Database queries
   docker-compose logs -f postgres
   ```

3. **Network Inspection**:
   - Use React Native Debugger
   - Or browser DevTools Network tab
   - Check request/response payloads

### API Testing with cURL

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
    "role": "student"
  }'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get current user (replace TOKEN)
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Performance Monitoring

1. Check API response times in backend logs
2. Monitor Redux DevTools for state changes
3. Use React Native Performance Monitor
4. Check SQLite query performance

---

## 🚀 Next Steps After Testing

Once basic authentication is working:

1. Implement practice session API endpoints in backend
2. Test full offline/online sync cycle
3. Add video recording functionality
4. Implement analytics endpoints
5. Test with multiple users/roles

Remember to check PROJECT_PLAN.md for detailed implementation steps!