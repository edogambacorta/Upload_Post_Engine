export function CalendarLegend() {
    const statuses = [
        { label: 'Draft', color: 'bg-gray-500' },
        { label: 'Scheduled', color: 'bg-blue-500' },
        { label: 'Published', color: 'bg-green-500' },
        { label: 'Failed', color: 'bg-red-500' }
    ];

    return (
        <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="font-medium">Status:</span>
            {statuses.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${color}`}></div>
                    <span>{label}</span>
                </div>
            ))}
        </div>
    );
}
