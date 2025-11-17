/**
 * Header Component
 *
 * Contains organization selector, synced clock, folios indicator, notifications, and user menu
 */

'use client';

import { SyncedClock } from '@/components/common/SyncedClock';

export function Header() {
  // TODO: Connect to real data from API
  const foliosRestantes = 850; // Mock data
  const organizationName = 'Mi Empresa Demo';

  // Folio color coding
  const getFolioColorClass = (folios: number) => {
    if (folios > 500) return 'bg-green-100 text-green-700';
    if (folios > 100) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Organization Selector */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Organización</p>
            <p className="font-semibold text-gray-900">{organizationName}</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {/* Synced Clock */}
          <div className="border-l border-gray-200 pl-6">
            <SyncedClock compact showDate showSeconds showSyncStatus />
          </div>

          {/* Folios Indicator */}
          <div
            className={`px-4 py-2 rounded-lg font-medium text-sm ${getFolioColorClass(
              foliosRestantes
            )}`}
          >
            <span className="font-bold">{foliosRestantes}</span> folios disponibles
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <span className="text-xl">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              U
            </div>
            <span className="text-sm font-medium text-gray-700">Usuario</span>
          </button>
        </div>
      </div>
    </header>
  );
}
