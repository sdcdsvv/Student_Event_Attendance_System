'use client';

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-gray-200 rounded-md ${className}`}></div>
    );
}

export function TableRowSkeleton({ cols }: { cols: number }) {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-4 border-b border-gray-50">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                </td>
            ))}
        </tr>
    );
}

export function CardSkeleton() {
    return (
        <div className="card p-6 space-y-4 animate-pulse">
            <div className="h-2 w-16 bg-gray-200 rounded"></div>
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
            <div className="h-2 w-32 bg-gray-200 rounded"></div>
        </div>
    );
}
