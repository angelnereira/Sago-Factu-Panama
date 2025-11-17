'use client';

/**
 * Synced Clock Component
 *
 * Displays real-time synchronized clock with Panama time
 */

import { useSyncedTime } from '@/hooks/useSyncedTime';

interface SyncedClockProps {
  showDate?: boolean;
  showSeconds?: boolean;
  showTimezone?: boolean;
  showSyncStatus?: boolean;
  compact?: boolean;
}

export function SyncedClock({
  showDate = true,
  showSeconds = true,
  showTimezone = false,
  showSyncStatus = true,
  compact = false,
}: SyncedClockProps) {
  const { time, synced, loading } = useSyncedTime();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="animate-pulse">⏳</div>
        <span className="text-sm">Sincronizando...</span>
      </div>
    );
  }

  const formatTime = () => {
    const hours = time.getHours();
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    let timeString = `${displayHours}:${minutes}`;
    if (showSeconds) {
      timeString += `:${seconds}`;
    }
    timeString += ` ${ampm}`;

    return timeString;
  };

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: compact ? undefined : 'short',
      year: 'numeric',
      month: compact ? '2-digit' : 'short',
      day: '2-digit',
    };
    return time.toLocaleDateString('es-PA', options);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono">{formatTime()}</span>
        {showDate && <span className="text-gray-600">{formatDate()}</span>}
        {showSyncStatus && (
          <span
            className={`text-xs ${synced ? 'text-green-600' : 'text-yellow-600'}`}
            title={synced ? 'Sincronizado con hora oficial' : 'Sin sincronizar'}
          >
            {synced ? '✓' : '⚠'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold font-mono">{formatTime()}</span>
        {showTimezone && (
          <span className="text-xs text-gray-500 font-semibold">PA</span>
        )}
      </div>
      {showDate && (
        <div className="text-xs text-gray-600">{formatDate()}</div>
      )}
      {showSyncStatus && (
        <div className="flex items-center gap-1 text-xs mt-1">
          <span
            className={synced ? 'text-green-600' : 'text-yellow-600'}
          >
            {synced ? '✓' : '⚠'}
          </span>
          <span className="text-gray-500">
            {synced ? 'Sincronizado' : 'Sin sincronizar'}
          </span>
        </div>
      )}
    </div>
  );
}
