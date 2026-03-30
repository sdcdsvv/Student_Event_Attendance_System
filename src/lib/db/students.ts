import { supabase } from '../supabase';
import { Student } from '@/types';

export async function getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name');
    if (error) throw error;
    return data ?? [];
}

export async function addStudent(student: Student): Promise<void> {
    const { error } = await supabase.from('students').insert(student);
    if (error) throw error;
}

export async function updateStudent(scholar_id: string, student: Partial<Student>): Promise<void> {
    const { error } = await supabase
        .from('students')
        .update(student)
        .eq('scholar_id', scholar_id);
    if (error) throw error;
}

export async function deleteStudent(scholar_id: string): Promise<void> {
    const { error } = await supabase
        .from('students')
        .delete()
        .eq('scholar_id', scholar_id);
    if (error) throw error;
}

export async function searchStudents(query: string): Promise<Student[]> {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .or(`name.ilike.%${query}%,scholar_id.ilike.%${query}%`)
        .order('name');
    if (error) throw error;
    return data ?? [];
}
