import { useEffect, useState } from 'react';
import { CreateWizard } from '@/components/mom/CreateWizard/CreateWizard';
import { RunsGallery } from '@/components/mom/RunsGallery/RunsGallery';
import { PostCard } from '@/components/mom/RunsGallery/PostCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { WizardConfig, GeneratedPrompt, GeneratedImage, MomUiRun, MomUiPost } from '@/lib/mom/types';
// Removed server-side import
// import type { RunState } from '../../services/runOrchestrator';

// Define a minimal RunState interface for frontend use if not already in types
interface RunState {
  id: string;
  status: string;
  topic: string;
  count: number;
  mode?: string;
  momConfig?: any;
  posts: any[];
  createdAt?: string; // Add this if it's missing in the server response but needed here
}

export function MomDashboard() {
  const [runs, setRuns] = useState<MomUiRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<MomUiRun | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runPosts, setRunPosts] = useState<MomUiPost[]>([]);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);

  useEffect(() => {
    void fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/runs');
      if (!res.ok) return;
      const data: RunState[] = await res.json();
      const momRuns = data.filter((run) => run.mode === 'mommarketing');
      const mapped = momRuns.map(mapRunStateToUi);
      setRuns(mapped);
    } catch {
      // ignore
    }
  };

  const handleGeneratePrompts = async (config: WizardConfig): Promise<GeneratedPrompt[]> => {
    const prompts: GeneratedPrompt[] = Array.from({ length: config.postCount }).map((_, index) => ({
      id: `${Date.now()}-${index}`,
      text: `Post idea ${index + 1} about "${config.basePrompt}". Adjust this text before generating images.`,
    }));
    return prompts;
  };

  const handleGenerateImages = async (
    prompts: GeneratedPrompt[],
    config: WizardConfig,
  ): Promise<GeneratedImage[]> => {
    try {
      const res = await fetch('http://localhost:3000/api/mom-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePrompt: config.basePrompt,
          count: config.postCount,
          momConfig: {
            audience: config.audience,
            stylePreset: 'custom_infographic',
            aspectRatio: config.aspectRatio,
            model: config.llmModel,
            imageModel: config.imageModel,
          },
          generateImages: true,
          schedulePlan: config.schedulePlan,
        }),
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as { runId: string };
      const runId = data.runId;

      let state: RunState | null = null;
      for (let i = 0; i < 60; i += 1) {
        const runRes = await fetch(`http://localhost:3000/api/runs/${runId}`);
        if (!runRes.ok) break;
        state = (await runRes.json()) as RunState;
        const hasImages = state.posts.some((p) => p.finalImageUrl || p.rawImageUrl);
        if (hasImages || state.status === 'DONE' || state.status === 'ERROR') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!state) return [];

      const images: GeneratedImage[] = state.posts
        .map((post, index) => {
          const url = post.finalImageUrl || post.rawImageUrl;
          if (!url) return null;
          const postId = post.momPost?.id ?? String(post.index);
          return {
            id: `${runId}:${index}`,
            promptId: prompts[index]?.id ?? String(index),
            imageUrl: `http://localhost:3000${url}`,
            caption: post.momPost?.caption ?? '',
            postId,
            runId,
            scheduledDate: post.scheduledDate,
          } as GeneratedImage;
        })
        .filter((img): img is GeneratedImage => img !== null);

      await fetchRuns();

      return images;
    } catch {
      return [];
    }
  };

  const openRun = async (runId: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/runs/${runId}`);
      if (!res.ok) return;
      const state = (await res.json()) as RunState;
      const uiRun = mapRunStateToUi(state);
      const posts = mapRunStateToUiPosts(state);
      setSelectedRun(uiRun);
      setSelectedRunId(runId);
      setRunPosts(posts);
      setIsRunDialogOpen(true);
    } catch {
      // ignore
    }
  };

  const copyCaption = (caption: string) => {
    window.navigator?.clipboard?.writeText(caption).catch(() => { });
  };

  const regeneratePost = async (postId: string) => {
    if (!selectedRunId) return;
    try {
      await fetch(`http://localhost:3000/api/mom-runs/${selectedRunId}/regenerate-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: [postId] }),
      });
    } catch {
      // ignore
    }
  };

  const deleteRun = async (runId: string) => {
    const confirmed = window.confirm('Delete this run and all of its assets? This cannot be undone.');
    if (!confirmed) return;
    try {
      const res = await fetch(`http://localhost:3000/api/mom-runs/${runId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        return;
      }
      setRuns((prev) => prev.filter((run) => run.id !== runId));
      if (selectedRunId === runId) {
        setIsRunDialogOpen(false);
        setSelectedRunId(null);
        setSelectedRun(null);
        setRunPosts([]);
      }
      void fetchRuns();
    } catch {
      // ignore
    }
  };

  const updatePostSchedule = async (runId: string, postId: string, scheduledDate: string) => {
    const shouldUpdateUi = selectedRunId === runId;
    const previous = shouldUpdateUi
      ? runPosts.find((p) => p.id === postId)?.scheduledDate
      : undefined;
    if (shouldUpdateUi) {
      setRunPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, scheduledDate } : p)),
      );
    }
    try {
      const res = await fetch(`http://localhost:3000/api/mom-runs/${runId}/posts/${postId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate }),
      });
      if (!res.ok) {
        if (shouldUpdateUi) {
          setRunPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, scheduledDate: previous } : p)),
          );
        }
        return false;
      }
      void fetchRuns();
      return true;
    } catch {
      if (shouldUpdateUi) {
        setRunPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, scheduledDate: previous } : p)),
        );
      }
      return false;
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl text-slate-50">
            MomMirror Content Studio
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Generate emotionally resonant parenting infographics in a guided, three-step flow – then browse and refine your best runs.
          </p>
        </div>
      </header>

      <CreateWizard
        onGeneratePrompts={handleGeneratePrompts}
        onGenerateImages={handleGenerateImages}
        onOpenRunFromWizard={openRun}
        onUpdatePostSchedule={updatePostSchedule}
      />

      <RunsGallery runs={runs} onOpenRun={openRun} onDeleteRun={deleteRun} />
      <RunsGallery runs={runs} onOpenRun={openRun} onDeleteRun={deleteRun} />

      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent className="max-w-5xl bg-mm-card border-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {selectedRun?.topic ?? 'Run details'}
            </DialogTitle>
            {selectedRun && (
              <p className="text-xs text-slate-400">
                {new Date(selectedRun.createdAt).toLocaleString()} • {selectedRun.postCount} posts • {selectedRun.aspectRatio}
              </p>
            )}
          </DialogHeader>
          <div className="mt-3 flex-1 overflow-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {runPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onCopyCaption={copyCaption}
                  onRegenerate={regeneratePost}
                  onScheduleChange={(postId, isoDate) => {
                    void updatePostSchedule(post.runId, postId, isoDate);
                  }}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-200"
              onClick={() => setIsRunDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function mapRunStateToUi(run: RunState): MomUiRun {
  const cfg = run.momConfig;
  const status: MomUiRun["status"] =
    run.status === 'DONE'
      ? 'completed'
      : run.status === 'ERROR'
        ? 'failed'
        : run.status === 'PROMPTS' || run.status === 'IMAGES' || run.status === 'COMPOSING' || run.status === 'PUBLISHING'
          ? 'generating'
          : 'pending';

  const thumbnails = run.posts
    .map((p) => p.finalImageUrl || p.rawImageUrl)
    .filter((url): url is string => !!url)
    .slice(0, 3)
    .map((url) => `http://localhost:3000${url}`);

  return {
    id: run.id,
    createdAt: run.id,
    topic: run.topic,
    audience: (cfg?.audience ?? 'first_time_newborn') as MomUiRun["audience"],
    aspectRatio: (cfg?.aspectRatio ?? '9:16') as MomUiRun["aspectRatio"],
    llmModel: (cfg?.model ?? 'openrouter-gpt-5.1') as MomUiRun["llmModel"],
    imageModel: (cfg?.imageModel ?? 'nanobanana-pro') as MomUiRun["imageModel"],
    status,
    postCount: run.count,
    thumbnails,
  };
}

function mapRunStateToUiPosts(run: RunState): MomUiPost[] {
  return run.posts
    .map((post) => {
      const url = post.finalImageUrl || post.rawImageUrl;
      if (!url) return null;
      return {
        id: post.momPost?.id ?? String(post.index),
        runId: run.id,
        imageUrl: `http://localhost:3001${url}`,
        caption: post.momPost?.caption ?? '',
        prompt: post.momPost?.imagePrompt ?? post.momPost?.hook ?? '',
        scheduledDate: post.scheduledDate,
      } as MomUiPost;
    })
    .filter((p): p is MomUiPost => p !== null);
}
