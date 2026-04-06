'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { getStudents } from '@/lib/db/students';
import { getEvents } from '@/lib/db/events';
import { getAllAttendance, getAttendanceByEvent } from '@/lib/db/attendance';
import { getCourseColor, getSemesterColor } from '@/lib/ui';
import { Student, Course, Event } from '@/types';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
    DocumentArrowDownIcon,
    TableCellsIcon,
} from '@heroicons/react/24/outline';
import { Suspense } from 'react';
import { TableRowSkeleton, Skeleton } from '@/components/Skeleton';
import * as XLSX from 'xlsx';

const COURSES: Course[] = ['BCA', 'BIT', 'MCA'];
const SEMESTERS = [1, 2, 3, 4, 5, 6];

const SEM_LABEL: Record<number, string> = {
    1: '1st year', 2: '1st year',
    3: '2nd year', 4: '2nd year',
    5: '3rd year', 6: '3rd year',
};

// ── All exportable columns ─────────────────────────────────────────────────────
const EVENT_EXPORT_COLS = [
    { key: 'sno',            label: 'SN#' },
    { key: 'scholar_id',     label: 'Scholar ID' },
    { key: 'name',           label: 'Name' },
    { key: 'gender',         label: 'Gender' },
    { key: 'contact_number', label: 'Contact' },
    { key: 'email',          label: 'Email' },
    { key: 'course',         label: 'Course' },
    { key: 'semester',       label: 'Year' },
    { key: 'status',         label: 'Status' },
];

// ── PDF helper ─────────────────────────────────────────────────────────────────
async function exportPDF(
    eventName: string,
    eventDate: string,
    rows: { student: Student; status: string }[],
    selectedCols: string[]
) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const pageW = doc.internal.pageSize.getWidth();
    doc.text(eventName, pageW / 2, 18, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Date: ${new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageW / 2, 24, { align: 'center' });
    doc.setTextColor(0);

    const cols = EVENT_EXPORT_COLS.filter(c => selectedCols.includes(c.key));
    const head = [cols.map(c => c.label)];
    const body = rows.map((r, i) => cols.map(c => {
        if (c.key === 'sno') return String(i + 1);
        if (c.key === 'semester') return SEM_LABEL[r.student.semester] ?? `Sem ${r.student.semester}`;
        if (c.key === 'status') return r.status || 'N/A';
        return String((r.student as unknown as Record<string, unknown>)[c.key] ?? '');
    }));

    autoTable(doc, {
        head,
        body,
        startY: 30,
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        margin: { left: 10, right: 10 },
    });

    const safeName = eventName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
    doc.save(`${safeName}_${eventDate}.pdf`);
}

