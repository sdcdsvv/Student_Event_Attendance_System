'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getStudents, addStudent, updateStudent, searchStudents, deleteStudent } from '@/lib/db/students';
import { downloadCSV, parseCSV, parseExcel, downloadExcel } from '@/lib/storage';
import { getCourseColor, getSemesterColor } from '@/lib/ui';
import { Student, Course, Gender } from '@/types';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    TrashIcon,
    PencilSquareIcon,
    XMarkIcon,
    ArrowUpTrayIcon,
    CheckCircleIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import { Suspense } from 'react';

const COURSES: Course[] = ['BCA', 'BIT', 'MCA'];
const GENDERS: Gender[] = ['Male', 'Female', 'Other'];
const SEMESTERS = [1, 2, 3, 4, 5, 6];

const emptyForm: Student = {
    scholar_id: '',
    name: '',
    gender: 'Male',
    course: 'BCA',
    semester: 1,
    contact_number: '',
    email: '',
};

function StudentsContent() {
    const searchParams = useSearchParams();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(searchParams.get('new') === '1');
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState<Student>(emptyForm);
    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Filters State
    const [filterCourse, setFilterCourse] = useState<string>('All');
    const [filterSemester, setFilterSemester] = useState<string>('All');

    // Import Preview State
    const [previewData, setPreviewData] = useState<Student[] | null>(null);
    const [importing, setImporting] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let data = query.trim() ? await searchStudents(query.trim()) : await getStudents();

            // Apply Manual Filters
            if (filterCourse !== 'All') {
                data = data.filter(s => s.course === filterCourse);
            }
            if (filterSemester !== 'All') {
                data = data.filter(s => s.semester === parseInt(filterSemester));
            }

            // Custom Sorting: BCA (Sem Asc) -> BIT -> MCA
            const COURSE_PRIORITY: Record<string, number> = { 'BCA': 0, 'BIT': 1, 'MCA': 2 };
            const sortedData = data.sort((a, b) => {
                const pA = COURSE_PRIORITY[a.course] ?? 99;
                const pB = COURSE_PRIORITY[b.course] ?? 99;
                if (pA !== pB) return pA - pB;
                return (a.semester || 0) - (b.semester || 0);
            });

            setStudents(sortedData);
        } catch {
            showToast('Failed to load students', 'error');
        } finally {
            setLoading(false);
        }
    }, [query, filterCourse, filterSemester]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editMode) {
                await updateStudent(form.scholar_id, form);
                showToast('Student updated successfully');
            } else {
                await addStudent(form);
                showToast('Student added successfully');
            }
            setShowModal(false);
            setForm(emptyForm);
            setEditMode(false);
            load();
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to save student', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteStudent(id);
            showToast('Student deleted');
            load();
        } catch {
            showToast('Failed to delete student', 'error');
        } finally {
            setDeleteId(null);
        }
    };

    const field = (key: keyof Student, value: string | number) =>
        setForm(prev => ({ ...prev, [key]: value }));

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

            // Define Synonyms
            const scholarIdx = findHeaderIndex(headers, ['scholarid', 'sid', 'id', 'studentroll', 'rollnumber', 'rollno', 'schid']);
            const nameIdx = findHeaderIndex(headers, ['name', 'fullname', 'studentname', 'nameofthestudent', 'sname']);
            const genderIdx = findHeaderIndex(headers, ['gender', 'sex', 'mfx']);
            const courseIdx = findHeaderIndex(headers, ['course', 'branch', 'stream', 'department', 'class']);
            const semIdx = findHeaderIndex(headers, ['semester', 'sem', 'semestercode', 'session']);
            const contactIdx = findHeaderIndex(headers, ['contactnumber', 'contact', 'mobile', 'phone', 'mobilenumber', 'phonenumber', 'cell']);
            const emailIdx = findHeaderIndex(headers, ['email', 'emailid', 'studentemail', 'mail']);

            if (scholarIdx === -1 || nameIdx === -1) {
                return showToast('Missing required columns: Scholar ID and Name', 'error');
            }

            const parsedData: Student[] = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[scholarIdx] || !row[nameIdx]) continue;

                parsedData.push({
                    scholar_id: String(row[scholarIdx]).trim(),
                    name: String(row[nameIdx]).trim(),
                    gender: (genderIdx !== -1 && row[genderIdx] ? (String(row[genderIdx]).trim() as Gender) : 'Male'),
                    course: (courseIdx !== -1 && row[courseIdx] ? (String(row[courseIdx]).trim() as Course) : 'BCA'),
                    semester: (semIdx !== -1 && row[semIdx] ? parseInt(String(row[semIdx])) : 1),
                    contact_number: (contactIdx !== -1 && row[contactIdx] ? String(row[contactIdx]).trim() : ''),
                    email: (emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : ''),
                });
            }

            if (parsedData.length === 0) return showToast('No valid student records found', 'error');
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
        let failed = 0;

        for (const student of previewData) {
            try {
                await addStudent(student);
                imported++;
            } catch (err) {
                console.error('Import failed for', student.scholar_id, err);
                failed++;
            }
        }

        showToast(`Imported ${imported} students. ${failed > 0 ? `Failed ${failed} entries.` : ''}`);
        setPreviewData(null);
        setImporting(false);
        load();
    };

    const downloadTemplate = (format: 'csv' | 'excel') => {
        const headers = ['Scholar ID', 'Name', 'Gender', 'Course', 'Semester', 'Contact Number', 'Email'];
        const data = [['2024CS001', 'John Doe', 'Male', 'BCA', '1', '9876543210', 'john@dsvv.ac.in']];

        if (format === 'csv') {
            downloadCSV('students_template.csv', headers, data);
        } else {
            downloadExcel('students_template.xlsx', headers, data);
        }
    };

    const clearFilters = () => {
        setQuery('');
        setFilterCourse('All');
        setFilterSemester('All');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.msg}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="page-title">Student Management</h2>
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
                        onClick={() => { setShowModal(true); setForm(emptyForm); setEditMode(false); }}
                        className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" /> Add Student
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <div className="card px-3 py-2 flex items-center gap-2 flex-1 min-w-0">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search by name or Scholar ID..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400 min-w-0"
                    />
                </div>

                <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 md:pb-0">
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

                    {(query || filterCourse !== 'All' || filterSemester !== 'All') && (
                        <button
                            onClick={clearFilters}
                            className="text-xs font-bold text-red-500 hover:text-red-600 px-2 transition-colors uppercase tracking-tight shrink-0"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="bg-blue-900 text-white">
                                <th className="px-4 py-3 text-left font-semibold">#</th>
                                <th className="px-4 py-3 text-left font-semibold">Scholar ID</th>
                                <th className="px-4 py-3 text-left font-semibold">Name</th>
                                <th className="px-4 py-3 text-left font-semibold">Gender</th>
                                <th className="px-4 py-3 text-left font-semibold">Course</th>
                                <th className="px-4 py-3 text-left font-semibold text-center">Sem</th>
                                <th className="px-4 py-3 text-left font-semibold">Contact</th>
                                <th className="px-4 py-3 text-left font-semibold">Email</th>
                                <th className="px-4 py-3 text-center font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                                    {(query || filterCourse !== 'All' || filterSemester !== 'All')
                                        ? 'No students match your filters.'
                                        : 'No students yet. Add one!'}
                                </td></tr>
                            ) : students.map((s, i) => (
                                <tr key={s.scholar_id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-4 py-3 text-gray-400 text-xs border-b border-gray-50">{i + 1}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-blue-800 border-b border-gray-50">{s.scholar_id}</td>
                                    <td className="px-4 py-3 font-medium border-b border-gray-50">{s.name}</td>
                                    <td className="px-4 py-3 text-gray-600 border-b border-gray-50">{s.gender}</td>
                                    <td className="px-4 py-3 border-b border-gray-50">
                                        <span className={`stat-badge border ${getCourseColor(s.course)}`}>{s.course}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center border-b border-gray-50 font-bold">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] border ${getSemesterColor(s.semester)}`}>
                                            Sem {s.semester}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-[11px] border-b border-gray-50">{s.contact_number || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 text-[11px] border-b border-gray-50">{s.email || '—'}</td>
                                    <td className="px-4 py-3 text-center border-b border-gray-50">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => { setForm(s); setEditMode(true); setShowModal(true); }}
                                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            {deleteId === s.scholar_id ? (
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleDelete(s.scholar_id)} className="text-xs text-red-600 font-semibold hover:underline">Confirm</button>
                                                    <button onClick={() => setDeleteId(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeleteId(s.scholar_id)} className="text-gray-400 hover:text-red-500 transition-colors">
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
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center">
                    <span>Showing {students.length} student{students.length !== 1 ? 's' : ''}</span>
                    {(query || filterCourse !== 'All' || filterSemester !== 'All') && (
                        <span className="italic text-blue-500">Filtered View</span>
                    )}
                </div>
            </div>

            {/* Import Preview Modal */}
            {previewData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-800 p-2 rounded-lg">
                                    <ArrowUpTrayIcon className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white leading-tight">Import Preview</h3>
                                    <p className="text-blue-300 text-[10px] uppercase tracking-wider font-semibold">Verify data before saving to cloud</p>
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
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase">Scholar ID</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase">Name</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase text-blue-600">Gender</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase text-blue-600">Course</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase text-blue-600">Sem</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase">Mobile</th>
                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewData.map((s, i) => (
                                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="px-4 py-2 color-gray-400 text-xs">{i + 1}</td>
                                            <td className="px-4 py-2 font-mono text-xs text-blue-900 font-semibold">{s.scholar_id}</td>
                                            <td className="px-4 py-2 font-medium text-gray-800">{s.name}</td>
                                            <td className="px-4 py-2 text-gray-600">{s.gender}</td>
                                            <td className="px-4 py-2">
                                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">{s.course}</span>
                                            </td>
                                            <td className="px-4 py-2 text-center font-bold text-blue-600">{s.semester}</td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{s.contact_number || <span className="text-gray-300 italic">None</span>}</td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{s.email || <span className="text-gray-300 italic">None</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200 shrink-0">
                            <span className="text-sm text-gray-500">Ready to import <span className="font-bold text-blue-900">{previewData.length}</span> student records.</span>
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

            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-blue-900">{editMode ? 'Edit Student' : 'Add New Student'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Scholar ID *</label>
                                    <input
                                        required
                                        disabled={editMode}
                                        value={form.scholar_id}
                                        onChange={e => field('scholar_id', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                                        placeholder="e.g. 2024CS001"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                                    <input
                                        required
                                        value={form.name}
                                        onChange={e => field('name', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Student name"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Gender *</label>
                                    <select
                                        value={form.gender}
                                        onChange={e => field('gender', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {GENDERS.map(g => <option key={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Course *</label>
                                    <select
                                        value={form.course}
                                        onChange={e => field('course', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {COURSES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Semester *</label>
                                    <select
                                        value={form.semester}
                                        onChange={e => field('semester', parseInt(e.target.value))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Contact Number</label>
                                    <input
                                        value={form.contact_number}
                                        onChange={e => field('contact_number', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Mobile number"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => field('email', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="student@dsvv.ac.in"
                                />
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
                                    {saving ? 'Saving...' : editMode ? 'Update Student' : 'Add Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StudentsPage() {
    return (
        <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading...</div>}>
            <StudentsContent />
        </Suspense>
    );
}
