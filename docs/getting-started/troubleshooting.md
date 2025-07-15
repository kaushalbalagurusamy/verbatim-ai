# Troubleshooting Guide
Common issues and solutions for Verbatim AI.

## Common Issues

### Port Already in Use

If port 8080 is occupied:

```bash
# Find process using port 8080
# On macOS/Linux:
lsof -i :8080

# On Windows:
netstat -ano | findstr :8080

# Kill the process or use a different port:
VITE_APP_PORT=3000 pnpm dev
```

### Dependency Installation Failures

#### Clear cache and reinstall:
```bash
# For pnpm
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install

# For npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Permission errors on macOS/Linux:
```bash
# Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### TypeScript Errors

If you see TypeScript errors:

1. Ensure you're using Node.js 20+
2. Restart the TypeScript service:
   - VS Code: `Ctrl/Cmd + Shift + P` → "TypeScript: Restart TS Server"
3. Clear TypeScript cache:
   ```bash
   rm -rf node_modules/.cache/typescript
   ```

### Build Failures

For production build issues:

```bash
# Clean build cache
rm -rf dist .vite

# Rebuild
pnpm build

# Test production build locally
pnpm preview
```

## Platform-Specific Issues

### Windows Issues

#### Path Length Limitations
Windows has a 260-character path limit. If you encounter errors:
1. Enable long paths in Windows:
   ```powershell
   # Run as Administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```
2. Or move project closer to drive root (e.g., `C:\verbatim-ai`)

#### Line Ending Issues
Configure Git to handle line endings:
```bash
git config --global core.autocrlf true
```

### macOS Issues

#### Command Line Tools
If you see "xcrun" or similar errors:
```bash
xcode-select --install
```

#### M1/M2 Silicon Issues
Some dependencies may need Rosetta:
```bash
softwareupdate --install-rosetta
```

### Linux Issues

#### Missing Dependencies
Install build essentials:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential

# Fedora
sudo dnf groupinstall "Development Tools"
```

## Development Server Issues

### Server Won't Start

1. Check if port is available:
   ```bash
   curl http://localhost:8080
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be 20+
   ```

3. Verify dependencies installed:
   ```bash
   ls node_modules  # Should list packages
   ```

### Hot Reload Not Working

1. Check file watchers limit (Linux):
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. Restart development server:
   ```bash
   # Stop with Ctrl+C, then:
   pnpm dev
   ```

## Browser Issues

### Blank Page

1. Check browser console (F12) for errors
2. Clear browser cache and cookies
3. Try incognito/private mode
4. Disable browser extensions

### WebSocket Errors

If you see WebSocket connection failures:
1. Check firewall settings
2. Ensure no proxy is blocking connections
3. Try different browser

## Environment Issues

### Missing Environment Variables

1. Verify `.env.local` exists:
   ```bash
   ls -la | grep env
   ```

2. Check file contents:
   ```bash
   cat .env.local
   ```

3. Restart dev server after changes

### Wrong Node Version

Use nvm to manage versions:
```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Use correct version
nvm install 20
nvm use 20
```

## Getting Help

If these solutions don't work:
1. **Check Logs**: Look for error messages in terminal and browser console
2. **Search Issues**: Check [GitHub Issues](https://github.com/your-org/verbatim-ai/issues)
3. **Ask Community**: Join our [Discord Server](https://discord.gg/verbatim-ai)
4. **Report Bug**: Create issue with error details and steps to reproduce

Most issues are environment-specific and resolved by ensuring prerequisites are properly installed.