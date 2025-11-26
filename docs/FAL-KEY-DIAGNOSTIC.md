# FAL API Key Configuration Diagnostic

## Current Configuration Status

✅ **Your FAL_KEY is loading correctly from `.env`**

```
FAL_KEY=2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d:0304d391246a389ff679cd37812c9fd6
```

---

## How FAL.ai Credentials Work

### 1. The FAL SDK Auto-Detection System

The `@fal-ai/serverless-client` SDK automatically looks for credentials in this order:

```javascript
// From node_modules/@fal-ai/serverless-client/src/config.js
function credentialsFromEnv() {
    // Option 1: Single FAL_KEY
    if (typeof process.env.FAL_KEY !== "undefined") {
        return process.env.FAL_KEY;
    }

    // Option 2: Split key (FAL_KEY_ID + FAL_KEY_SECRET)
    if (typeof process.env.FAL_KEY_ID !== "undefined" &&
        typeof process.env.FAL_KEY_SECRET !== "undefined") {
        return `${process.env.FAL_KEY_ID}:${process.env.FAL_KEY_SECRET}`;
    }

    return undefined;
}
```

### 2. Your Configuration in `src/services/fal.ts`

```typescript
import * as fal from '@fal-ai/serverless-client';

// This runs when the module is first imported
fal.config({
    credentials: process.env.FAL_KEY || '',
});
```

**Key Point**: This configuration happens at **module load time**, which is when the server first imports `fal.ts`.

### 3. Loading Order in `src/server.ts`

```typescript
// Line 1: Load environment variables FIRST
import 'dotenv/config';

// Line 5-7: Then import services (which imports fal.ts)
import { orchestrator } from './services/runOrchestrator';
import { generateMomMarketingPrompts } from './services/openrouter';
import { generateImagesForMomPrompts } from './services/fal';
```

✅ **This order is correct** - dotenv loads before fal.ts imports

---

## Why You Might Think It's Using a Different Key

### Scenario 1: Server Not Restarted After .env Change

**Problem**: If you:
1. Changed the `FAL_KEY` value in `.env`
2. But didn't restart the server (`tsx watch` was already running)

**Solution**:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
# or
npm run dev:api
```

`tsx watch` does **NOT** reload environment variables when `.env` changes. You must restart.

---

### Scenario 2: Multiple .env Files

**Found .env files in your workspace**:
```
../BerndDatenschutz/.env
../Eliza/.env
../Upload_Post_Engine/.env  ← You are here
```

**Check**: Make sure you're editing the correct `.env` file:
```bash
# Verify you're in the right directory
pwd
# Should show: /mnt/g/Upload_Post_Engine

# Check the correct file
cat .env | grep FAL_KEY
```

---

### Scenario 3: System Environment Variables

**Check if FAL_KEY is set in your shell**:
```bash
# Check shell environment
env | grep FAL

# Check if set globally (Linux/Mac)
echo $FAL_KEY

# Check Windows PowerShell
$env:FAL_KEY
```

If these return values, they might override your `.env` file depending on how dotenv is configured.

---

### Scenario 4: Different Account/Billing

**Symptom**: You see API usage/billing on a different FAL.ai account than expected.

**Explanation**: The FAL_KEY format is:
```
{key_id}:{key_secret}
```

Your key: `2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d:0304d391246a389ff679cd37812c9fd6`

- Key ID: `2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d`
- Key Secret: `0304d391246a389ff679cd37812c9fd6`

**To verify which account this key belongs to**:
1. Log into https://fal.ai/dashboard
2. Go to Settings → API Keys
3. Check if this Key ID matches your expected account

---

## Diagnostic Tests

### Test 1: Verify .env is Loading

```bash
node -e "require('dotenv').config(); console.log('FAL_KEY:', process.env.FAL_KEY);"
```

**Expected Output**:
```
FAL_KEY: 2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d:0304d391246a389ff679cd37812c9fd6
```

✅ **PASSED** (verified in diagnostic)

---

### Test 2: Run Diagnostic Script

```bash
node test-fal-config.cjs
```

This script (included in project root) shows:
- What .env loads
- What the FAL SDK detects
- How fal.config() is called

✅ **PASSED** - Shows correct key is loaded

---

### Test 3: Check Server Startup

When you start the server with `npm run dev`, watch for any FAL-related errors:

```bash
npm run dev:api

# Watch for:
# ✅ No errors about FAL_KEY
# ❌ [ERROR] FAL_KEY environment variable is not set!
```

---

## How to Change the FAL API Key

### Step 1: Edit .env

```bash
# Edit the file
nano .env
# or
code .env