// ── Excel helper ───────────────────────────────────────────────────────────────
function exportExcel(
    eventName: string,
    eventDate: string,
    rows: { student: Student; status: string }[],
    selectedCols: string[]
) {
    const cols = EVENT_EXPORT_COLS.filter(c => selectedCols.includes(c.key));
    const header = cols.map(c => c.label);
    const data = rows.map((r, i) => cols.map(c => {
        if (c.key === 'sno') return i + 1;
        if (c.key === 'semester') return SEM_LABEL[r.student.semester] ?? `Sem ${r.student.semester}`;
        if (c.key === 'status') return r.status || 'N/A';
        return (r.student as unknown as Record<string, unknown>)[c.key] ?? '';
    }));

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

    // Bold header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        if (cell) cell.s = { font: { bold: true } };
    }

    // Column widths
    ws['!cols'] = cols.map(c => ({
        wch: c.key === 'name' ? 28 : c.key === 'email' ? 32 : c.key === 'scholar_id' ? 16 : 14
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventName.replace(/\s+/g, '_')}_${eventDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Status filter options ──────────────────────────────────────────────────────
const STATUS_OPTIONS = [
    { key: 'Present',   label: 'Present',   color: 'bg-green-50 border-green-300 text-green-700' },
    { key: 'Absent',    label: 'Absent',    color: 'bg-red-50 border-red-300 text-red-700' },
    { key: 'NA',        label: 'N/A',       color: 'bg-amber-50 border-amber-300 text-amber-700' },
    { key: 'Unmarked',  label: 'Unmarked',  color: 'bg-gray-50 border-gray-300 text-gray-600' },
];

// ── Event Export Modal ─────────────────────────────────────────────────────────
function EventExportModal({
    events,
    students,
    onClose,
}: {
    events: Event[];
    students: Student[];
    onClose: () => void;
}) {
    const [selectedEventId, setSelectedEventId] = useState('');
    const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
    const [selectedCols, setSelectedCols] = useState<string[]>(EVENT_EXPORT_COLS.map(c => c.key));
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Present', 'Absent', 'NA', 'Unmarked']);
    const [exporting, setExporting] = useState(false);
    const [toast, setToast] = useState('');

    // Preview state
    const [previewRows, setPreviewRows] = useState<{ student: Student; status: string }[] | null>(null);
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const toggleCol = (key: string) =>
        setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const toggleStatus = (key: string) =>
        setSelectedStatuses(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const buildRows = async () => {
        const att = await getAttendanceByEvent(selectedEventId);
        const attMap = new Map(att.map(a => [a.scholar_id, a.status]));
        const PRIORITY: Record<string, number> = { BCA: 0, BIT: 1, MCA: 2 };
        const sorted = [...students].sort((a, b) => {
            const d = (PRIORITY[a.course] ?? 9) - (PRIORITY[b.course] ?? 9);
            return d !== 0 ? d : (a.semester || 0) - (b.semester || 0);
        });
        const allRows = sorted.map(s => ({
            student: s,
            status: (attMap.get(s.scholar_id) as string) ?? 'Unmarked',
        }));
        // Filter by selected statuses
        return allRows.filter(r => selectedStatuses.includes(r.status));
    };

    const handlePreview = async () => {
        if (!selectedEventId) return setToast('Please select an event.');
        if (selectedCols.length === 0) return setToast('Select at least one column.');
        if (selectedStatuses.length === 0) return setToast('Select at least one status.');
        setToast('');
        setLoadingPreview(true);
        try {
            const rows = await buildRows();
            const event = events.find(e => e.event_id === selectedEventId)!;
            setPreviewRows(rows);
            setPreviewEvent(event);
        } catch (e) {
            console.error(e);
            setToast('Failed to load preview.');
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleExport = async () => {
        if (!previewRows || !previewEvent) return;
        setExporting(true);
        try {
            // Re-number rows for export (sno is positional)
            if (format === 'pdf') {
                await exportPDF(previewEvent.event_name, previewEvent.event_date, previewRows, selectedCols);
            } else {
                exportExcel(previewEvent.event_name, previewEvent.event_date, previewRows, selectedCols);
            }
            onClose();
        } catch (e) {
            console.error(e);
            setToast('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const previewCols = EVENT_EXPORT_COLS.filter(c => selectedCols.includes(c.key));

    // ── Preview screen ──────────────────────────────────────────────────────────
    if (previewRows !== null && previewEvent !== null) {
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-blue-900 shrink-0">
                        <div>
                            <h3 className="font-bold text-white">Preview — {previewEvent.event_name}</h3>
                            <p className="text-blue-300 text-[10px] uppercase tracking-wider font-semibold">
                                {previewRows.length} students · {format === 'pdf' ? 'PDF' : 'Excel'}
                            </p>
                        </div>
                        <button onClick={() => setPreviewRows(null)} className="text-blue-200 hover:text-white transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Preview table */}
                    <div className="flex-1 overflow-auto">
                        {previewRows.length === 0 ? (
                            <div className="flex items-center justify-center h-48 text-gray-400 font-medium italic">
                                No students match the selected status filters.
                            </div>
                        ) : (
                            <table className="w-full text-sm border-separate border-spacing-0 min-w-[600px]">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-blue-900 text-white">
                                        {previewCols.map(c => (
                                            <th key={c.key} className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide border-b border-blue-800">
                                                {c.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {previewRows.map((r, i) => (
                                        <tr key={r.student.scholar_id} className={`transition-colors ${
                                            r.status === 'Present' ? 'bg-green-50/60' :
                                            r.status === 'Absent'  ? 'bg-red-50/60'   :
                                            r.status === 'NA'      ? 'bg-amber-50/60' : ''
                                        }`}>
                                            {previewCols.map(c => {
                                                let val: string;
                                                if (c.key === 'sno') val = String(i + 1);
                                                else if (c.key === 'semester') val = SEM_LABEL[r.student.semester] ?? `Sem ${r.student.semester}`;
                                                else if (c.key === 'status') val = r.status === 'Unmarked' ? 'N/A' : r.status;
                                                else val = String((r.student as unknown as Record<string, unknown>)[c.key] ?? '');
                                                return (
                                                    <td key={c.key} className="px-4 py-2.5 text-xs text-gray-700 font-medium">
                                                        {c.key === 'status' ? (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                r.status === 'Present' ? 'bg-green-100 border-green-300 text-green-700' :
                                                                r.status === 'Absent'  ? 'bg-red-100 border-red-300 text-red-700' :
                                                                r.status === 'NA'      ? 'bg-amber-100 border-amber-300 text-amber-700' :
                                                                'bg-gray-100 border-gray-300 text-gray-500'
                                                            }`}>{val}</span>
                                                        ) : val}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
                        <div className="text-xs text-gray-500 font-medium">
                            <span className="font-bold text-blue-900">{previewRows.length}</span> record{previewRows.length !== 1 ? 's' : ''} will be exported
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPreviewRows(null)}
                                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting || previewRows.length === 0}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                                    format === 'pdf' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {exporting ? (
                                    <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Exporting...</>
                                ) : (
                                    <><ArrowDownTrayIcon className="w-4 h-4" /> Download {format === 'pdf' ? 'PDF' : 'Excel'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Settings screen ─────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-blue-900">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-800 p-2 rounded-lg">
                            <DocumentArrowDownIcon className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Export Event Report</h3>
                            <p className="text-blue-300 text-[10px] uppercase tracking-wider font-semibold">Excel or PDF · Custom columns · Status filter</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

                    {/* Event selector */}
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Select Event *</label>
                        <select
                            value={selectedEventId}
                            onChange={e => setSelectedEventId(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Choose an event --</option>
                            {events.map(ev => (
                                <option key={ev.event_id} value={ev.event_id}>
                                    {ev.event_name}  ·  {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Format selector */}
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Export Format</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFormat('excel')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${format === 'excel' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                <TableCellsIcon className="w-5 h-5" />
                                Excel (.xlsx)
                            </button>
                            <button
                                onClick={() => setFormat('pdf')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${format === 'pdf' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                <DocumentArrowDownIcon className="w-5 h-5" />
                                PDF (.pdf)
                            </button>
                        </div>
                    </div>

                    {/* Status filter */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Include Students By Status</label>
                            <div className="flex gap-3">
                                <button onClick={() => setSelectedStatuses(STATUS_OPTIONS.map(s => s.key))} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">All</button>
                                <button onClick={() => setSelectedStatuses([])} className="text-[10px] font-bold text-red-500 hover:underline uppercase">None</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {STATUS_OPTIONS.map(st => (
                                <label
                                    key={st.key}
                                    className={`flex items-center gap-2.5 cursor-pointer px-3 py-2.5 rounded-xl border-2 transition-all font-bold text-xs ${
                                        selectedStatuses.includes(st.key) ? st.color : 'bg-gray-50 border-gray-200 text-gray-400'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedStatuses.includes(st.key)}
                                        onChange={() => toggleStatus(st.key)}
                                        className="w-3.5 h-3.5 rounded"
                                    />
                                    {st.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Column selector */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Columns</label>
                            <div className="flex gap-3">
                                <button onClick={() => setSelectedCols(EVENT_EXPORT_COLS.map(c => c.key))} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">All</button>
                                <button onClick={() => setSelectedCols([])} className="text-[10px] font-bold text-red-500 hover:underline uppercase">None</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {EVENT_EXPORT_COLS.map(col => (
                                <label
                                    key={col.key}
                                    className={`flex items-center gap-2.5 cursor-pointer px-3 py-2.5 rounded-xl border transition-all ${
                                        selectedCols.includes(col.key)
                                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedCols.includes(col.key)}
                                        onChange={() => toggleCol(col.key)}
                                        className="w-3.5 h-3.5 text-blue-600 rounded"
                                    />
                                    <span className="text-xs font-semibold">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {toast && (
                        <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-lg border border-red-100">{toast}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">{selectedCols.length} col · {selectedStatuses.length} status</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handlePreview}
                            disabled={loadingPreview || !selectedEventId}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-700 hover:bg-blue-800 shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loadingPreview ? (
                                <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Loading...</>
                            ) : (
                                <>Preview →</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Reports Content ───────────────────────────────────────────────────────
function ReportsContent() {
    const [students, setStudents] = useState<Student[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [totalEvents, setTotalEvents] = useState(0);
    const [studentStats, setStudentStats] = useState<{ [scholar_id: string]: { present: number; na: number; absent: number } }>({});
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState<string>('All');
    const [semesterFilter, setSemesterFilter] = useState<number | 'All'>('All');
    const [showEventExport, setShowEventExport] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [stds, evts, att] = await Promise.all([
                    getStudents(),
                    getEvents(),
                    getAllAttendance(),
                ]);

                const COURSE_PRIORITY: Record<string, number> = { 'BCA': 0, 'BIT': 1, 'MCA': 2 };
                const sortedStds = stds.sort((a, b) => {
                    const pA = COURSE_PRIORITY[a.course] ?? 99;
                    const pB = COURSE_PRIORITY[b.course] ?? 99;
                    if (pA !== pB) return pA - pB;
                    return (a.semester || 0) - (b.semester || 0);
                });

                setStudents(sortedStds);
                setEvents(evts);
                setTotalEvents(evts.length);

                const statsMap: { [id: string]: { present: number; na: number; absent: number } } = {};
                stds.forEach(s => { statsMap[s.scholar_id] = { present: 0, na: 0, absent: 0 }; });
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
            totalPresent += stats.present;
            totalApplicable += stats.present + stats.absent;
        });
        return { avg: totalApplicable > 0 ? (totalPresent / totalApplicable) * 100 : 0 };
    }, [filteredStudents, studentStats]);

    const exportCSV = () => {
        const headers = ['S.No.', 'Scholar ID', 'Name', 'Course', 'Semester', 'Present', 'Absent', 'NA', 'Possible', 'Percentage'];
        const rows = filteredStudents.map((s, i) => {
            const stats = studentStats[s.scholar_id] || { present: 0, na: 0, absent: 0 };
            const possible = stats.present + stats.absent;
            const percent = possible > 0 ? ((stats.present / possible) * 100).toFixed(1) : '–';
            return [i + 1, `"${s.scholar_id}"`, `"${s.name}"`, `"${s.course}"`, s.semester, stats.present, stats.absent, stats.na, possible, `${percent}%`].join(',');
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

            {showEventExport && (
                <EventExportModal events={events} students={students} onClose={() => setShowEventExport(false)} />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="page-title text-blue-900 font-black">Student Reports</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Smart attendance analytics with eligibility adjustments</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* ── Event-specific export ── */}
                    <button
                        onClick={() => setShowEventExport(true)}
                        disabled={loading || events.length === 0}
                        className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        Export Event Report
                    </button>
                    <button
                        onClick={exportCSV}
                        disabled={loading || filteredStudents.length === 0}
                        className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
                    </button>
                </div>
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
                        <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${globalStats.avg}%` }} />
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
                                const possible = stats.present + stats.absent;
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
                                                            percentage >= 40 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`}
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
