/**
 * Header Component
 *
 * Contains organization selector, synced clock, folios indicator, notifications, and user menu
 */

'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { SyncedClock } from '@/components/common/SyncedClock';

export function Header() {
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // TODO: Connect to real data from API
  const foliosRestantes = 850; // Mock data

  // Folio color coding
  const getFolioColorClass = (folios: number) => {
    if (folios > 500) return 'bg-green-100 text-green-700';
    if (folios > 100) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  // Get user initials for avatar
  const getUserInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Organization Selector */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Organización</p>
            <p className="font-semibold text-gray-900">
              {session?.user?.organization?.razonSocial || 'Cargando...'}
            </p>
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
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {getUserInitials(session?.user?.name)}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {session?.user?.name || 'Usuario'}
              </span>
              <span className="text-gray-400">▼</span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-gray-500">{session?.user?.email}</p>
                    <div className="mt-2 inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {session?.user?.role || 'USER'}
                    </div>
                  </div>

                  {/* Organization Info */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Organización</p>
                    <p className="text-sm font-medium text-gray-900">
                      {session?.user?.organization?.razonSocial}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      RUC: {session?.user?.organization?.ruc}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <a
                      href="/settings/organization"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span>⚙️</span>
                      <span>Configuración</span>
                    </a>
                    <a
                      href="/settings/users"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span>👥</span>
                      <span>Usuarios</span>
                    </a>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-gray-200 pt-2">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <span>🚪</span>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
