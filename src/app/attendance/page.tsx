'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getEvents } from '@/lib/db/events';
import { getStudents } from '@/lib/db/students';
import { getAttendanceByEvent, upsertAttendance } from '@/lib/db/attendance';
import { getCourseColor, getSemesterColor } from '@/lib/ui';
import { Event, Student, AttendanceStatus, Course } from '@/types';
import {
    CheckCircleIcon,
    XCircleIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
    NoSymbolIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Suspense } from 'react';

type StudentStatus = { student: Student; status: AttendanceStatus | null };

const COURSES: Course[] = ['BCA', 'BIT', 'MCA'];
const SEMESTERS = [1, 2, 3, 4, 5, 6];

const ALL_EXPORT_COLS = [
    { key: 'sno', label: 'S. No.' },
    { key: 'scholar_id', label: 'Scholar ID' },
    { key: 'name', label: 'Name' },
    { key: 'gender', label: 'Gender' },
    { key: 'course', label: 'Course' },
    { key: 'semester', label: 'Semester' },
    { key: 'contact_number', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
];

function AttendanceContent() {
    const searchParams = useSearchParams();
    const preselected = searchParams.get('event') ?? '';

    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState(preselected);
    const [rows, setRows] = useState<StudentStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showExport, setShowExport] = useState(false);
    const [exportCols, setExportCols] = useState<string[]>(ALL_EXPORT_COLS.map(c => c.key));
    const [saved, setSaved] = useState(false);

    // Filters state
    const [filterCourse, setFilterCourse] = useState<string>('All');
    const [filterSemester, setFilterSemester] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        getEvents().then(setEvents).catch(() => showToast('Failed to load events', 'error'));
    }, []);

    const loadAttendance = useCallback(async (eventId: string) => {
        if (!eventId) return;
        setLoading(true);
        setSaved(false);
        try {
            const [students, existing] = await Promise.all([
                getStudents(),
                getAttendanceByEvent(eventId),
            ]);

            // Custom Sorting: BCA (Sem Asc) -> BIT -> MCA
            const COURSE_PRIORITY: Record<string, number> = { 'BCA': 0, 'BIT': 1, 'MCA': 2 };
            const sortedStudents = students.sort((a, b) => {
                const pA = COURSE_PRIORITY[a.course] ?? 99;
                const pB = COURSE_PRIORITY[b.course] ?? 99;
                if (pA !== pB) return pA - pB;
                return (a.semester || 0) - (b.semester || 0);
            });

            const existingMap = new Map(existing.map(a => [a.scholar_id, a.status]));
            setRows(sortedStudents.map(s => ({
                student: s,
                status: (existingMap.get(s.scholar_id) as AttendanceStatus) ?? null,
            })));
        } catch {
            showToast('Failed to load attendance data', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedEventId) loadAttendance(selectedEventId);
    }, [selectedEventId, loadAttendance]);

    // Computed filtered rows
    const displayRows = useMemo(() => {
        return rows.filter(r => {
            const matchCourse = filterCourse === 'All' || r.student.course === filterCourse;
            const matchSem = filterSemester === 'All' || r.student.semester === parseInt(filterSemester);
            const matchSearch = r.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.student.scholar_id.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCourse && matchSem && matchSearch;
        });
    }, [rows, filterCourse, filterSemester, searchQuery]);

    const markAll = (status: AttendanceStatus) => {
        const visibleIds = new Set(displayRows.map(r => r.student.scholar_id));
        setRows(prev => prev.map(r =>
            visibleIds.has(r.student.scholar_id) ? { ...r, status } : r
        ));
    };

    const handleSave = async () => {
        if (!selectedEventId) return;
        setSaving(true);
        try {
            const records = rows
                .filter(r => r.status !== null)
                .map(r => ({
                    scholar_id: r.student.scholar_id,
                    event_id: selectedEventId,
                    status: r.status as AttendanceStatus,
                }));
            await upsertAttendance(records);
            setSaved(true);
            showToast(`Attendance saved for ${records.length} student(s)`);
        } catch {
            showToast('Failed to save attendance', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = () => {
        const event = events.find(e => e.event_id === selectedEventId);
        const headers = ALL_EXPORT_COLS.filter(c => exportCols.includes(c.key)).map(c => c.label);
        const csvRows = displayRows.map((r, i) => {
            const cols: Record<string, string | number> = {
                sno: i + 1,
                scholar_id: r.student.scholar_id,
                name: r.student.name,
                gender: r.student.gender,
                course: r.student.course,
                semester: r.student.semester,
                contact_number: r.student.contact_number,
                email: r.student.email,
                status: r.status ?? 'N/A',
            };
            return exportCols.map(key => `"${cols[key] ?? ''}"`).join(',');
        });
        const csv = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${event?.event_name.replace(/\s+/g, '_')}_${event?.event_date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExport(false);
    };

    const presentCount = displayRows.filter(r => r.status === 'Present').length;
    const absentCount = displayRows.filter(r => r.status === 'Absent').length;
    const naCount = displayRows.filter(r => r.status === 'NA').length;
    const unmarkedCount = displayRows.filter(r => r.status === null).length;

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const clearFilters = () => {
        setFilterCourse('All');
        setFilterSemester('All');
        setSearchQuery('');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.msg}
                </div>
            )}

            <h2 className="page-title">Mark Attendance</h2>

            {/* Event selector */}
            <div className="card p-5">
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Select Event</label>
                <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">-- Choose an event --</option>
                    {events.map(ev => (
                        <option key={ev.event_id} value={ev.event_id}>
                            {ev.event_name} &nbsp;·&nbsp; {formatDate(ev.event_date)}
                        </option>
                    ))}
                </select>
            </div>

            {selectedEventId && rows.length > 0 && (
                <>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex flex-wrap gap-2 items-center flex-1">
                            <div className="flex-1 min-w-[200px]">
                                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search name or scholar ID..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="bg-transparent text-xs font-semibold outline-none text-gray-600 w-full placeholder:text-gray-400"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-gray-100 rounded-full transition-colors">
                                            <XMarkIcon className="w-3 h-3 text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                                <FunnelIcon className="w-3.5 h-3.5 text-blue-600" />
                                <select
                                    value={filterCourse}
                                    onChange={e => setFilterCourse(e.target.value)}
                                    className="bg-transparent text-xs font-semibold outline-none text-gray-600 cursor-pointer"
                                >
                                    <option value="All">All Courses</option>
                                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                                <select
                                    value={filterSemester}
                                    onChange={e => setFilterSemester(e.target.value)}
                                    className="bg-transparent text-xs font-semibold outline-none text-gray-600 cursor-pointer"
                                >
                                    <option value="All">All Semesters</option>
                                    {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                                </select>
                            </div>

                            {(filterCourse !== 'All' || filterSemester !== 'All') && (
                                <button
                                    onClick={clearFilters}
                                    className="text-xs font-bold text-red-500 hover:text-red-600 px-2 transition-colors uppercase tracking-tight shrink-0"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div className="flex flex-wrap gap-3">
                        <span className="stat-badge bg-green-100 text-green-700">
                            ✓ Present: {presentCount}
                        </span>
                        <span className="stat-badge bg-red-100 text-red-700">
                            ✗ Absent: {absentCount}
                        </span>
                        <span className="stat-badge bg-amber-100 text-amber-700 font-bold">
                            ⊘ NA: {naCount}
                        </span>
                        <span className="stat-badge bg-gray-100 text-gray-400">
                            ○ Unmarked: {unmarkedCount}
                        </span>
                        <span className="stat-badge bg-blue-100 text-blue-700">
                            Visible: {displayRows.length}
                        </span>
                    </div>

                    {/* Bulk actions + save */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => markAll('Present')}
                            className="flex items-center gap-1.5 text-[11px] bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 transition-colors uppercase tracking-tight"
                        >
                            <CheckCircleIcon className="w-3.5 h-3.5" /> All Present
                        </button>
                        <button
                            onClick={() => markAll('Absent')}
                            className="flex items-center gap-1.5 text-[11px] bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-600 transition-colors uppercase tracking-tight"
                        >
                            <XCircleIcon className="w-3.5 h-3.5" /> All Absent
                        </button>
                        <button
                            onClick={() => markAll('NA')}
                            className="flex items-center gap-1.5 text-[11px] bg-amber-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-amber-600 transition-colors uppercase tracking-tight"
                        >
                            <NoSymbolIcon className="w-3.5 h-3.5" /> All NA
                        </button>
                        <div className="flex-1" />
                        {saved && (
                            <button
                                onClick={() => setShowExport(true)}
                                className="flex items-center gap-1.5 text-[11px] border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-50 transition-colors uppercase tracking-tight"
                            >
                                <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Export
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-800 shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : 'Save Attendance'}
                        </button>
                    </div>

                    {/* Student attendance table */}
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm border-separate border-spacing-0">
                                <thead>
                                    <tr className="bg-blue-900 text-white sticky top-0 z-10">
                                        <th className="px-4 py-3 text-left font-semibold">#</th>
                                        <th className="px-4 py-3 text-left font-semibold">Scholar ID</th>
                                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold">Course</th>
                                        <th className="px-4 py-3 text-left font-semibold">Sem</th>
                                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {loading ? (
                                        <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading student list...</td></tr>
                                    ) : displayRows.length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic">No students match the criteria.</td></tr>
                                    ) : displayRows.map((r, i) => (
                                        <tr
                                            key={r.student.scholar_id}
                                            className={`transition-colors border-b border-gray-50 ${r.status === 'Present'
                                                ? 'bg-green-50/50 hover:bg-green-100/50'
                                                : r.status === 'Absent'
                                                    ? 'bg-red-50/50 hover:bg-red-100/50'
                                                    : r.status === 'NA'
                                                        ? 'bg-amber-50/50 hover:bg-amber-100/50'
                                                        : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-blue-900 font-semibold">{r.student.scholar_id}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{r.student.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`stat-badge border ${getCourseColor(r.student.course)} text-[10px] font-bold`}>{r.student.course}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] border shadow-sm ${getSemesterColor(r.student.semester)}`}>
                                                    Sem {r.student.semester}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setRows(prev => prev.map(row => row.student.scholar_id === r.student.scholar_id ? { ...row, status: 'Present' } : row))}
                                                        className={`p-1.5 rounded-lg transition-all ${r.status === 'Present' ? 'bg-green-600 text-white shadow-sm scale-110' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                                                        title="Present"
                                                    >
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setRows(prev => prev.map(row => row.student.scholar_id === r.student.scholar_id ? { ...row, status: 'Absent' } : row))}
                                                        className={`p-1.5 rounded-lg transition-all ${r.status === 'Absent' ? 'bg-red-500 text-white shadow-sm scale-110' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                                                        title="Absent"
                                                    >
                                                        <XCircleIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setRows(prev => prev.map(row => row.student.scholar_id === r.student.scholar_id ? { ...row, status: 'NA' } : row))}
                                                        className={`p-1.5 rounded-lg transition-all ${r.status === 'NA' ? 'bg-amber-500 text-white shadow-sm scale-110' : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-600'}`}
                                                        title="Not Applicable"
                                                    >
                                                        <NoSymbolIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {selectedEventId && rows.length === 0 && !loading && (
                <div className="card p-12 text-center text-gray-400 border-dashed border-2 border-gray-200 bg-gray-50/50">
                    <p>No students found in record.</p>
                    <a href="/students?new=1" className="inline-block mt-4 text-sm font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4">
                        Add students to get started →
                    </a>
                </div>
            )}

            {/* CSV Export Modal */}
            {showExport && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 bg-blue-900 border-b border-gray-200">
                            <h3 className="font-bold text-white">Export Settings</h3>
                            <button onClick={() => setShowExport(false)} className="text-blue-200 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Select Columns</p>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto px-1">
                                {ALL_EXPORT_COLS.map(col => (
                                    <label key={col.key} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={exportCols.includes(col.key)}
                                            onChange={e => {
                                                if (e.target.checked) setExportCols(prev => [...prev, col.key]);
                                                else setExportCols(prev => prev.filter(k => k !== col.key));
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-900">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
                            <button
                                onClick={() => setShowExport(false)}
                                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exportCols.length === 0}
                                className="flex-1 px-5 py-2.5 bg-yellow-500 text-white text-sm font-bold rounded-xl hover:bg-yellow-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                                Download CSV Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AttendancePage() {
    return (
        <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading components...</div>}>
            <AttendanceContent />
        </Suspense>
    );
}
