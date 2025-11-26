# Troubleshooting Guide

## Port 5000 Already in Use

If you see the error `EADDRINUSE: address already in use 127.0.0.1:5000`, use one of these solutions:

### Solution 1: Use the Clean Start Script (Recommended)
```bash
npm run dev:clean
```

This will automatically kill any process on port 5000 and start the dev servers.

### Solution 2: Manually Kill the Process
```bash
npm run kill-port
```

Then start normally:
```bash
npm run dev
```

### Solution 3: Manual PowerShell Command
```powershell
# Find the process
netstat -ano | findstr :5000

# Kill it (replace PID with the actual process ID)
taskkill /F /PID <PID>
```

## Server Stability

The server now includes:
- **Graceful shutdown**: Properly closes connections on CTRL+C
- **Error handling**: Clear error messages for port conflicts
- **Auto-cleanup**: Prevents zombie processes

## Common Issues

### Vite Proxy Error: `ECONNREFUSED ::1:5000`

**Symptom**: Repeated errors like:
```
[dev:web] http proxy error: /api/gallery/images
[dev:web] Error: connect ECONNREFUSED ::1:5000
```

**Root Cause**: Vite is trying to connect via IPv6 (`::1`) but the server was only listening on IPv4 (`127.0.0.1`).

**Solution**: The server now listens on all interfaces (both IPv4 and IPv6). Restart the dev servers:

```bash
# Stop current servers (CTRL+C)
# Then restart
npm run dev:clean
```

**Verify Fix**:
```powershell
netstat -ano | findstr :5000
```
You should see the server listening on `[::]:5000` or both `127.0.0.1:5000` and `[::1]:5000`.

### Vite keeps restarting
- This happens when `.env` file is being modified
- Wait for changes to complete before refreshing the browser

### Gallery images not loading
- Ensure the API server is running on port 5000
- Check that `data/gallery/` directory exists
- Verify image paths in the browser console

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Check that `tsconfig.json` is properly configured

### Server starts but Vite can't connect
1. Check if server is actually running: `netstat -ano | findstr :5000`
2. Verify server logs show "Listening on all interfaces"
3. Try accessing API directly: `http://localhost:5000/api/gallery/images`
4. If API works but Vite doesn't, restart Vite: Stop and run `npm run dev:web`
