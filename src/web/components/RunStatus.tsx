import { useEffect, useState } from 'react';

type RunStep = {
    name: string;
    status: 'pending' | 'in-progress' | 'done' | 'error';
};

type RunState = {
    id: string;
    status: string;
    steps: RunStep[];
    error?: string;
};

export default function RunStatus({ runId }: { runId: string }) {
    const [state, setState] = useState<RunState | null>(null);

    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch(`/api/runs/${runId}`);
                if (res.ok) {
                    const data = await res.json();
                    setState(data);

                    if (data.status !== 'DONE' && data.status !== 'ERROR') {
                        setTimeout(poll, 1000);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };

        poll();
    }, [runId]);

    if (!state) return <div>Loading status...</div>;

    return (
        <div>
            <p><strong>Run ID:</strong> {state.id}</p>
            <p><strong>Status:</strong> {state.status}</p>
            {state.error && <p style={{ color: 'red' }}>Error: {state.error}</p>}

            <ul className="status-list">
                {state.steps.map((step) => (
                    <li key={step.name} className="status-item">
                        <span className="status-icon">
                            {step.status === 'done' && '✅'}
                            {step.status === 'in-progress' && '⏳'}
                            {step.status === 'pending' && '⚪'}
                            {step.status === 'error' && '❌'}
                        </span>
                        <span style={{ textTransform: 'capitalize' }}>
                            {step.name}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
