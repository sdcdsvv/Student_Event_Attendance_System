export const getCourseColor = (course: string) => {
    switch (course) {
        case 'BCA': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'BIT': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'MCA': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

export const getSemesterColor = (sem: number) => {
    switch (sem) {
        case 1: return 'bg-rose-50 text-rose-700 border-rose-100';
        case 2: return 'bg-orange-50 text-orange-700 border-orange-100';
        case 3: return 'bg-amber-50 text-amber-700 border-amber-100';
        case 4: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 5: return 'bg-sky-50 text-sky-700 border-sky-100';
        case 6: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
        default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
};
