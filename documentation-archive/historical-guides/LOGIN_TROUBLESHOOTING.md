# Login Troubleshooting Guide

## Issue: "Login failed network error, please check your connection"

This error indicates the mobile app cannot reach the backend API. Here's how to fix it:

## 1. Check Backend is Running

```bash
# From music-tracker directory
docker-compose ps
```

All services should show as "Up". If not:
```bash
docker-compose up -d
```

## 2. Verify API is Accessible

Test from your host machine:
```bash
# Try localhost
curl http://localhost:8000/api/v1/health

# If using WSL2, also try:
curl http://172.17.0.1:8000/api/v1/health
```

## 3. Update Mobile App Configuration

### For Physical Device:
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
   - Should be something like `192.168.x.x`

2. Update `.env` file in mobile-app directory:
```
EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api/v1
```

3. Restart Expo:
```bash
npx expo start -c
```

### For Android Emulator:
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
```

### For iOS Simulator:
```
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 4. Common Issues & Solutions

### Issue: IP Address Changed
- Your computer's IP can change when you reconnect to WiFi
- Always verify current IP before testing

### Issue: Firewall Blocking
- Windows Firewall may block port 8000
- Add exception for Docker Desktop or port 8000

### Issue: Backend Container Network
- Ensure backend is bound to 0.0.0.0, not 127.0.0.1
- Check docker-compose.yml has correct port mapping: "8000:8000"

### Issue: App Crashes Before Login
- Check console logs in Expo
- Fixed in this session: removed unsupported `gap` CSS property
- Ensure all dependencies are installed: `npm install`

## 5. Debug Steps

1. Open Expo console and look for errors
2. Check browser developer tools if using web
3. Add console.log to auth service (already added)
4. Use the TestConnectionScreen (if needed) to verify connectivity

## 6. Quick Test

Create a test user:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123",
    "full_name": "Test User",
    "role": "student"
  }'
```

Then try logging in with:
- Email: test@test.com
- Password: test123