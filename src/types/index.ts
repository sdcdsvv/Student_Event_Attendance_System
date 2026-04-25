export type Gender = 'Male' | 'Female' | 'Other';
export type Course = 'BCA' | 'BIT' | 'MCA';
export type AttendanceStatus = 'Present' | 'Absent' | 'NA';

export interface Student {
  scholar_id: string;
  name: string;
  gender: Gender;
  course: Course;
  semester: number;
  contact_number: string;
  email: string;
  photo_url?: string;
  photo_public_id?: string;
}

export interface Event {
  event_id: string;
  event_name: string;
  event_date: string;
  event_time?: string | null;
}

export interface Attendance {
  attendance_id: string;
  scholar_id: string;
  event_id: string;
  status: AttendanceStatus;
}

export interface AttendanceRecord {
  scholar_id: string;
  event_id: string;
  status: AttendanceStatus;
}
