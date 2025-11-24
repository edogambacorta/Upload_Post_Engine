import { MomCreateForm } from '../components/MomCreateForm.tsx';
import { MomRunsList } from '../components/MomRunsList.tsx';

export function MomDashboard() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-pink-300">MomMirror</h1>
                    <p className="text-gray-400 mt-2">Relatable parenting content generator</p>
                </div>
            </div>

            {/* Create Form Section */}
            <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 p-8">
                <h2 className="text-2xl font-semibold text-white mb-6">Create New Infographic</h2>
                <MomCreateForm />
            </div>

            {/* Previous Runs Section */}
            <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Previous Runs</h2>
                <MomRunsList />
            </div>
        </div>
    );
}
