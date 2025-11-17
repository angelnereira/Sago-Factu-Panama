/**
 * Main Sidebar Navigation
 *
 * Organized by frequency of use
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  {
    section: 'Principal',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: '📊' },
      { name: 'Nueva Factura', href: '/invoices/new', icon: '➕' },
      { name: 'Facturas Recientes', href: '/invoices', icon: '📄' },
    ],
  },
  {
    section: 'Gestión',
    items: [
      { name: 'Clientes', href: '/clients', icon: '👥' },
      { name: 'Productos', href: '/products', icon: '📦' },
      { name: 'Reportes', href: '/reports', icon: '📈' },
    ],
  },
  {
    section: 'Configuración',
    items: [
      { name: 'Organización', href: '/settings/organization', icon: '🏢' },
      { name: 'HKA Config', href: '/settings/hka', icon: '🔐' },
      { name: 'Usuarios', href: '/settings/users', icon: '👤' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600">SAGO-FACTU</h1>
        <p className="text-xs text-gray-500 mt-1">Panamá 🇵🇦</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigationItems.map((section) => (
          <div key={section.section}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {section.section}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="font-semibold mb-1">Sistema de Facturación</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
