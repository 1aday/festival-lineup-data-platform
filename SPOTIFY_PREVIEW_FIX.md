# Spotify Preview URL Issue & Solutions

## The Problem
Spotify has restricted `preview_url` availability when using Client Credentials authentication flow. This is a widespread issue affecting many developers since 2023.

## Why This Happens
1. **Authentication Method**: Client Credentials flow (app-to-app auth) has limited access to preview URLs
2. **Licensing**: Preview URLs are region-restricted and tied to user accounts
3. **Market Restrictions**: Different markets have different preview availability

## Current Status
- Most tracks return `preview_url: null` with Client Credentials
- This is **NOT a bug in our code** - it's a Spotify API limitation
- Affects all artists globally when using app authentication

## Solutions

### 1. Use Authorization Code Flow (Requires User Login)
```javascript
// This requires implementing OAuth with user login
// Users would need to authenticate with their Spotify account
// This gives access to more preview URLs based on user's market
```

### 2. Alternative Audio Sources
- Use YouTube API for preview clips
- Integrate with Apple Music API
- Use Deezer API (has better preview availability)

### 3. Spotify Embed Player (Current Fallback)
```javascript
// We can show the Spotify embed player which handles auth internally
// But this doesn't give us direct MP3 control
<iframe src={`https://open.spotify.com/embed/track/${trackId}`} />
```

### 4. Market Rotation (Already Implemented)
```javascript
// Try multiple markets to find preview URLs
const markets = ['US', 'GB', 'NL', 'DE', 'FR', 'ES'];
// This helps but doesn't solve the core issue
```

## What We're Doing Now
1. Trying multiple markets to maximize preview URL availability
2. Caching any preview URLs we do find
3. Showing "No preview available" when none found
4. Providing Spotify link as fallback

## Important Notes
- This is **NOT** a bug in our implementation
- Spotify has intentionally limited preview URLs for Client Credentials
- The only full solution is to use Authorization Code flow with user authentication

## Testing
To verify this is a Spotify issue, not our code:
```bash
# Get access token
curl -X POST https://accounts.spotify.com/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET"

# Get top tracks (preview_url will be null for most)
curl https://api.spotify.com/v1/artists/ARTIST_ID/top-tracks?market=US \
  -H "Authorization: Bearer TOKEN"
```

## References
- [Spotify Community: Missing Preview URLs](https://community.spotify.com/t5/Spotify-for-Developers/Missing-Preview-URL-using-Client-Credentials/td-p/6492694)
- [GitHub Issue #1529](https://github.com/spotify/web-api/issues/1529)
- [GitHub Issue #148](https://github.com/spotify/web-api/issues/148)
