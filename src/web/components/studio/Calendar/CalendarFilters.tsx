import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { CalendarFilters as Filters } from '@/lib/studio/calendarTypes';

interface CalendarFiltersProps {
    filters: Filters;
    onChange: (filters: Filters) => void;
    onReset: () => void;
}

export function CalendarFilters({ filters, onChange, onReset }: CalendarFiltersProps) {
    const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

    return (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Filters</h3>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="text-gray-400 hover:text-white"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="Search posts..."
                        value={filters.searchQuery || ''}
                        onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
                        className="pl-9 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    />
                </div>

                {/* Mode Filter */}
                <Select
                    value={filters.mode || 'all'}
                    onValueChange={(val) => onChange({
                        ...filters,
                        mode: val === 'all' ? undefined : val as any
                    })}
                >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="All Modes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="mommarketing">Mom Marketing</SelectItem>
                    </SelectContent>
                </Select>

                {/* Audience Filter */}
                <Select
                    value={filters.audience || 'all'}
                    onValueChange={(val) => onChange({
                        ...filters,
                        audience: val === 'all' ? undefined : val
                    })}
                >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="All Audiences" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Audiences</SelectItem>
                        <SelectItem value="pregnant_anxious">Pregnant & Anxious</SelectItem>
                        <SelectItem value="first_time_newborn">First-time Mom</SelectItem>
                        <SelectItem value="burned_out_parent">Burned-out Parent</SelectItem>
                        <SelectItem value="female_overwhelm">General Overwhelm</SelectItem>
                    </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                    value={filters.status || 'all'}
                    onValueChange={(val) => onChange({
                        ...filters,
                        status: val === 'all' ? undefined : val as any
                    })}
                >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
