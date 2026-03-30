'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStudents } from '@/lib/db/students';
import { getEvents } from '@/lib/db/events';
import { getAllAttendance } from '@/lib/db/attendance';
import { Event } from '@/types';
import {
  UsersIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [avgAttendance, setAvgAttendance] = useState<number | null>(null);
  const [eventStats, setEventStats] = useState<Record<string, { present: number; total: number; na: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [students, evts, att] = await Promise.all([
          getStudents(),
          getEvents(),
          getAllAttendance()
        ]);
        setStudentCount(students.length);
        setEvents(evts);

        if (students.length > 0 && evts.length > 0) {
          const presentCount = att.filter(r => r.status === 'Present').length;
          const naCount = att.filter(r => r.status === 'NA').length;
          const totalPossible = (students.length * evts.length) - naCount;
          setAvgAttendance(totalPossible > 0 ? (presentCount / totalPossible) * 100 : 0);

          const newStats: Record<string, { present: number; total: number; na: number }> = {};
          evts.forEach(dev => {
            const eventAtt = att.filter(a => a.event_id === dev.event_id);
            newStats[dev.event_id] = {
              present: eventAtt.filter(a => a.status === 'Present').length,
              na: eventAtt.filter(a => a.status === 'NA').length,
              total: students.length
            };
          });
          setEventStats(newStats);
        } else {
          setAvgAttendance(0);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const recentEvents = events.slice(0, 5);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="page-title">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Status overview of the CS Dept Attendance System</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ⚠️ {error}.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 group hover:border-blue-300 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-600 transition-colors">
              <UsersIcon className="w-6 h-6 text-blue-700 group-hover:text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Students</p>
              <p className="text-2xl font-bold text-blue-900">
                {loading ? '—' : (studentCount ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 group hover:border-yellow-300 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 p-3 rounded-xl group-hover:bg-yellow-500 transition-colors">
              <CalendarIcon className="w-6 h-6 text-yellow-700 group-hover:text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Events</p>
              <p className="text-2xl font-bold text-blue-900">
                {loading ? '—' : events.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 group hover:border-green-300 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-600 transition-colors">
              <ChartBarIcon className="w-6 h-6 text-green-700 group-hover:text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avg. Attendance</p>
              <p className="text-2xl font-bold text-blue-900">
                {loading ? '—' : `${avgAttendance?.toFixed(1)}%`}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 group hover:border-purple-300 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-600 transition-colors">
              <ClipboardDocumentCheckIcon className="w-6 h-6 text-purple-700 group-hover:text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Courses</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-blue-900">3</p>
                <p className="text-[10px] text-gray-400 font-normal">BCA·BIT·MCA</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-blue-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/events?new=1"
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <PlusCircleIcon className="w-4 h-4" />
            New Event
          </Link>
          <Link
            href="/students?new=1"
            className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
          >
            <PlusCircleIcon className="w-4 h-4" />
            Add Student
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ClipboardDocumentCheckIcon className="w-4 h-4" />
            Mark Attendance
          </Link>
        </div>
      </div>

      {/* Recent events */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-blue-900">Recent Events</h3>
          <Link href="/events" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
            View all <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : recentEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No events yet. <Link href="/events?new=1" className="text-blue-600 hover:underline">Create one →</Link></p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentEvents.map((ev, idx) => (
              <div key={ev.event_id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}.</span>
                  <div>
                    <p className="font-medium text-sm text-gray-800">{ev.event_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(ev.event_date)}{ev.event_time ? ` · ${ev.event_time}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1 min-w-[60px]">
                    <span className="text-[10px] font-bold text-gray-400">
                      {eventStats[ev.event_id] && (eventStats[ev.event_id].total - eventStats[ev.event_id].na > 0)
                        ? `${((eventStats[ev.event_id].present / (eventStats[ev.event_id].total - eventStats[ev.event_id].na)) * 100).toFixed(0)}%`
                        : '0%'}
                    </span>
                    <div className="w-12 bg-gray-100 h-1 rounded-full overflow-hidden border border-gray-100">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${eventStats[ev.event_id] && (eventStats[ev.event_id].total - eventStats[ev.event_id].na > 0)
                            ? (eventStats[ev.event_id].present / (eventStats[ev.event_id].total - eventStats[ev.event_id].na)) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/attendance?event=${ev.event_id}`}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap flex items-center gap-1"
                  >
                    Mark <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
