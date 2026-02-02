# CI/CD Setup Guide

This project uses **GitHub Actions** to automatically build and release the macOS app whenever code is pushed to the main branch.

## 🚀 What Happens Automatically

When you push code to `main` or `master`:

1. ✅ GitHub Actions triggers automatically
2. ✅ macOS runner builds the app
3. ✅ `.dmg` and `.zip` files are created
4. ✅ Release is published to GitHub Releases
5. ✅ Download link is updated in README

## 📥 How Users Download

### **For Users (Simple)**

1. Go to: `https://github.com/YOUR_USERNAME/REPO_NAME/releases`
2. Click on the **"Latest"** release
3. Download `FocusBar-vX.X.X.dmg`
4. Install and run!

### **Direct Download Link**

Latest release is always available at:
```
https://github.com/YOUR_USERNAME/REPO_NAME/releases/tag/latest
```

## 🔧 How It Works

### Workflow Files

1. **`.github/workflows/build-and-release.yml`** - Main workflow
   - Triggers on push to main
   - Builds unsigned macOS app
   - Creates/updates "latest" release
   - Uploads .dmg and .zip files

2. **`.github/workflows/build-pr.yml`** - Pull Request workflow
   - Builds on PRs for testing
   - Uploads artifacts (7 day retention)
   - Comments on PR with build status

### Build Process

```
Push to main
    ↓
GitHub Actions starts
    ↓
Checkout code
    ↓
Install Node.js 18
    ↓
npm ci (install deps)
    ↓
npm run build-mac
    ↓
Upload artifacts
    ↓
Create GitHub Release
    ↓
Update README link
```

## ⚙️ Setup Instructions

### 1. Push Code to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# Add your GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/FocusBar.git
git push -u origin main
```

### 2. Verify Workflow is Running

1. Go to your GitHub repo
2. Click **"Actions"** tab
3. You should see the workflow running
4. Wait ~5-10 minutes for build to complete

### 3. First Release

After the first successful build:

1. Go to **Releases** section in your repo
2. You'll see a **"latest"** release
3. The .dmg file is attached
4. Copy the download URL

### 4. Update README

Update the download badge in README.md:

```markdown
## 📥 Download

[![Download Latest](https://img.shields.io/badge/Download-Latest%20Release-blue)](https://github.com/YOUR_USERNAME/FocusBar/releases/tag/latest)

**Direct Download:** [FocusBar-latest.dmg](https://github.com/YOUR_USERNAME/FocusBar/releases/download/latest/FocusBar-v1.0.0.dmg)
```

## 🔒 Code Signing (Optional)

The current build is **unsigned**. Users will see a security warning.

To sign the app, you need an **Apple Developer Account** ($99/year):

### Setup Code Signing

1. Join [Apple Developer Program](https://developer.apple.com/)
2. Create certificates in Apple Developer Portal
3. Add secrets to GitHub:
   - `APPLE_ID`
   - `APPLE_ID_PASSWORD`
   - `CSC_LINK` (base64 encoded certificate)
   - `CSC_KEY_PASSWORD`

4. Update workflow:
```yaml
env:
  CSC_LINK: ${{ secrets.CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
```

## 📝 Version Management

### Automatic Versioning

The workflow uses the version from `package.json`:

```json
{
  "version": "1.0.0"
}
```

### Release Tags

- **Every push to main:** Updates the "latest" release
- **Git tags (v*.*.*):** Creates a new versioned release

Create a versioned release:
```bash
npm version patch  # or minor, major
git push --follow-tags
```

## 🐛 Troubleshooting

### Build Fails

Check the Actions log:
1. Go to **Actions** tab
2. Click on the failed workflow
3. Check the logs for errors

Common issues:
- **Dependencies:** Make sure `package.json` is correct
- **Build script:** Verify `npm run build-mac` works locally
- **Resources:** Check all files in `build.files` array exist

### Release Not Created

- Check you have **write permissions** to the repo
- Verify `GITHUB_TOKEN` is available (it's automatic)
- Check the artifact upload step succeeded

### DMG Not Found

The workflow looks for:
```
dist/FocusBar-X.X.X.dmg
```

Make sure your `package.json` product name matches.

## 🎯 Advanced Configuration

### Custom Build Triggers

Edit `.github/workflows/build-and-release.yml`:

```yaml
on:
  push:
    branches: [ main ]  # Only build on main
    paths-ignore:       # Don't build on docs changes
      - '**.md'
      - 'docs/**'
  schedule:             # Nightly builds
    - cron: '0 0 * * *'
```

### Multi-Platform Builds

Enable Windows builds by setting `if: true`:

```yaml
build-windows:
  runs-on: windows-latest
  if: true  # Enable Windows
```

### Custom Release Notes

Add a `CHANGELOG.md` file:

```markdown
# Changelog

## [1.0.0] - 2024-01-15
### Added
- Initial release
- Timer functionality
- Task management
```

The workflow will include this in release notes.

## 📊 Monitoring

### Build Status Badge

Add to README.md:
```markdown
![Build Status](https://github.com/YOUR_USERNAME/FocusBar/workflows/Build%20and%20Release/badge.svg)
```

### Download Stats

GitHub shows download counts for each release.

## 🚀 Next Steps

1. ✅ Push code to GitHub
2. ✅ Verify first build succeeds
3. ✅ Test download link works
4. ✅ Share download URL with users
5. 🔄 Setup code signing (optional)
6. 🔄 Add Windows builds (optional)
7. 🔄 Automate changelog generation (optional)

---

**Your app will now build and release automatically on every code push!** 🎉
