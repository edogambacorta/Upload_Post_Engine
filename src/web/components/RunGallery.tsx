import { useEffect, useState } from 'react';

type RunState = {
    posts: {
        index: number;
        prompt?: { overlayTitle: string };
        rawImageUrl?: string;
        finalImageUrl?: string;
        publish?: {
            [key: string]: { status: string; url?: string };
        };
    }[];
};

export default function RunGallery({ runId }: { runId: string }) {
    const [state, setState] = useState<RunState | null>(null);

    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch(`/api/runs/${runId}`);
                if (res.ok) {
                    const data = await res.json();
                    setState(data);

                    if (data.status !== 'DONE' && data.status !== 'ERROR') {
                        setTimeout(poll, 2000);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };

        poll();
    }, [runId]);

    if (!state || !state.posts.length) return <div>No images yet...</div>;

    return (
        <div className="gallery">
            {state.posts.map((post) => (
                <div key={post.index} className="gallery-item">
                    {post.finalImageUrl ? (
                        <img src={post.finalImageUrl} alt="Final" />
                    ) : post.rawImageUrl ? (
                        <img src={post.rawImageUrl} alt="Raw" />
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', background: '#eee' }}>
                            Generating...
                        </div>
                    )}

                    <div className="gallery-info">
                        <h4>{post.prompt?.overlayTitle || 'Untitled'}</h4>

                        {post.publish && (
                            <div style={{ marginTop: '0.5rem' }}>
                                {Object.entries(post.publish).map(([platform, info]) => (
                                    <span
                                        key={platform}
                                        className={`badge badge-${info.status === 'success' ? 'success' : info.status === 'failed' ? 'error' : 'pending'}`}
                                    >
                                        {platform}: {info.status}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
