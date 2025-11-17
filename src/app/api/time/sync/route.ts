/**
 * Time Sync API
 *
 * Returns server's synchronized time for Panama timezone.
 * Used to ensure all clients have accurate timestamps.
 *
 * GET /api/time/sync
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch Panama time from WorldTimeAPI
    const response = await fetch(
      'https://worldtimeapi.org/api/timezone/America/Panama',
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`WorldTimeAPI returned ${response.status}`);
    }

    const data = await response.json();

    // Return formatted response
    return NextResponse.json({
      success: true,
      serverTime: data.datetime,
      unixtime: data.unixtime,
      timezone: data.timezone,
      utcOffset: data.utc_offset,
      dayOfWeek: data.day_of_week,
      dayOfYear: data.day_of_year,
      weekNumber: data.week_number,
    });
  } catch (error: any) {
    console.error('[TimeSyncAPI] Error:', error);

    // Fallback to server time if API fails
    const now = new Date();

    return NextResponse.json({
      success: false,
      serverTime: now.toISOString(),
      unixtime: Math.floor(now.getTime() / 1000),
      timezone: 'America/Panama',
      utcOffset: '-05:00',
      fallback: true,
      error: error.message,
    });
  }
}
