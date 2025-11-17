/**
 * Time Synchronization Service
 *
 * Synchronizes system time with Panama's official time using WorldTimeAPI.
 * Ensures all invoices and timestamps are accurate and match real-time.
 *
 * API: WorldTimeAPI.org (free, no limits)
 * Timezone: America/Panama
 */

export interface TimeData {
  datetime: string; // ISO 8601 format
  timestamp: number; // Unix timestamp
  timezone: string;
  utc_offset: string;
  day_of_week: number;
  day_of_year: number;
  week_number: number;
  unixtime: number;
}

interface SyncResult {
  serverTime: Date;
  localTime: Date;
  offset: number; // Difference in milliseconds
  timezone: string;
  synced: boolean;
}

// Cache for time offset
let timeOffset: number = 0;
let lastSyncTime: number = 0;
const SYNC_INTERVAL = 60 * 60 * 1000; // Re-sync every hour

/**
 * Fetch current time from Panama timezone
 */
export async function fetchPanamaTime(): Promise<TimeData> {
  try {
    const response = await fetch('https://worldtimeapi.org/api/timezone/America/Panama', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`WorldTimeAPI returned ${response.status}`);
    }

    const data: TimeData = await response.json();
    return data;
  } catch (error) {
    console.error('[TimeSync] Error fetching Panama time:', error);
    throw error;
  }
}

/**
 * Synchronize time and calculate offset
 */
export async function synchronizeTime(): Promise<SyncResult> {
  try {
    const localTime = new Date();
    const timeData = await fetchPanamaTime();
    const serverTime = new Date(timeData.datetime);

    // Calculate offset (how much local time differs from server)
    const offset = serverTime.getTime() - localTime.getTime();

    // Store offset for future use
    timeOffset = offset;
    lastSyncTime = Date.now();

    console.log('[TimeSync] Time synchronized:', {
      serverTime: serverTime.toISOString(),
      localTime: localTime.toISOString(),
      offset: `${offset}ms`,
      timezone: timeData.timezone,
    });

    return {
      serverTime,
      localTime,
      offset,
      timezone: timeData.timezone,
      synced: true,
    };
  } catch (error: any) {
    console.error('[TimeSync] Synchronization failed:', error);

    return {
      serverTime: new Date(),
      localTime: new Date(),
      offset: 0,
      timezone: 'America/Panama',
      synced: false,
    };
  }
}

/**
 * Get synchronized time (current time adjusted with offset)
 */
export function getSyncedTime(): Date {
  // If last sync was more than 1 hour ago, time might be stale
  const timeSinceSync = Date.now() - lastSyncTime;
  if (timeSinceSync > SYNC_INTERVAL) {
    console.warn('[TimeSync] Time offset is stale, consider re-syncing');
  }

  const localNow = new Date();
  const syncedTime = new Date(localNow.getTime() + timeOffset);
  return syncedTime;
}

/**
 * Get synchronized timestamp (Unix timestamp in milliseconds)
 */
export function getSyncedTimestamp(): number {
  return getSyncedTime().getTime();
}

/**
 * Get synchronized ISO string for invoices
 */
export function getSyncedISOString(): string {
  return getSyncedTime().toISOString();
}

/**
 * Format synced time for display
 */
export function formatSyncedTime(options?: Intl.DateTimeFormatOptions): string {
  const syncedTime = getSyncedTime();

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };

  return syncedTime.toLocaleString('es-PA', { ...defaultOptions, ...options });
}

/**
 * Get current offset
 */
export function getTimeOffset(): number {
  return timeOffset;
}

/**
 * Check if time is synced
 */
export function isSynced(): boolean {
  return lastSyncTime > 0;
}

/**
 * Get last sync time
 */
export function getLastSyncTime(): Date | null {
  return lastSyncTime > 0 ? new Date(lastSyncTime) : null;
}

/**
 * Auto-sync on module load (client-side only)
 */
if (typeof window !== 'undefined') {
  // Initial sync
  synchronizeTime().catch(console.error);

  // Re-sync every hour
  setInterval(() => {
    synchronizeTime().catch(console.error);
  }, SYNC_INTERVAL);
}
