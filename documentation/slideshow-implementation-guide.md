# Slideshow Upload Implementation Guide

## Overview

This guide documents how to implement **image slideshows** (Instagram carousels + TikTok photo slideshows) using the Upload-Post API in our Upload_Post_Engine project.

A "slideshow" is simply multiple images uploaded in a single API call:
- **Instagram**: becomes a carousel (multi-image post)
- **TikTok**: becomes a photo slideshow with music

---

## Table of Contents

1. [API Endpoint & Authentication](#api-endpoint--authentication)
2. [Understanding Title vs Description](#understanding-title-vs-description)
3. [Platform-Specific Behavior](#platform-specific-behavior)
4. [Current Implementation Analysis](#current-implementation-analysis)
5. [Implementation Guide](#implementation-guide)
6. [Code Examples](#code-examples)
7. [Testing & Debugging](#testing--debugging)

---

## API Endpoint & Authentication

### Base Information

```
POST https://api.upload-post.com/api/upload_photos
Authorization: Apikey YOUR_API_KEY_HERE
Content-Type: multipart/form-data
```

**Environment Variable**: `UPLOAD_POST_API_KEY` (already configured in `.env.example`)

**Documentation**: https://docs.upload-post.com

---

## Understanding Title vs Description

### Core Fields

| Field | Purpose | Instagram Behavior | TikTok Behavior |
|-------|---------|-------------------|-----------------|
| `title` | Default caption/title for all platforms | Used as caption (if no override) | Used as title (if no override) |
| `description` | Long-form text | **IGNORED** | Used as description text |
| `instagram_title` | Instagram-specific override | Overrides `title` | N/A |
| `tiktok_title` | TikTok-specific override | N/A | Overrides `title` |
| `tiktok_description` | TikTok-specific description | N/A | Preferred over `description` |

### Key Insight

**Instagram photos** = title serves as caption (description is ignored)
**TikTok photos** = separate title + description fields

---

## Platform-Specific Behavior

### Instagram (Carousel)

When multiple photos are detected, Upload-Post automatically creates a carousel.

**Required:**
- `user` - Upload-Post profile username
- `platform[]=instagram`
- `photos[]` - multiple image files
- `title` OR `instagram_title` - becomes the caption

**Optional:**
- `instagram_title` - overrides global `title`
- Instagram ignores `description` field entirely

**Caption Strategy:**
For long Instagram captions, simply put all text in `title` or `instagram_title` (no separate description concept).

```bash
# Instagram-only carousel example
curl \
  -H "Authorization: Apikey YOUR_KEY" \
  -F "user=mommirror" \
  -F "platform[]=instagram" \
  -F "photos[]=@slide_01.jpg" \
  -F "photos[]=@slide_02.jpg" \
  -F "photos[]=@slide_03.jpg" \
  -F "instagram_title=Your entire caption text here, including hashtags and line breaks" \
  https://api.upload-post.com/api/upload_photos
```

---

### TikTok (Photo Slideshow)

Creates a multi-image photo post with optional background music.

**Required:**
- `user` - Upload-Post profile username
- `platform[]=tiktok`
- `photos[]` - multiple image files
- `title` OR `tiktok_title` - short visible caption

**Optional but Recommended:**
- `tiktok_title` - short caption/headline
- `tiktok_description` OR `description` - long description text
- `post_mode` - `"DIRECT_POST"` (publish immediately) or `"MEDIA_UPLOAD"` (send to TikTok inbox)
- `auto_add_music` - `true` to automatically add background music
- `photo_cover_index` - which slide (0-based) is the cover/thumbnail

```bash
# TikTok-only slideshow example
curl \
  -H "Authorization: Apikey YOUR_KEY" \
  -F "user=mommirror" \
  -F "platform[]=tiktok" \
  -F "photos[]=@slide_01.jpg" \
  -F "photos[]=@slide_02.jpg" \
  -F "photos[]=@slide_03.jpg" \
  -F "tiktok_title=Short catchy title" \
  -F "tiktok_description=Longer description explaining each slide..." \
  -F "post_mode=DIRECT_POST" \
  -F "auto_add_music=true" \
  -F "photo_cover_index=0" \
  https://api.upload-post.com/api/upload_photos
```

---

### Cross-Platform Slideshow (Instagram + TikTok)

Post the same slideshow to both platforms with platform-specific captions.

```bash
curl \
  -H "Authorization: Apikey YOUR_KEY" \
  -F "user=mommirror" \
  -F "platform[]=instagram" \
  -F "platform[]=tiktok" \
  \
  # Slides in order
  -F "photos[]=@slide_01.jpg" \
  -F "photos[]=@slide_02.jpg" \
  -F "photos[]=@slide_03.jpg" \
  \
  # Global fallback
  -F "title=Invisible Load of Motherhood – When Mental To-Dos Overflow" \
  \
  # Instagram-specific (full caption)
  -F "instagram_title=Invisible Load of Motherhood – When Mental To-Dos Overflow

You see a mom sitting on the couch, but you don't see the 100 open tabs in her mind...

Slide 1: The mental to-do list
Slide 2: The emotional load
Slide 3: What support really looks like

#momlife #mentalload #invisiblelabor" \
  \
  # TikTok-specific
  -F "tiktok_title=Invisible Load of Motherhood (photo slideshow)" \
  -F "tiktok_description=You see a mom sitting on the couch, but you don't see the 100 open tabs in her mind...

Slide 1: Mental to-do list
Slide 2: Emotional load
Slide 3: What support really looks like" \
  -F "post_mode=DIRECT_POST" \
  -F "auto_add_music=true" \
  -F "photo_cover_index=0" \
  \
  https://api.upload-post.com/api/upload_photos
```

---

## Current Implementation Analysis

### File Structure

```
src/services/
├── uploadPost.ts         # Mock implementation (needs real API integration)
├── runOrchestrator.ts    # Pipeline: prompts → images → compose → publish
├── compose.ts            # Creates individual images with overlays
├── openrouter.ts         # Generates MomPost objects with captions
└── fal.ts                # Image generation via FAL.ai
```

### Current Flow

1. **Prompt Generation** (`openrouter.ts`)
   - Generates `MomPost[]` objects with:
     - `overlayTitle`, `overlaySubtitle` - for image overlay
     - `caption` - full post caption (A→B→C→D→E formula)
     - `hook`, `cta`, `safetyFooter` - caption components

2. **Image Generation** (`fal.ts`)
   - Generates individual images from `imagePrompt`
   - Saves as `raw-{index}.png`

3. **Composition** (`compose.ts`)
   - Adds overlays to each image individually
   - Creates `final-{index}.jpg` for each post

4. **Publishing** (`uploadPost.ts`)
   - **Currently**: Mock implementation
   - **Loops through images individually**
   - **Issue**: Posts each image separately, not as slideshows

### What Needs to Change

**Current Approach**: 1 image = 1 post
```typescript
for (let i = 0; i < images.length; i++) {
    // Posts each image as a separate single-image post
}
```

**Slideshow Approach**: Multiple images = 1 slideshow post

We have two options:

#### Option A: True Slideshows (Multiple Images → One Post)

Group images by topic/theme and post as multi-image slideshows:
- Generate 3-4 related images for one theme
- Post them together as a carousel/slideshow

**Pros**: More engaging, tells a story
**Cons**: Requires rethinking content generation strategy

#### Option B: Keep Current Strategy (Single Image Per Post)

Continue posting individual images, but implement real API:
- 1 image → 1 Instagram post
- 1 image → 1 TikTok photo post

**Pros**: Minimal changes to pipeline
**Cons**: Not utilizing slideshow feature

---

## Implementation Guide

### Option A: Implement Real API for Single Images

**Minimal changes to current flow. Recommended for quick implementation.**

#### Step 1: Install Dependencies

```bash
npm install form-data
```

#### Step 2: Update `src/services/uploadPost.ts`

Replace mock implementation with real API calls.

See [Code Examples](#code-examples) section below for complete implementation.

#### Step 3: Update Environment Variables

```env
# .env
UPLOAD_POST_API_KEY=your_actual_api_key_here
UPLOAD_POST_USER=mommirror
UPLOAD_POST_DRY_RUN=false
```

#### Step 4: Test

```bash
# Enable dry run for testing
UPLOAD_POST_DRY_RUN=true npm run dev
```

---

### Option B: Implement True Slideshows

**Requires content generation changes. For future enhancement.**

#### Changes Needed:

1. **Modify prompt generation** to create slide sets:
   ```typescript
   type SlideShow = {
       id: string;
       topic: string;
       slides: MomPost[];  // 3-4 related posts
   };
   ```

2. **Compose slides in sequence**:
   ```typescript
   // Instead of individual final-0.jpg, final-1.jpg
   // Create slideshow-0-slide-0.jpg, slideshow-0-slide-1.jpg, etc.
   ```

3. **Upload as batch**:
   ```typescript
   await publishSlideshow(slideshow.slides, slideshow.caption);
   ```

**Recommendation**: Implement Option A first, then consider Option B as an enhancement.

---

## Code Examples

### Complete Implementation: Single Images (Option A)

Replace the content of `src/services/uploadPost.ts`:

```typescript
import fs from 'fs';
import FormData from 'form-data';
import { ComposedImage } from './compose';

export type PublishResult = {
    platform: 'tiktok' | 'instagram';
    remoteId: string;
    url?: string;
    status: 'success' | 'failed';
    error?: string;
};

type ScheduleSlot = {
    postId: string;
    scheduledDate?: string;
};

type PublishOptions = {
    title: string;
    description?: string;
    instagramTitle?: string;
    tiktokTitle?: string;
    tiktokDescription?: string;
    scheduledDate?: string;
};

/**
 * Publishes a single image to Instagram and/or TikTok via Upload-Post API.
 *
 * @param imagePath - Path to the composed image file
 * @param options - Caption and platform-specific overrides
 * @param platforms - Which platforms to publish to
 * @returns Array of publish results per platform
 */
async function publishSingleImage(
    imagePath: string,
    options: PublishOptions,
    platforms: ('instagram' | 'tiktok')[] = ['instagram', 'tiktok']
): Promise<PublishResult[]> {
    const apiKey = process.env.UPLOAD_POST_API_KEY;
    const user = process.env.UPLOAD_POST_USER || 'mommirror';
    const baseUrl = 'https://api.upload-post.com/api';

    if (!apiKey) {
        throw new Error('UPLOAD_POST_API_KEY not configured');
    }

    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
    }

    // Build form data
    const form = new FormData();
    form.append('user', user);

    // Add platforms
    platforms.forEach(platform => {
        form.append('platform[]', platform);
    });

    // Add image file
    form.append('photos[]', fs.createReadStream(imagePath));

    // Add captions
    form.append('title', options.title);

    if (options.description) {
        form.append('description', options.description);
    }

    // Platform-specific overrides
    if (options.instagramTitle) {
        form.append('instagram_title', options.instagramTitle);
    }

    if (options.tiktokTitle) {
        form.append('tiktok_title', options.tiktokTitle);
    }

    if (options.tiktokDescription) {
        form.append('tiktok_description', options.tiktokDescription);
    }

    // TikTok-specific settings
    if (platforms.includes('tiktok')) {
        form.append('post_mode', 'DIRECT_POST');
        form.append('auto_add_music', 'true');
        form.append('photo_cover_index', '0');
    }

    // Scheduling
    if (options.scheduledDate) {
        form.append('scheduled_date', options.scheduledDate);
    }

    try {
        const response = await fetch(`${baseUrl}/upload_photos`, {
            method: 'POST',
            headers: {
                'Authorization': `Apikey ${apiKey}`,
                ...form.getHeaders(),
            },
            body: form,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload-Post API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // Parse results per platform
        const results: PublishResult[] = [];

        for (const platform of platforms) {
            const platformData = result[platform];

            if (platformData?.success) {
                results.push({
                    platform,
                    remoteId: platformData.id || platformData.post_id || 'unknown',
                    url: platformData.url,
                    status: 'success',
                });
            } else {
                results.push({
                    platform,
                    remoteId: '',
                    status: 'failed',
                    error: platformData?.error || 'Unknown error',
                });
            }
        }

        return results;
    } catch (error: any) {
        console.error('Failed to publish image:', error);

        // Return failed status for all platforms
        return platforms.map(platform => ({
            platform,
            remoteId: '',
            status: 'failed' as const,
            error: error.message,
        }));
    }
}

/**
 * Publishes multiple composed images as individual posts.
 * This is the main entry point called by runOrchestrator.
 */
export async function publishImages(
    runId: string,
    images: ComposedImage[],
    captions: string[],
    schedules?: ScheduleSlot[]
): Promise<PublishResult[][]> {
    const dryRun = process.env.UPLOAD_POST_DRY_RUN !== 'false';

    if (dryRun) {
        console.log('[UploadPost] Dry run enabled, simulating uploads...');

        return images.map((image, i) => {
            const caption = captions[i] || '';
            const schedule = schedules?.[i];

            console.log(`[UploadPost] Would publish: ${image.finalPath}`);
            console.log(`  Caption: ${caption.substring(0, 100)}...`);
            console.log(`  Schedule: ${schedule?.scheduledDate || 'immediate'}`);

            return [
                { platform: 'instagram', remoteId: `mock-ig-${Date.now()}`, status: 'success' },
                { platform: 'tiktok', remoteId: `mock-tt-${Date.now()}`, status: 'success' },
            ];
        });
    }

    // Real uploads
    const results: PublishResult[][] = [];

    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const caption = captions[i] || '';
        const schedule = schedules?.[i];

        console.log(`[UploadPost] Publishing ${image.finalPath} to Instagram + TikTok`);

        try {
            const publishResults = await publishSingleImage(
                image.finalPath,
                {
                    title: caption,
                    description: caption, // TikTok can use this
                    // Optional: customize per platform
                    // instagramTitle: `${caption}\n\n#momlife #mentalload`,
                    // tiktokTitle: caption,
                    // tiktokDescription: caption,
                    scheduledDate: schedule?.scheduledDate,
                }
            );

            results.push(publishResults);
        } catch (error: any) {
            console.error(`Failed to publish image ${i}:`, error);
            results.push([
                { platform: 'instagram', remoteId: '', status: 'failed', error: error.message },
                { platform: 'tiktok', remoteId: '', status: 'failed', error: error.message },
            ]);
        }
    }

    return results;
}
```

---

### Slideshow Implementation Example (Option B)

For when you want to post multiple images as one slideshow:

```typescript
/**
 * Publishes multiple images as a single slideshow (carousel/photo slideshow).
 *
 * @param slides - Array of image paths to include in the slideshow
 * @param options - Caption and platform-specific overrides
 * @param platforms - Which platforms to publish to
 */
async function publishSlideshow(
    slides: string[],
    options: PublishOptions,
    platforms: ('instagram' | 'tiktok')[] = ['instagram', 'tiktok']
): Promise<PublishResult[]> {
    const apiKey = process.env.UPLOAD_POST_API_KEY;
    const user = process.env.UPLOAD_POST_USER || 'mommirror';
    const baseUrl = 'https://api.upload-post.com/api';

    if (!apiKey) {
        throw new Error('UPLOAD_POST_API_KEY not configured');
    }

    // Validate all slides exist
    for (const slide of slides) {
        if (!fs.existsSync(slide)) {
            throw new Error(`Slide not found: ${slide}`);
        }
    }

    const form = new FormData();
    form.append('user', user);

    // Add platforms
    platforms.forEach(platform => {
        form.append('platform[]', platform);
    });

    // Add all slides in order
    slides.forEach(slidePath => {
        form.append('photos[]', fs.createReadStream(slidePath));
    });

    // Add captions
    form.append('title', options.title);

    if (options.description) {
        form.append('description', options.description);
    }

    if (options.instagramTitle) {
        form.append('instagram_title', options.instagramTitle);
    }

    if (options.tiktokTitle) {
        form.append('tiktok_title', options.tiktokTitle);
    }

    if (options.tiktokDescription) {
        form.append('tiktok_description', options.tiktokDescription);
    }

    // TikTok slideshow settings
    if (platforms.includes('tiktok')) {
        form.append('post_mode', 'DIRECT_POST');
        form.append('auto_add_music', 'true');
        form.append('photo_cover_index', '0'); // First slide as cover
    }

    if (options.scheduledDate) {
        form.append('scheduled_date', options.scheduledDate);
    }

    try {
        const response = await fetch(`${baseUrl}/upload_photos`, {
            method: 'POST',
            headers: {
                'Authorization': `Apikey ${apiKey}`,
                ...form.getHeaders(),
            },
            body: form,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload-Post API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        const results: PublishResult[] = [];

        for (const platform of platforms) {
            const platformData = result[platform];

            if (platformData?.success) {
                results.push({
                    platform,
                    remoteId: platformData.id || platformData.post_id || 'unknown',
                    url: platformData.url,
                    status: 'success',
                });
            } else {
                results.push({
                    platform,
                    remoteId: '',
                    status: 'failed',
                    error: platformData?.error || 'Unknown error',
                });
            }
        }

        return results;
    } catch (error: any) {
        console.error('Failed to publish slideshow:', error);

        return platforms.map(platform => ({
            platform,
            remoteId: '',
            status: 'failed' as const,
            error: error.message,
        }));
    }
}

// Usage example:
// const results = await publishSlideshow(
//     ['/path/to/slide1.jpg', '/path/to/slide2.jpg', '/path/to/slide3.jpg'],
//     {
//         title: 'Invisible Load of Motherhood',
//         instagramTitle: 'Invisible Load of Motherhood – When Mental To-Dos Overflow\n\nSlide 1: ...',
//         tiktokTitle: 'Invisible Load of Motherhood',
//         tiktokDescription: 'Slide 1: Mental to-do list\nSlide 2: Emotional load\nSlide 3: Support',
//     }
// );
```

---

## Testing & Debugging

### 1. Enable Dry Run Mode

```bash
# .env
UPLOAD_POST_DRY_RUN=true
```

This will log what would be uploaded without making real API calls.

### 2. Test with Single Image First

```typescript
// Test script: test-upload.ts
import { publishSingleImage } from './src/services/uploadPost';

async function test() {
    const results = await publishSingleImage(
        '/path/to/test-image.jpg',
        {
            title: 'Test Post',
            description: 'Testing Upload-Post integration',
        },
        ['instagram']  // Test Instagram only first
    );

    console.log('Results:', results);
}

test();
```

### 3. Check API Response Format

The Upload-Post API returns a response like:

```json
{
  "instagram": {
    "success": true,
    "id": "123456789",
    "url": "https://instagram.com/p/ABC123",
    "message": "Posted successfully"
  },
  "tiktok": {
    "success": true,
    "id": "987654321",
    "url": "https://tiktok.com/@user/video/987654321"
  }
}
```

Adjust the result parsing in `publishSingleImage()` based on actual API response structure.

### 4. Monitor Upload Status

For async uploads, use the status endpoint:

```typescript
async function checkUploadStatus(uploadId: string) {
    const apiKey = process.env.UPLOAD_POST_API_KEY;
    const response = await fetch(
        `https://api.upload-post.com/api/uploadposts/status?upload_id=${uploadId}`,
        {
            headers: { 'Authorization': `Apikey ${apiKey}` }
        }
    );
    return response.json();
}
```

---

## MomPost Caption Structure

Our `MomPost` objects from `openrouter.ts` include:

```typescript
type MomPost = {
    overlayTitle: string;      // Short title for image overlay
    overlaySubtitle: string;   // Subtitle for image overlay
    hook: string;              // Hook (A - Pain point)
    caption: string;           // Full caption (A→B→C→D→E formula)
    cta: string;               // Call to action (E)
    safetyFooter?: string;     // Safety disclaimer if needed
};
```

### Mapping to Upload-Post Fields

**For Instagram:**
```typescript
instagram_title: `${momPost.caption}

${momPost.cta}

${momPost.safetyFooter || ''}

#momlife #mentalload #burnout #momtok`
```

**For TikTok:**
```typescript
tiktok_title: momPost.overlayTitle
tiktok_description: `${momPost.caption}

${momPost.cta}

${momPost.safetyFooter || ''}`
```

### Recommended Caption Helper

Add to `src/services/uploadPost.ts`:

```typescript
import { MomPost } from './runOrchestrator';

function buildCaptionsFromMomPost(momPost: MomPost): PublishOptions {
    // Full Instagram caption (can be long)
    const instagramCaption = [
        momPost.caption,
        '',
        momPost.cta,
        momPost.safetyFooter || '',
        '',
        '#momlife #mentalload #burnout #invisiblelabor #momtok #motherhood',
    ].filter(Boolean).join('\n');

    // TikTok uses shorter title + longer description
    const tiktokDescription = [
        momPost.caption,
        '',
        momPost.cta,
        momPost.safetyFooter || '',
    ].filter(Boolean).join('\n');

    return {
        title: momPost.overlayTitle, // Fallback
        description: tiktokDescription,
        instagramTitle: instagramCaption,
        tiktokTitle: momPost.overlayTitle,
        tiktokDescription: tiktokDescription,
    };
}

// Usage in publishImages():
// const publishOptions = buildCaptionsFromMomPost(state.posts[i].momPost);
// const results = await publishSingleImage(image.finalPath, publishOptions);
```

---

## Scheduled Posts

### Schedule at Upload Time

```typescript
const publishOptions = {
    title: 'My post title',
    scheduledDate: '2025-12-25T10:30:00Z', // ISO 8601 format, UTC
};

await publishSingleImage(imagePath, publishOptions);
```

### Manage Scheduled Posts

```typescript
// List scheduled posts
async function listScheduledPosts() {
    const apiKey = process.env.UPLOAD_POST_API_KEY;
    const response = await fetch(
        'https://api.upload-post.com/api/uploadposts/schedule',
        {
            headers: { 'Authorization': `Apikey ${apiKey}` }
        }
    );
    return response.json();
}

// Cancel a scheduled post
async function cancelScheduledPost(jobId: string) {
    const apiKey = process.env.UPLOAD_POST_API_KEY;
    const response = await fetch(
        `https://api.upload-post.com/api/uploadposts/schedule/${jobId}`,
        {
            method: 'DELETE',
            headers: { 'Authorization': `Apikey ${apiKey}` }
        }
    );
    return response.json();
}

// Edit a scheduled post
async function editScheduledPost(jobId: string, updates: {
    scheduled_date?: string;
    title?: string;
    caption?: string;
}) {
    const apiKey = process.env.UPLOAD_POST_API_KEY;
    const response = await fetch(
        `https://api.upload-post.com/api/uploadposts/schedule/${jobId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Apikey ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        }
    );
    return response.json();
}
```

---

## Next Steps

### Immediate (Option A - Single Images)

1. ✅ Review this documentation
2. ⬜ Install `form-data` dependency: `npm install form-data`
3. ⬜ Add `UPLOAD_POST_USER=mommirror` to `.env`
4. ⬜ Replace `src/services/uploadPost.ts` with real implementation
5. ⬜ Test with `UPLOAD_POST_DRY_RUN=true`
6. ⬜ Test real upload to Instagram only (1 image)
7. ⬜ Test real upload to TikTok only (1 image)
8. ⬜ Test cross-platform (Instagram + TikTok)
9. ⬜ Integrate `buildCaptionsFromMomPost()` helper
10. ⬜ Test scheduled posts

### Future Enhancement (Option B - True Slideshows)

1. ⬜ Design slideshow content strategy (3-4 slides per theme)
2. ⬜ Modify prompt generation to create slide sets
3. ⬜ Update composition to maintain slide relationships
4. ⬜ Implement `publishSlideshow()` function
5. ⬜ Update `runOrchestrator.ts` to group slides
6. ⬜ Test slideshow uploads

---

## Common Pitfalls

### ❌ Posting Each Image Separately
```typescript
// DON'T: Creates 3 separate posts
for (const image of images) {
    form.append('photos[]', image); // Wrong: separate calls
    await upload();
}
```

### ✅ Posting as Slideshow
```typescript
// DO: Creates 1 slideshow with 3 images
const form = new FormData();
images.forEach(image => {
    form.append('photos[]', image); // All in one form
});
await upload(form); // Single call
```

### ❌ Ignoring Platform-Specific Fields
```typescript
// DON'T: Instagram gets TikTok-style split title/description
form.append('title', 'Short title');
form.append('description', 'Long description'); // Instagram ignores this!
```

### ✅ Using Platform Overrides
```typescript
// DO: Instagram gets full caption
form.append('instagram_title', 'Full long caption with hashtags...');
form.append('tiktok_title', 'Short title');
form.append('tiktok_description', 'Long description');
```

---

## Resources

- **Upload-Post API Docs**: https://docs.upload-post.com
- **Photo Requirements**: https://docs.upload-post.com/requirements/photos
- **Schedule Management**: https://docs.upload-post.com/api/schedule
- **Internal Docs**: `documentation/upload-post-com.md`

---

## Questions?

If something is unclear or you need help implementing:

1. Check the Upload-Post API docs
2. Review the code examples in this file
3. Test with dry run mode first
4. Start with single images before attempting slideshows
5. Check API response format when debugging

---

**Last Updated**: 2025-11-25
**Version**: 1.0
**Author**: Upload_Post_Engine Team
