'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getEvents, addEvent, updateEvent, deleteEvent } from '@/lib/db/events';
import { getStudents } from '@/lib/db/students';
import { getAllAttendance } from '@/lib/db/attendance';
import { downloadCSV, parseCSV, parseExcel, downloadExcel } from '@/lib/storage';
import { Event } from '@/types';
import {
    PlusIcon,
    TrashIcon,
    PencilSquareIcon,
    ClipboardDocumentCheckIcon,
    XMarkIcon,
    ArrowUpTrayIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Suspense } from 'react';

const emptyForm = { event_name: '', event_date: '', event_time: '' };

function EventsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(searchParams.get('new') === '1');
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [stats, setStats] = useState<Record<string, { present: number; total: number; na: number }>>({});

    // Import Preview State
    const [previewData, setPreviewData] = useState<Event[] | null>(null);
    const [importing, setImporting] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [evts, students, att] = await Promise.all([
                getEvents(),
                getStudents(),
                getAllAttendance()
            ]);
            setEvents(evts);

            const newStats: Record<string, { present: number; total: number; na: number }> = {};
            evts.forEach(dev => {
                const eventAtt = att.filter(a => a.event_id === dev.event_id);
                newStats[dev.event_id] = {
                    present: eventAtt.filter(a => a.status === 'Present').length,
                    na: eventAtt.filter(a => a.status === 'NA').length,
                    total: students.length
                };
            });
            setStats(newStats);
        } catch {
            showToast('Failed to load events data', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const eventData = {
                event_name: form.event_name,
                event_date: form.event_date,
                event_time: form.event_time || null,
            };

            if (editMode && editId) {
                await updateEvent(editId, eventData);
                showToast('Event updated successfully');
            } else {
                await addEvent(eventData);
                showToast('Event created successfully');
            }
            setShowModal(false);
            setForm(emptyForm);
            setEditMode(false);
            setEditId(null);
            load();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to save event', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteEvent(id);
            showToast('Event deleted');
            load();
        } catch {
            showToast('Failed to delete event', 'error');
        } finally {
            setDeleteId(null);
        }
    };

    const findHeaderIndex = (headers: string[], synonyms: string[]) => {
        return headers.findIndex(h => {
            const clean = (h || '').toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            return synonyms.includes(clean);
        });
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const reader = new FileReader();

        reader.onload = async (event) => {
            let rows: any[][] = [];
            try {
                if (isExcel) {
                    rows = parseExcel(event.target?.result as ArrayBuffer);
                } else {
                    rows = parseCSV(event.target?.result as string);
                }
            } catch (err) {
                console.error('File parsing failed', err);
                return showToast('Failed to parse file. Check format.', 'error');
            }

            if (rows.length < 2) return showToast('File has no data or invalid format', 'error');

            const headers = rows[0].map(h => (h || '').toString());

            const nameIdx = findHeaderIndex(headers, ['eventname', 'name', 'title', 'eventtitle', 'ename']);
            const dateIdx = findHeaderIndex(headers, ['date', 'eventdate', 'whendate', 'day', 'edate']);
            const timeIdx = findHeaderIndex(headers, ['time', 'eventtime', 'duration', 'at', 'etime']);

            if (nameIdx === -1 || dateIdx === -1) {
                return showToast('Missing columns: Event Name and Date', 'error');
            }

            const parseDateValue = (val: any): string => {
                if (!val) return '';
                if (val instanceof Date) return val.toISOString().split('T')[0];
                if (typeof val === 'number') {
                    // Excel serial date (days since 1900-01-01)
                    const date = new Date((val - 25569) * 86400 * 1000);
                    return date.toISOString().split('T')[0];
                }
                return String(val).trim();
            };

            const parseTimeValue = (val: any): string | null => {
                if (!val) return null;
                if (val instanceof Date) {
                    // Extract HH:mm:ss from Date object
                    return val.toTimeString().split(' ')[0];
                }
                if (typeof val === 'number') {
                    // Excel time is a fraction of a day
                    const totalSeconds = Math.round(val * 86400);
                    const hours = Math.floor(totalSeconds / 3600) % 24;
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
                }
                const str = String(val).trim();
                if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
                    // Normalize to HH:mm or HH:mm:ss
                    const parts = str.split(':');
                    return parts.map(p => p.padStart(2, '0')).join(':');
                }
                return null;
            };

            const parsedData: Event[] = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[nameIdx] || !row[dateIdx]) continue;

                parsedData.push({
                    event_name: String(row[nameIdx]).trim(),
                    event_date: parseDateValue(row[dateIdx]),
                    event_time: parseTimeValue(row[timeIdx]),
                } as Event);
            }

            if (parsedData.length === 0) return showToast('No valid event records found', 'error');
            setPreviewData(parsedData);
            e.target.value = '';
        };

        if (isExcel) reader.readAsArrayBuffer(file);
        else reader.readAsText(file);
    };

    const confirmImport = async () => {
        if (!previewData) return;
        setImporting(true);
        let imported = 0;

        for (const ev of previewData) {
            try {
                await addEvent(ev);
                imported++;
            } catch (err) {
                console.error('Import failed for event', ev.event_name, err);
            }
        }

        showToast(`Successfully imported ${imported} events.`);
        setPreviewData(null);
        setImporting(false);
        load();
    };

    const downloadTemplate = (format: 'csv' | 'excel') => {
        const headers = ['Event Name', 'Date', 'Time'];
        const data = [['Departmental Seminar', '2024-04-20', '14:30']];
        if (format === 'csv') {
            downloadCSV('events_template.csv', headers, data);
        } else {
            downloadExcel('events_template.xlsx', headers, data);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '–';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.msg}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="page-title">Event Management</h2>
                <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
                        <span className="text-[10px] font-bold text-gray-400 px-2 uppercase">Templates</span>
                        <button onClick={() => downloadTemplate('excel')} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 font-medium">Excel</button>
                        <button onClick={() => downloadTemplate('csv')} className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 font-medium">CSV</button>
                    </div>
                    <label className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors cursor-pointer">
                        <ArrowUpTrayIcon className="w-4 h-4" /> Import Excel/CSV
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" />
                    </label>
                    <button
                        onClick={() => { setShowModal(true); setForm(emptyForm); setEditMode(false); setEditId(null); }}
                        className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" /> Create Event
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-blue-900 text-white">
                                <th className="px-4 py-3 text-left font-semibold">#</th>
                                <th className="px-4 py-3 text-left font-semibold">Event Name</th>
                                <th className="px-4 py-3 text-left font-semibold">Date</th>
                                <th className="px-4 py-3 text-left font-semibold">Time</th>
                                <th className="px-4 py-3 text-left font-semibold">Progress</th>
                                <th className="px-4 py-3 text-center font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                            ) : events.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No events yet. Create one!</td></tr>
                            ) : events.map((ev, i) => (
                                <tr key={ev.event_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                    <td className="px-4 py-3 font-medium">{ev.event_name}</td>
                                    <td className="px-4 py-3 text-gray-600">{formatDate(ev.event_date)}</td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {ev.event_time
                                            ? new Date(`1970-01-01T${ev.event_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                            : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {stats[ev.event_id] ? (
                                            <div className="flex flex-col gap-1 w-24">
                                                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                                    <span>
                                                        {stats[ev.event_id].total - stats[ev.event_id].na > 0
                                                            ? ((stats[ev.event_id].present / (stats[ev.event_id].total - stats[ev.event_id].na)) * 100).toFixed(0)
                                                            : 0}%
                                                    </span>
                                                    <span>{stats[ev.event_id].present}/{stats[ev.event_id].total - stats[ev.event_id].na}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-100/50">
                                                    <div
                                                        className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out"
                                                        style={{
                                                            width: `${stats[ev.event_id].total - stats[ev.event_id].na > 0
                                                                ? (stats[ev.event_id].present / (stats[ev.event_id].total - stats[ev.event_id].na)) * 100
                                                                : 0}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-24 h-1.5 bg-gray-100 rounded-full animate-pulse" />
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setForm({
                                                        event_name: ev.event_name,
                                                        event_date: ev.event_date,
                                                        event_time: ev.event_time || ''
                                                    });
                                                    setEditMode(true);
                                                    setEditId(ev.event_id);
                                                    setShowModal(true);
                                                }}
                                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => router.push(`/attendance?event=${ev.event_id}`)}
                                                className="flex items-center gap-1 text-xs bg-yellow-400 text-blue-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
                                            >
                                                <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
                                                Attendance
                                            </button>
                                            {deleteId === ev.event_id ? (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleDelete(ev.event_id)} className="text-xs text-red-600 font-semibold hover:underline">Confirm</button>
                                                    <button onClick={() => setDeleteId(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeleteId(ev.event_id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                    {events.length} event{events.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Import Preview Modal */}
            {previewData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-800 p-2 rounded-lg">
                                    <ArrowUpTrayIcon className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white leading-tight">Events Preview</h3>
                                    <p className="text-blue-300 text-[10px] uppercase tracking-wider font-semibold">Check event details before importing</p>
                                </div>
                            </div>
                            <button onClick={() => setPreviewData(null)} className="text-blue-200 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-sm border-spacing-0">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase">#</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase">Event Name</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase">Date</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewData.map((ev, i) => (
                                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="px-4 py-2 color-gray-400 text-xs">{i + 1}</td>
                                            <td className="px-4 py-2 font-medium text-gray-800">{ev.event_name}</td>
                                            <td className="px-4 py-2 text-gray-600 font-mono text-xs">{ev.event_date}</td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{ev.event_time || <span className="text-gray-300 italic">None</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200 shrink-0">
                            <span className="text-sm text-gray-500">Ready to import <span className="font-bold text-blue-900">{previewData.length}</span> events.</span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPreviewData(null)}
                                    className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmImport}
                                    disabled={importing}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-700 text-white rounded-xl font-bold text-sm hover:bg-blue-800 shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {importing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-5 h-5" />
                                            Confirm & Import
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-blue-900">{editMode ? 'Edit Event' : 'Create New Event'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Event Name *</label>
                                <input
                                    required
                                    value={form.event_name}
                                    onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Annual Cultural Fest"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Event Date *</label>
                                    <input
                                        required
                                        type="date"
                                        value={form.event_date}
                                        onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Event Time <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <input
                                        type="time"
                                        value={form.event_time}
                                        onChange={e => setForm(p => ({ ...p, event_time: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors"
                                >
                                    {saving ? 'Saving...' : editMode ? 'Update Event' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EventsPage() {
    return (
        <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading...</div>}>
            <EventsContent />
        </Suspense>
    );
}
