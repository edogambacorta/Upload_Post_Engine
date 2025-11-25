import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MomDashboard } from './pages/MomDashboard';
import { StudioPage } from './pages/StudioPage';
import { Dashboard } from './components/studio/Dashboard';
import { StudioEditor } from './components/studio/Editor/StudioEditor';
import { BatchGenerator } from './components/studio/Batch/BatchGenerator';

function App() {
    useEffect(() => {
        try {
            const probe = document.createElement('div');
            probe.className = 'bg-mm-bg text-mm-primary rounded-2xl';
            document.body.appendChild(probe);
            const styles = window.getComputedStyle(probe);
            const cssLooksLoaded =
                !!styles.backgroundColor &&
                styles.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                !!styles.color;
            console.log('[MomMirror CSS probe]', {
                ok: cssLooksLoaded,
                bg: styles.backgroundColor,
                color: styles.color,
                borderRadius: styles.borderRadius,
            });
            document.body.removeChild(probe);
        } catch (error) {
            console.warn('[MomMirror CSS probe] failed', error);
        }
    }, []);

    return (
        <Router>
            <div className="min-h-screen bg-mm-bg text-slate-100">
                <main className="max-w-full mx-auto">
                    <Routes>
                        <Route path="/" element={<Navigate to="/mom" replace />} />
                        <Route path="/mom" element={<MomDashboard />} />
                        <Route path="/studio" element={<StudioPage />}>
                            <Route index element={<Dashboard />} />
                            <Route path="editor" element={<StudioEditor />} />
                            <Route path="batch" element={<BatchGenerator />} />
                        </Route>
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
