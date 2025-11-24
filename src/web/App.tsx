import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MomDashboard } from './pages/MomDashboard';

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-900 text-white">
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                        <Route path="/" element={<Navigate to="/mom" replace />} />
                        <Route path="/mom" element={<MomDashboard />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
