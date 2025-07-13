# WSL2 Quick Fix for Phone Testing 📱

## Step 1: Find Your Windows IP Address

1. **On Windows** (not in WSL), open Command Prompt
2. Run: `ipconfig`
3. Find your **Wi-Fi adapter** section
4. Look for **IPv4 Address** (e.g., `192.168.1.100` or `10.0.0.100`)
5. **Write this down** - this is YOUR_WINDOWS_IP

## Step 2: Update Your App Configuration

In WSL terminal:
```bash
cd /home/dialunds/music-tracker/mobile-app

# Edit .env file
nano .env
```

Change the API URL to use YOUR Windows IP:
```
EXPO_PUBLIC_API_URL=http://YOUR_WINDOWS_IP:8000/api/v1
```

Example:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

## Step 3: Set Up Port Forwarding

**Open Windows PowerShell as Administrator** and run these commands:

```powershell
# Replace 172.26.153.150 with your actual WSL IP if different

# Forward Backend API
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.26.153.150

# Forward Expo
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=172.26.153.150

# Check if it worked
netsh interface portproxy show all
```

## Step 4: Update Backend CORS

In WSL, edit the backend to allow your Windows IP:
```bash
cd /home/dialunds/music-tracker/backend
nano app/main.py
```

Add your Windows IP to allowed_origins and allowed_hosts:
```python
allow_origins=[
    # ... existing origins ...
    "http://YOUR_WINDOWS_IP:8081",
    "http://YOUR_WINDOWS_IP:19000",
    "http://YOUR_WINDOWS_IP:19006",
],

allowed_hosts=["localhost", "127.0.0.1", "172.26.153.150", "YOUR_WINDOWS_IP"],
```

## Step 5: Restart Everything

```bash
# Restart backend
docker-compose restart backend

# Start Expo with your Windows IP
cd /home/dialunds/music-tracker/mobile-app
export REACT_NATIVE_PACKAGER_HOSTNAME=YOUR_WINDOWS_IP
npx expo start
```

## Step 6: Connect Your Phone

1. Make sure your phone is on the **same Wi-Fi network**
2. Open **Expo Go** app
3. **Manually enter URL** if QR code doesn't work:
   ```
   exp://YOUR_WINDOWS_IP:8081
   ```

## Quick Test

From Windows Command Prompt:
```cmd
# Test backend is accessible
curl http://localhost:8000/health
```

Should return: `{"status":"healthy"}`

## If It Doesn't Work

1. **Windows Firewall**: 
   - Go to Windows Security
   - Firewall & network protection
   - Allow an app
   - Enable Node.js and Docker Desktop

2. **Try Alternative Port**:
   ```powershell
   # Use 3000 instead of 8000
   netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.26.153.150
   ```
   Then use `http://YOUR_WINDOWS_IP:3000/api/v1` in .env

3. **Last Resort - Use Web Version**:
   - In Expo terminal, press `w`
   - Opens in browser at localhost:19006
   - Good for testing UI, but video recording won't work

## Example with Real IPs

If your Windows IP is `192.168.1.100`:

1. `.env` file:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
   ```

2. PowerShell commands:
   ```powershell
   netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.26.153.150
   netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=172.26.153.150
   ```

3. Start Expo:
   ```bash
   export REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.100
   npx expo start
   ```

4. On phone in Expo Go:
   ```
   exp://192.168.1.100:8081
   ```

This should work! 🚀