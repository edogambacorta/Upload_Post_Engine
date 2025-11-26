# Studio Toolbar Reorganization Plan

## Overview
Reorganize the Studio Editor toolbar to include a Format selector at the beginning and reorder the Mode buttons for better UX.

## Current Structure
```
[Text Mode] [Image Mode] [Prompt Mode] | [Download] [Share]
```

## New Structure
```
Format: [3:4▼] | Mode: [Prompt] [Text] [Image] | [Download] [Share]
```

## Requirements

### 1. Format Selector
- **Position**: Very beginning of toolbar (leftmost)
- **Label**: "Format:" text label
- **Display**: White square box with aspect ratio displayed inside (e.g., "3:4", "16:9", "1:1")
- **Number Size**: Small text inside the box
- **Interaction**: Dropdown to select different aspect ratios
- **Behavior**: When format changes, **instantly update Fabric.js canvas dimensions**

### 2. Mode Selector Reorganization
- **Position**: After Format selector, separated by divider
- **Label**: "Mode:" text label before buttons
- **Order**:
  1. Prompt Mode (leftmost in mode group)
  2. Text Mode (middle)
  3. Image Mode (rightmost in mode group)
- **Visual**: Icon buttons with current mode highlighted

### 3. Action Buttons
- **Position**: After Mode selector, separated by divider
- **Buttons**: Download, Share (unchanged)

## Implementation Steps

### Step 1: Define Aspect Ratio Options
```typescript
const ASPECT_RATIOS = [
  { label: '1:1', width: 1080, height: 1080 },
  { label: '4:5', width: 1080, height: 1350 },
  { label: '3:4', width: 1080, height: 1440 },
  { label: '9:16', width: 1080, height: 1920 },
  { label: '16:9', width: 1920, height: 1080 },
  { label: '4:3', width: 1440, height: 1080 }
];
```

### Step 2: Create Format Selector Component
```tsx
// Component structure
<div className="flex items-center gap-2">
  <span className="text-sm text-gray-400">Format:</span>
  <button className="relative bg-white/10 rounded px-3 py-1.5 hover:bg-white/20">
    <span className="text-xs font-mono">{currentRatio.label}</span>
    <ChevronDown className="w-3 h-3 inline ml-1" />
  </button>
  {/* Dropdown menu */}
</div>
```

### Step 3: Integrate with Fabric.js
- When format changes, call canvas resize function
- Update canvas dimensions immediately
- Maintain zoom level and center position
- Update any dependent UI elements

### Step 4: Reorganize Mode Buttons
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm text-gray-400">Mode:</span>
  <div className="flex items-center gap-1 bg-gray-900/90 p-1 rounded-full">
    {/* Prompt Mode - First */}
    <ModeButton icon={FileCode} mode="prompt" />

    {/* Text Mode - Second */}
    <ModeButton icon={Type} mode="text" />

    {/* Image Mode - Third */}
    <ModeButton icon={Image} mode="image" />
  </div>
</div>
```

### Step 5: Update Toolbar Layout
```tsx
<div className="toolbar-container">
  {/* Format Selector */}
  <FormatSelector />

  {/* Divider */}
  <div className="divider" />

  {/* Mode Selector */}
  <ModeSelector />

  {/* Divider */}
  <div className="divider" />

  {/* Action Buttons */}
  <ActionButtons />
</div>
```

## Technical Details

### Fabric.js Canvas Resize
```typescript
function updateCanvasFormat(ratio: AspectRatio) {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  // Store current zoom and viewport
  const zoom = canvas.getZoom();
  const vpt = canvas.viewportTransform;

  // Update canvas dimensions
  canvas.setDimensions({
    width: ratio.width,
    height: ratio.height
  });

  // Restore zoom and center
  canvas.setZoom(zoom);
  canvas.viewportTransform = vpt;
  canvas.requestRenderAll();
}
```

### State Management
- Add `currentFormat` to store state
- Track format changes and persist to post data
- Sync format with existing aspect ratio controls

## Files to Modify

1. **src/web/components/studio/Editor/StudioEditor.tsx**
   - Add Format selector component
   - Reorder mode buttons
   - Integrate canvas resize logic

2. **src/web/components/studio/Editor/PreviewPanel.tsx**
   - Update canvas resize handling
   - Ensure preview updates with format changes

3. **src/web/lib/studio/types.ts**
   - Add AspectRatio type definition
   - Add format to post state

4. **src/web/lib/studio/store.tsx**
   - Add currentFormat state
   - Add setFormat action

## Visual Design

### Format Button
```
┌─────────┐
│  3:4  ▼ │  ← White square box with small ratio text
└─────────┘
```

### Complete Toolbar
```
Format: [3:4▼]  |  Mode: [📝] [A] [🖼]  |  [↓] [↗]
        ↑           ↑    ↑   ↑          ↑   ↑
      Format      Prompt Text Image   DL  Share
```

## Testing Checklist

- [ ] Format selector displays current ratio correctly
- [ ] Format dropdown shows all available ratios
- [ ] Clicking a new format instantly resizes canvas
- [ ] Canvas content is preserved when resizing
- [ ] Zoom level is maintained appropriately
- [ ] Mode buttons are in correct order (Prompt, Text, Image)
- [ ] Current mode is visually indicated
- [ ] Toolbar layout is responsive
- [ ] Format persists when switching modes
- [ ] Format is saved with post data

## Notes

- Format changes should be **instant** - no confirmation dialog
- Consider adding keyboard shortcuts for common formats (1-6 keys?)
- Format should persist in localStorage for new posts
- May want to add custom format option for advanced users
