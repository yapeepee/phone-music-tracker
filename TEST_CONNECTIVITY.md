# Network Connectivity Test

## Quick Test Steps

1. **First, verify your computer's IP address:**
   ```bash
   # On Linux/Mac:
   ip addr show | grep 192.168
   # Or:
   ifconfig | grep 192.168
   
   # On Windows:
   ipconfig | findstr 192.168
   ```

2. **Test from your mobile device's browser:**
   - Open your phone's browser
   - Go to: `http://192.168.8.196:8000/api/v1/health`
   - You should see: `{"status":"ok","message":"API is running"}`
   
   If this doesn't work, then:
   - Your IP might have changed
   - Your phone might be on a different network (check WiFi)
   - A firewall might be blocking port 8000

3. **Test with curl from your computer:**
   ```bash
   curl http://192.168.8.196:8000/api/v1/health
   ```

4. **Update the .env file if your IP changed:**
   ```bash
   # In mobile-app/.env
   EXPO_PUBLIC_API_URL=http://YOUR_NEW_IP:8000/api/v1
   ```

5. **After updating .env, restart Expo:**
   ```bash
   cd mobile-app
   # Stop with Ctrl+C
   npm start
   ```

## Common Issues:

1. **Phone on different network**: Make sure both your computer and phone are on the same WiFi network

2. **Firewall blocking**: On Linux, you might need to allow port 8000:
   ```bash
   sudo ufw allow 8000
   ```

3. **IP address changed**: Router might have assigned a new IP to your computer

4. **Docker not exposing ports**: Check with:
   ```bash
   docker-compose ps
   # Should show: 0.0.0.0:8000->8000/tcp
   ```

## Forum Media Issues

The forum media loading issue was already fixed. The problem was that the forum endpoints weren't including media files. This has been resolved by updating the backend to properly generate presigned URLs for all media files.