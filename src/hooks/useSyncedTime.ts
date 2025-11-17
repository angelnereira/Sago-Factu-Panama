/**
 * Custom Hook for Synced Time
 *
 * Provides real-time synced time updates for components
 */

'use client';

import { useState, useEffect } from 'react';
import {
  getSyncedTime,
  synchronizeTime,
  isSynced,
  getTimeOffset,
} from '@/lib/time/time-sync';

interface SyncedTimeState {
  time: Date;
  synced: boolean;
  offset: number;
  loading: boolean;
}

export function useSyncedTime() {
  const [state, setState] = useState<SyncedTimeState>({
    time: new Date(),
    synced: false,
    offset: 0,
    loading: true,
  });

  useEffect(() => {
    // Initial sync
    const initSync = async () => {
      try {
        await synchronizeTime();
        setState({
          time: getSyncedTime(),
          synced: isSynced(),
          offset: getTimeOffset(),
          loading: false,
        });
      } catch (error) {
        console.error('[useSyncedTime] Sync failed:', error);
        setState({
          time: new Date(),
          synced: false,
          offset: 0,
          loading: false,
        });
      }
    };

    initSync();

    // Update time every second
    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        time: getSyncedTime(),
        synced: isSynced(),
        offset: getTimeOffset(),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return state;
}
