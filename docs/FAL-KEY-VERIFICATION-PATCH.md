# FAL API Key Verification Patch

## Quick Fix: Add Logging to Verify Which Key is Used

If you want to see **exactly** which FAL API key is being used at runtime, apply this patch:

---

## Patch for `src/services/fal.ts`

### Current Code (Lines 7-10):

```typescript
// Configure fal.ai client with API key
fal.config({
    credentials: process.env.FAL_KEY || '',
});
```

### Modified Code with Verification:

```typescript
// Configure fal.ai client with API key
const falKey = process.env.FAL_KEY || '';

// ===== DIAGNOSTIC LOGGING =====
console.log('\n========================================');
console.log('🔑 FAL.ai API Key Configuration');
console.log('========================================');
console.log('Loaded from:', process.env.FAL_KEY ? '.env file' : 'NOT FOUND');
console.log('Key ID (first 20 chars):', falKey.substring(0, 20) + '...');
console.log('Full key available:', falKey.length > 0 ? 'Yes' : 'No');
console.log('Key format valid:', falKey.includes(':') ? 'Yes (key_id:secret)' : 'No');

if (!falKey) {
    console.error('❌ WARNING: No FAL_KEY found! Image generation will fail.');
} else {
    const [keyId, keySecret] = falKey.split(':');
    console.log('Key ID:', keyId);
    console.log('Secret:', keySecret ? `${keySecret.substring(0, 4)}...` : 'MISSING');
}
console.log('========================================\n');
// ===== END DIAGNOSTIC LOGGING =====

fal.config({
    credentials: falKey,
});
```

---

## What This Will Show

When you restart your server, you'll see:

### ✅ Correct Configuration:
```
========================================
🔑 FAL.ai API Key Configuration
========================================
Loaded from: .env file
Key ID (first 20 chars): 2dcd76a9-7b2e-4b9b-9...
Full key available: Yes
Key format valid: Yes (key_id:secret)
Key ID: 2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d
Secret: 0304...
========================================
```

### ❌ Wrong Configuration:
```
========================================
🔑 FAL.ai API Key Configuration
========================================
Loaded from: NOT FOUND
Key ID (first 20 chars): ...
Full key available: No
Key format valid: No
❌ WARNING: No FAL_KEY found! Image generation will fail.
========================================
```

---

## How to Apply This Patch

### Option 1: Edit Manually

1. Open `src/services/fal.ts`
2. Find lines 7-10
3. Replace with the modified code above
4. Save the file
5. Restart the server: `npm run dev`

### Option 2: Use Git Patch (if you want)

Save this as a `.patch` file and apply with `git apply`.

---

## Expected Output

After applying this patch, when you start the server with `npm run dev:api`, you'll see the FAL key diagnostic in the console **immediately** when the server starts.

This runs **once** when the `fal.ts` module is first imported.

---

## What to Check

Compare the output with your `.env` file:

```bash
# Show your current .env FAL_KEY
cat .env | grep FAL_KEY

# Example output:
# FAL_KEY=2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d:0304d391246a389ff679cd37812c9fd6
```

The Key ID in the diagnostic output should **exactly match** the first part of your FAL_KEY (before the `:`).

---

## Troubleshooting with This Patch

### Issue: Shows "NOT FOUND"

**Cause**: .env file not loaded before fal.ts imports

**Fix**:
1. Verify `src/server.ts` line 1 is: `import 'dotenv/config';`
2. Make sure this is **before** any other imports
3. Restart server

---

### Issue: Key ID doesn't match expectations

**Cause**: You might have:
- Multiple .env files
- System environment variable overriding .env
- .env file in wrong directory

**Fix**:
```bash
# Check which .env is being used
pwd  # Should be: /mnt/g/Upload_Post_Engine

# Check content
cat .env | grep FAL_KEY

# Check shell environment (shouldn't return anything)
echo $FAL_KEY
```

---

### Issue: Shows correct key, but still "different key" issue

**Possibilities**:
1. **Not a configuration issue** - The key IS correct, but you're looking at:
   - Wrong FAL.ai dashboard account
   - Cached billing data
   - Usage from a previous key

2. **Server not restarted** - After changing .env, you must restart:
   ```bash
   # Kill the server completely
   # Then restart
   npm run dev
   ```

3. **Multiple projects** - If you have multiple projects using FAL.ai:
   ```bash
   # Check other projects in parent directory
   find .. -name ".env" -exec grep -l "FAL_KEY" {} \;
   ```

---

## When to Remove This Logging

Once you've verified the correct key is loading, you can:

### Option 1: Keep it (Recommended for Development)

It's useful to see which key is being used when the server starts. Only shows once per startup.

### Option 2: Remove After Verification

Replace back with original simple version:

```typescript
// Configure fal.ai client with API key
fal.config({
    credentials: process.env.FAL_KEY || '',
});
```

### Option 3: Use Environment Variable to Control

```typescript
const falKey = process.env.FAL_KEY || '';

if (process.env.DEBUG_FAL_CONFIG === 'true') {
    console.log('🔑 FAL Key:', falKey.substring(0, 20) + '...');
}

fal.config({
    credentials: falKey,
});
```

Then enable/disable with:
```bash
# .env
DEBUG_FAL_CONFIG=true
```

---

## Additional Verification: Check API Usage

1. Go to https://fal.ai/dashboard
2. Navigate to "Usage" or "Billing"
3. Find recent API calls
4. Check which Key ID made those calls
5. Compare with your key: `2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d`

If the Key IDs match → Your configuration IS working correctly

If they don't match → You have a different issue (multiple accounts, cached data, etc.)

---

## Test After Applying Patch

```bash
# 1. Apply the patch to src/services/fal.ts

# 2. Restart server
npm run dev:api

# 3. Look for the diagnostic output in console:
# ========================================
# 🔑 FAL.ai API Key Configuration
# ========================================
# ...

# 4. Generate an image to test
# Use the UI or API to trigger image generation

# 5. Check console for image generation logs
```

---

**Related Files**:
- Main diagnostic: `docs/FAL-KEY-DIAGNOSTIC.md`
- Configuration file: `src/services/fal.ts`
- Environment file: `.env`
- Test script: `test-fal-config.cjs`
