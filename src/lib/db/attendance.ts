import { supabase } from '../supabase';
import { AttendanceRecord } from '@/types';

export async function getAttendanceByEvent(event_id: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
        .from('attendance')
        .select('scholar_id, event_id, status')
        .eq('event_id', event_id);
    if (error) throw error;
    return data ?? [];
}

export async function upsertAttendance(records: AttendanceRecord[]): Promise<void> {
    if (records.length === 0) return;
    const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'scholar_id,event_id' });
    if (error) throw error;
}

export async function getAttendanceReport(event_id: string) {
    const { data, error } = await supabase
        .from('attendance')
        .select(`
      status,
      students (
        scholar_id,
        name,
        gender,
        course,
        semester,
        contact_number,
        email
      )
    `)
        .eq('event_id', event_id);
    if (error) throw error;
    return data ?? [];
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
        .from('attendance')
        .select('scholar_id, event_id, status');
    if (error) throw error;
    return data ?? [];
}
