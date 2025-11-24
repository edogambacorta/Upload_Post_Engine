import React, { useState } from 'react';

type RunFormProps = {
    onRunStarted: (runId: string) => void;
};

export default function RunForm({ onRunStarted }: RunFormProps) {
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(3);
    const [autoPublish, setAutoPublish] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    count: Number(count),
                    autoPublish,
                    platforms: ['instagram', 'tiktok'] // Defaulting for now
                }),
            });

            if (!response.ok) throw new Error('Failed to start run');

            const data = await response.json();
            onRunStarted(data.runId);
        } catch (error) {
            console.error(error);
            alert('Failed to start run');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Topic</label>
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Cyberpunk Street Food"
                    required
                />
            </div>

            <div className="form-group">
                <label>Number of Posts</label>
                <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    min={1}
                    max={10}
                    required
                />
            </div>

            <div className="form-group">
                <label>
                    <input
                        type="checkbox"
                        checked={autoPublish}
                        onChange={(e) => setAutoPublish(e.target.checked)}
                    />
                    {' '}Auto-publish to TikTok & Instagram
                </label>
            </div>

            <button type="submit" disabled={loading}>
                {loading ? 'Starting...' : 'Start Run'}
            </button>
        </form>
    );
}
