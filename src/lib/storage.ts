import * as XLSX from 'xlsx';

/**
 * Simple localStorage wrapper (kept for backward compatibility/utilities)
 */
const IS_SERVER = typeof window === 'undefined';

export function getStorageItem<T>(key: string, defaultValue: T): T {
    if (IS_SERVER) return defaultValue;
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
}

export function setStorageItem<T>(key: string, value: T): void {
    if (IS_SERVER) return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing localStorage key "${key}":`, error);
    }
}

/**
 * CSV Utility: Parses a simple CSV string into string[][]
 */
export function parseCSV(csv: string): string[][] {
    return csv
        .split(/\r?\n/)
        .filter(line => line.trim() !== '')
        .map(line => {
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : [];
        });
}

/**
 * CSV Utility: Triggers CSV file download
 */
export function downloadCSV(filename: string, headers: string[], data: any[][]) {
    const csv = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Excel Utility: Parses .xlsx ArrayBuffer to raw any[][]
 */
export function parseExcel(data: ArrayBuffer): any[][] {
    const workbook = XLSX.read(data, { cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // Return raw values (Numbers, Dates, Strings) for better processing upstream
    return XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
}

/**
 * Excel Utility: Downloads an .xlsx template
 */
export function downloadExcel(filename: string, headers: string[], data: any[][]) {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buf = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}

// Storage Keys
export const STORE_STUDENTS = 'dsvv_students';
export const STORE_EVENTS = 'dsvv_events';
export const STORE_ATTENDANCE = 'dsvv_attendance';
