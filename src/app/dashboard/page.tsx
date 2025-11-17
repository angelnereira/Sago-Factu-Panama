/**
 * Dashboard Page
 *
 * Executive dashboard with key metrics, charts, and recent activity
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export default function DashboardPage() {
  // TODO: Fetch real data from API
  const metrics = {
    today: {
      invoices: 45,
      amount: 125450.75,
    },
    month: {
      invoices: 1250,
      amount: 3450890.5,
    },
    pending: 12,
    folios: 850,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vista general de tu facturación electrónica
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Facturas Hoy"
            value={metrics.today.invoices}
            subtitle={`$${metrics.today.amount.toLocaleString('es-PA', {
              minimumFractionDigits: 2,
            })}`}
            icon="📊"
            color="blue"
            trend={{ value: 12, direction: 'up' }}
          />

          <MetricCard
            title="Facturado del Mes"
            value={`$${(metrics.month.amount / 1000).toFixed(1)}K`}
            subtitle={`${metrics.month.invoices} facturas`}
            icon="💰"
            color="green"
            trend={{ value: 8, direction: 'up' }}
          />

          <MetricCard
            title="Documentos Pendientes"
            value={metrics.pending}
            subtitle="En proceso de certificación"
            icon="⏳"
            color="yellow"
          />

          <MetricCard
            title="Folios Disponibles"
            value={metrics.folios}
            subtitle="Transacciones restantes"
            icon="🎫"
            color="green"
          />
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart Placeholder */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ventas del Mes
            </h2>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                Gráfica de ventas (implementar con Chart.js o Recharts)
              </p>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Estado de Facturas
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Autorizadas</span>
                </div>
                <span className="font-semibold text-gray-900">1,180</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-600">Procesando</span>
                </div>
                <span className="font-semibold text-gray-900">12</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-600">Rechazadas</span>
                </div>
                <span className="font-semibold text-gray-900">8</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
}