# Update the FAL_KEY line:
FAL_KEY=your_new_key_here
```

### Step 2: Restart the Server

**Important**: Must restart for changes to take effect!

```bash
# Stop server (Ctrl+C or Cmd+C)

# Restart
npm run dev
```

### Step 3: Verify New Key

```bash
# Quick test
node -e "require('dotenv').config(); console.log('FAL_KEY:', process.env.FAL_KEY);"
```

---

## Current Status Summary

| Check | Status | Value |
|-------|--------|-------|
| `.env` file exists | ✅ | `/mnt/g/Upload_Post_Engine/.env` |
| `FAL_KEY` is set | ✅ | `2dcd76a9...` (shown above) |
| dotenv loads before fal.ts | ✅ | Correct import order |
| FAL_KEY_ID in env | ❌ | Not set (not needed) |
| FAL_KEY_SECRET in env | ❌ | Not set (not needed) |
| Diagnostic test | ✅ | Passed |

---

## What the Code Actually Uses

When `generateImagesForMomPrompts()` is called:

```typescript
// src/services/fal.ts:126
const result = await fal.subscribe(modelId, {
    input: { ... }
});
```

This uses the credentials configured at line 8-10:

```typescript
fal.config({
    credentials: process.env.FAL_KEY || '',
});
```

Which resolves to:
```
2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d:0304d391246a389ff679cd37812c9fd6
```

---

## Troubleshooting Steps

If you still believe it's using the wrong key:

### 1. Add Logging to Verify

Edit `src/services/fal.ts` line 8-10:

```typescript
// Add logging
console.log('[FAL] Configuring with key:', process.env.FAL_KEY?.substring(0, 20) + '...');

fal.config({
    credentials: process.env.FAL_KEY || '',
});
```

### 2. Check FAL Dashboard

1. Go to https://fal.ai/dashboard
2. Check "Usage" or "Billing"
3. See which API key is generating requests
4. Compare Key ID with yours: `2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d`

### 3. Test with a Different Key

If you want to use a different FAL.ai account:

1. Generate a new API key at https://fal.ai/dashboard/keys
2. Update `.env`:
   ```
   FAL_KEY=new_key_id:new_key_secret
   ```
3. **Restart the server** (critical!)
4. Run a test generation

### 4. Environment Variable Priority

If still having issues, check environment variable precedence:

```bash
# 1. Check shell environment (highest priority)
echo $FAL_KEY

# 2. Check .env file (used by dotenv)
cat .env | grep FAL_KEY

# 3. Check if any startup scripts set it
cat ~/.bashrc | grep FAL
cat ~/.zshrc | grep FAL
```

---

## Proof That Configuration is Working

**Test performed**: `node test-fal-config.cjs`

**Result**:
```
FAL_KEY from .env: 2dcd76a9-7b2e-4b9b-9...
FAL_KEY_ID from env: NOT SET
FAL_KEY_SECRET from env: NOT SET
SDK will use FAL_KEY
Configured with: 2dcd76a9-7b2e-4b9b-9...

Full value: 2dcd76a9-7b2e-4b9b-9be7-b2dea678ca1d:0304d391246a389ff679cd37812c9fd6
```

✅ **Conclusion**: Your code IS using the FAL_KEY from `.env`

---

## Common Misconceptions

### ❌ Myth: "tsx watch reloads .env automatically"
**Reality**: No, you must restart the server for .env changes to take effect.

### ❌ Myth: "The FAL SDK uses a different env variable"
**Reality**: It looks for `FAL_KEY` first, then falls back to `FAL_KEY_ID` + `FAL_KEY_SECRET`. Your `.env` uses `FAL_KEY` (correct).

### ❌ Myth: "fal.config() doesn't work"
**Reality**: It works, but it's called at module load time, so the server must restart to pick up new values.

---

## Next Steps

If you're still experiencing issues, please provide:

1. **What makes you think it's using a different key?**
   - Wrong account billing?
   - Different Key ID shown somewhere?
   - Error message mentioning a key?

2. **When did this start happening?**
   - After changing .env?
   - After deploying?
   - Always been this way?

3. **What key do you EXPECT it to use?**
   - Provide the Key ID portion (first part before `:`)

4. **Server logs**
   - Add the logging from step 1 above
   - Show the console output when server starts

---

**Generated**: 2025-11-25
**Project**: Upload_Post_Engine
**File**: `/mnt/g/Upload_Post_Engine/docs/FAL-KEY-DIAGNOSTIC.md`
