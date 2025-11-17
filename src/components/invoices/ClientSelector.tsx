/**
 * Intelligent Client Selector
 *
 * Dropdown with search, recent clients, and inline creation
 */

'use client';

import { useState } from 'react';

interface Client {
  id: string;
  name: string;
  ruc: string;
  dv: string;
  type: 'CONTRIBUYENTE' | 'CONSUMIDOR_FINAL';
}

interface ClientSelectorProps {
  value?: Client;
  onChange: (client: Client) => void;
}

// Mock recent clients
const mockRecentClients: Client[] = [
  {
    id: '1',
    name: 'Empresa ABC S.A.',
    ruc: '123456789-1-2023',
    dv: '12',
    type: 'CONTRIBUYENTE',
  },
  {
    id: '2',
    name: 'Consumidor Final',
    ruc: '',
    dv: '',
    type: 'CONSUMIDOR_FINAL',
  },
];

export function ClientSelector({ value, onChange }: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredClients = mockRecentClients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Cliente *
      </label>

      {/* Selected Client Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {value ? (
          <div>
            <p className="font-medium text-gray-900">{value.name}</p>
            {value.ruc && (
              <p className="text-sm text-gray-500">RUC: {value.ruc}</p>
            )}
          </div>
        ) : (
          <span className="text-gray-500">Seleccionar cliente...</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Recent Clients */}
          <div className="max-h-60 overflow-y-auto">
            <div className="p-2 text-xs font-semibold text-gray-500 uppercase">
              Clientes Recientes
            </div>
            {filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  onChange(client);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <p className="font-medium text-gray-900">{client.name}</p>
                {client.ruc && (
                  <p className="text-sm text-gray-500">RUC: {client.ruc}</p>
                )}
              </button>
            ))}
          </div>

          {/* Create New */}
          <div className="p-3 border-t border-gray-200">
            <button
              type="button"
              className="w-full px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              + Crear nuevo cliente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
