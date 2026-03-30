import { supabase } from '../supabase';
import { Event } from '@/types';

export async function getEvents(): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function getEventById(event_id: string): Promise<Event | null> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_id', event_id)
        .single();
    if (error) throw error;
    return data;
}

export async function addEvent(event: Omit<Event, 'event_id'>): Promise<void> {
    const { error } = await supabase.from('events').insert(event);
    if (error) throw error;
}

export async function deleteEvent(event_id: string): Promise<void> {
    const { error } = await supabase
        .from('events')
        .delete()
        .eq('event_id', event_id);
    if (error) throw error;
}

export async function updateEvent(event_id: string, event: Partial<Event>): Promise<void> {
    const { error } = await supabase
        .from('events')
        .update(event)
        .eq('event_id', event_id);
    if (error) throw error;
}
