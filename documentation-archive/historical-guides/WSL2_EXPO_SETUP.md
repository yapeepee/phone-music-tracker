# WSL2 Expo Mobile Connection Guide 🔧

## The Problem
WSL2 runs in a virtualized network environment that your phone cannot directly access. The IP `172.26.153.150` is only accessible from your Windows host.

## Solution Options

### Option 1: Use Expo Tunnel (Easiest) ⭐
This creates a public URL that works from anywhere:

```bash
cd /home/dialunds/music-tracker/mobile-app
npx expo start --tunnel
```

**Pros**: 
- Works immediately
- No network configuration needed
- Works even on different networks

**Cons**:
- Slightly slower than local connection
- Requires internet connection

### Option 2: Port Forwarding (Faster)

#### Step 1: Find Your Windows IP
On Windows (not WSL), open Command Prompt and run:
```cmd
ipconfig
```

Look for your Wi-Fi adapter's IPv4 Address (e.g., `192.168.1.100`)

#### Step 2: Update Mobile App Config
Edit `/home/dialunds/music-tracker/mobile-app/.env`:
```bash
# Replace with YOUR Windows IP (from ipconfig)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

#### Step 3: Set Up Port Forwarding
In Windows PowerShell (Run as Administrator):
```powershell
# Forward Expo ports
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=172.26.153.150
netsh interface portproxy add v4tov4 listenport=19000 listenaddress=0.0.0.0 connectport=19000 connectaddress=172.26.153.150
netsh interface portproxy add v4tov4 listenport=19001 listenaddress=0.0.0.0 connectport=19001 connectaddress=172.26.153.150

# Forward backend port
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.26.153.150

# Check forwarding rules
netsh interface portproxy show all
```

#### Step 4: Configure Expo for Windows IP
In WSL terminal:
```bash
# Replace with YOUR Windows IP
export REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.100
cd /home/dialunds/music-tracker/mobile-app
npx expo start
```

#### Step 5: Update Backend CORS
Add your Windows IP to allowed origins in `backend/app/main.py`

### Option 3: Use ngrok (Alternative Tunnel)

1. Install ngrok in WSL:
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

2. Start backend and expose it:
```bash
# In one terminal
docker-compose up -d

# In another terminal
ngrok http 8000
```

3. Use the ngrok URL in your mobile app

## Quick Test Commands

### Test Port Forwarding (from Windows CMD):
```cmd
curl http://localhost:8000/health
```

### Remove Port Forwarding (if needed):
```powershell
netsh interface portproxy delete v4tov4 listenport=8081 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=19000 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=19001 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0
```

## Recommended Approach for Testing

**For quick testing**: Use Option 1 (Expo Tunnel)
```bash
cd /home/dialunds/music-tracker/mobile-app
npx expo start --tunnel
```

This will:
1. Start Expo with tunnel mode
2. Generate a public URL (like `exp://xx-xxx-xx-xxx.exp.direct`)
3. Show QR code that works from anywhere
4. Your phone can connect regardless of network setup

## Windows Firewall

If connection still fails, check Windows Firewall:
1. Windows Security > Firewall & network protection
2. Allow an app through firewall
3. Add Node.js and Docker Desktop

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Network request failed" | Use tunnel mode or check port forwarding |
| "Metro bundler not found" | Ensure Expo is running in WSL |
| "Invalid Host Header" | Backend needs Windows IP in allowed hosts |
| Slow connection | Tunnel mode is slower, try port forwarding |

Remember: WSL2 networking can be tricky, but tunnel mode usually "just works"!