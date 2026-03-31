'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { getStudents } from '@/lib/db/students';
import { getEvents } from '@/lib/db/events';
import { getAllAttendance } from '@/lib/db/attendance';
import { getCourseColor, getSemesterColor } from '@/lib/ui';
import { Student, Course, AttendanceStatus } from '@/types';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Suspense } from 'react';
import { TableRowSkeleton, Skeleton } from '@/components/Skeleton';

const COURSES: Course[] = ['BCA', 'BIT', 'MCA'];
const SEMESTERS = [1, 2, 3, 4, 5, 6];

function ReportsContent() {
    const [students, setStudents] = useState<Student[]>([]);
    const [totalEvents, setTotalEvents] = useState(0);
    const [studentStats, setStudentStats] = useState<{ [scholar_id: string]: { present: number; na: number; absent: number } }>({});
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState<string>('All');
    const [semesterFilter, setSemesterFilter] = useState<number | 'All'>('All');

    useEffect(() => {
        async function load() {
            try {
                const [stds, evts, att] = await Promise.all([
                    getStudents(),
                    getEvents(),
                    getAllAttendance(),
                ]);

                // Custom Sorting: BCA (Sem Asc) -> BIT -> MCA
                const COURSE_PRIORITY: Record<string, number> = { 'BCA': 0, 'BIT': 1, 'MCA': 2 };
                const sortedStds = stds.sort((a, b) => {
                    const pA = COURSE_PRIORITY[a.course] ?? 99;
                    const pB = COURSE_PRIORITY[b.course] ?? 99;
                    if (pA !== pB) return pA - pB;
                    return (a.semester || 0) - (b.semester || 0);
                });

                setStudents(sortedStds);
                setTotalEvents(evts.length);

                const statsMap: { [id: string]: { present: number; na: number; absent: number } } = {};

                // Initialize map for all students
                stds.forEach(s => {
                    statsMap[s.scholar_id] = { present: 0, na: 0, absent: 0 };
                });

                // Tally records
                att.forEach(record => {
                    if (!statsMap[record.scholar_id]) return;
                    if (record.status === 'Present') statsMap[record.scholar_id].present++;
                    else if (record.status === 'NA') statsMap[record.scholar_id].na++;
                    else if (record.status === 'Absent') statsMap[record.scholar_id].absent++;
                });

                setStudentStats(statsMap);
            } catch (err) {
                console.error('Failed to load report data', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchQuery = s.name.toLowerCase().includes(query.toLowerCase()) ||
                s.scholar_id.toLowerCase().includes(query.toLowerCase());
            const matchCourse = courseFilter === 'All' || s.course === courseFilter;
            const matchSem = semesterFilter === 'All' || s.semester === semesterFilter;
            return matchQuery && matchCourse && matchSem;
        });
    }, [students, query, courseFilter, semesterFilter]);

    const globalStats = useMemo(() => {
        if (filteredStudents.length === 0) return { avg: 0 };

        let totalPresent = 0;
        let totalApplicable = 0;

        filteredStudents.forEach(s => {
            const stats = studentStats[s.scholar_id] || { present: 0, na: 0, absent: 0 };
            const applicableForThisStudent = totalEvents - stats.na;
            totalPresent += stats.present;
            totalApplicable += Math.max(0, applicableForThisStudent);
        });

        return {
            avg: totalApplicable > 0 ? (totalPresent / totalApplicable) * 100 : 0
        };
    }, [filteredStudents, studentStats, totalEvents]);

    const exportCSV = () => {
        const headers = ['S.No.', 'Scholar ID', 'Name', 'Course', 'Semester', 'Present', 'Absent', 'NA', 'Possible', 'Percentage'];
        const rows = filteredStudents.map((s, i) => {
            const stats = studentStats[s.scholar_id] || { present: 0, na: 0, absent: 0 };
            const possible = Math.max(0, totalEvents - stats.na);
            const percent = possible > 0 ? ((stats.present / possible) * 100).toFixed(1) : '–';

            return [
                i + 1,
                `"${s.scholar_id}"`,
                `"${s.name}"`,
                `"${s.course}"`,
                s.semester,
                stats.present,
                stats.absent,
                stats.na,
                possible,
                `${percent}%`
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="page-title text-blue-900 font-black">Student Reports</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Smart attendance analytics with eligibility adjustments</p>
                </div>
                <button
                    onClick={exportCSV}
                    disabled={loading || filteredStudents.length === 0}
                    className="flex items-center gap-2 bg-yellow-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                    <ArrowDownTrayIcon className="w-5 h-5" /> Export Detailed CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-6 border-l-4 border-l-blue-600">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Avg. Department Attendance</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        {loading ? <Skeleton className="h-10 w-24" /> : <p className="text-4xl font-black text-blue-900">{globalStats.avg.toFixed(1)}%</p>}
                        <span className="text-xs text-blue-500 font-bold">(Applicable)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                        <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${globalStats.avg}%` }}
                        />
                    </div>
                </div>
                <div className="card p-6 border-l-4 border-l-green-600">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Active Events</p>
                    {loading ? <Skeleton className="h-10 w-16 mt-2" /> : <p className="text-4xl font-black text-blue-900 mt-2">{totalEvents}</p>}
                    <p className="text-[11px] text-gray-500 mt-1 font-semibold">Tracked in system</p>
                </div>
                <div className="card p-6 border-l-4 border-l-amber-500">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Students Monitored</p>
                    {loading ? <Skeleton className="h-10 w-16 mt-2" /> : <p className="text-4xl font-black text-blue-900 mt-2">{filteredStudents.length}</p>}
                    <p className="text-[11px] text-gray-500 mt-1 font-semibold">Active in current view</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm border border-blue-50">
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-1.5 block uppercase tracking-wide flex items-center gap-1">
                        <MagnifyingGlassIcon className="w-3 h-3 text-blue-600" /> Search Name/ID
                    </label>
                    <input
                        type="text"
                        placeholder="Type student name..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="w-full border border-gray-100 bg-gray-50/50 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-1.5 block uppercase tracking-wide flex items-center gap-1">
                        <FunnelIcon className="w-3 h-3 text-blue-600" /> Filter Course
                    </label>
                    <select
                        value={courseFilter}
                        onChange={e => setCourseFilter(e.target.value)}
                        className="w-full border border-gray-100 bg-gray-50/50 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="All">All Courses</option>
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-1.5 block uppercase tracking-wide flex items-center gap-1">
                        <FunnelIcon className="w-3 h-3 text-blue-600" /> Filter Semester
                    </label>
                    <select
                        value={semesterFilter}
                        onChange={e => setSemesterFilter(e.target.value === 'All' ? 'All' : parseInt(e.target.value))}
                        className="w-full border border-gray-100 bg-gray-50/50 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="All">All Semesters</option>
                        {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden shadow-xl border-t-0">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="bg-blue-900 text-white">
                                <th className="px-4 py-4 text-left font-black text-xs uppercase tracking-widest border-b border-blue-800">#</th>
                                <th className="px-4 py-4 text-left font-black text-xs uppercase tracking-widest border-b border-blue-800">Scholar ID</th>
                                <th className="px-4 py-4 text-left font-black text-xs uppercase tracking-widest border-b border-blue-800">Name</th>
                                <th className="px-4 py-4 text-left font-black text-xs uppercase tracking-widest border-b border-blue-800">Course</th>
                                <th className="px-4 py-4 text-center font-black text-xs uppercase tracking-widest border-b border-blue-800">Sem</th>
                                <th className="px-4 py-4 text-center font-black text-xs uppercase tracking-widest border-b border-blue-800 text-green-300">Pres.</th>
                                <th className="px-4 py-4 text-center font-black text-xs uppercase tracking-widest border-b border-blue-800 text-red-300">Abs.</th>
                                <th className="px-4 py-4 text-center font-black text-xs uppercase tracking-widest border-b border-blue-800 text-amber-300">NA</th>
                                <th className="px-4 py-4 text-center font-black text-xs uppercase tracking-widest border-b border-blue-800 text-blue-200">%</th>
                                <th className="px-4 py-4 text-left font-black text-xs uppercase tracking-widest border-b border-blue-800 min-w-[120px]">Analysis</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRowSkeleton key={i} cols={10} />
                                ))
                            ) : filteredStudents.length === 0 ? (
                                <tr><td colSpan={10} className="px-4 py-16 text-center text-gray-400 font-medium italic">No students found matching your criteria.</td></tr>
                            ) : filteredStudents.map((s, i) => {
                                const stats = studentStats[s.scholar_id] || { present: 0, na: 0, absent: 0 };
                                const possible = Math.max(0, totalEvents - stats.na);
                                const percentage = possible > 0 ? (stats.present / possible) * 100 : 0;

                                return (
                                    <tr key={s.scholar_id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-3.5 text-gray-400 text-[10px] font-black">{i + 1}</td>
                                        <td className="px-4 py-3.5 font-mono text-xs text-blue-900 font-bold">{s.scholar_id}</td>
                                        <td className="px-4 py-3.5 font-bold text-gray-800 truncate max-w-[180px]">{s.name}</td>
                                        <td className="px-4 py-3.5">
                                            <span className={`stat-badge border ${getCourseColor(s.course)} text-[10px] font-bold`}>{s.course}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] border shadow-sm ${getSemesterColor(s.semester)}`}>
                                                Sem {s.semester}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-black text-green-600 text-base">{stats.present}</td>
                                        <td className="px-4 py-3.5 text-center font-black text-red-500 text-sm">{stats.absent}</td>
                                        <td className="px-4 py-3.5 text-center font-black text-amber-500 text-sm">{stats.na}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <div className="font-black text-blue-900 text-base">{percentage.toFixed(0)}%</div>
                                            <div className="text-[10px] text-gray-400 font-bold">Of {possible}</div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${percentage >= 75 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                                            percentage >= 40 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                                                            }`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <div className={`text-[10px] font-black uppercase tracking-tight w-12 text-center ${percentage >= 75 ? 'text-green-600' : percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {percentage >= 75 ? 'Good' : percentage >= 40 ? 'Watch' : 'Poor'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-900 rounded-2xl p-6 text-white overflow-hidden relative shadow-lg">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="font-black text-lg">Report Summary</h3>
                        <p className="text-blue-200 text-sm font-medium">Detailed breakdown of the current filtered selection</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest">Total Present</p>
                            <p className="text-2xl font-black">{filteredStudents.reduce((acc, s) => acc + (studentStats[s.scholar_id]?.present || 0), 0)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest">Total Absent</p>
                            <p className="text-2xl font-black">{filteredStudents.reduce((acc, s) => acc + (studentStats[s.scholar_id]?.absent || 0), 0)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest">Total NA</p>
                            <p className="text-2xl font-black">{filteredStudents.reduce((acc, s) => acc + (studentStats[s.scholar_id]?.na || 0), 0)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-300 tracking-widest">Global Stats</p>
                            <p className="text-2xl font-black">{globalStats.avg.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
                {/* Subtle backgrounds */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            </div>
        </div>
    );
}

export default function ReportsPage() {
    return (
        <Suspense fallback={<div className="text-center py-12 text-gray-400 font-bold">Initializing Report Engine...</div>}>
            <ReportsContent />
        </Suspense>
    );
}
