import StatsCard from '@/components/admin/StatsCard';
import { adminGetStores } from '@/services/adminStoreService';
import { formatDateTime, formatRelativeTime } from '@/utils/formatters';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, CheckCircle, ChevronRight, Clock,
  MapPin, PauseCircle, Store, Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STORE_STATUS_BADGE = {
  active:    'bg-emerald-50 text-emerald-600 border-emerald-200',
  pending:   'bg-amber-50 text-amber-600 border-amber-200',
  offline: 'bg-red-50 text-red-500 border-red-200',
};

const STORE_STATUS_DOT = {
  active:    'bg-emerald-400',
  pending:   'bg-amber-400',
  offline:    'bg-red-400',
};

const getStoreStatus = (store) => {
  if (!store.isApproved && store.isActive !== false) return 'pending';
  if (store.isActive === false) return 'offline';
  return 'active';
};

// ── Dashboard

const AdminDashboard = () => {
  const { data: storesData, isLoading } = useQuery({
    queryKey: ['admin-stores-all'],
    queryFn: () => adminGetStores({ limit: 100 }),
    staleTime: 30_000,
  });

  const stores = storesData?.data ?? [];

  const totalStores  = stores.length;
  const activeStores = stores.filter(s => s.isApproved && s.isActive !== false).length;
  const pendingStores = stores.filter(s => !s.isApproved && s.isActive !== false).length;
  const offlineStores = stores.filter(s => s.isActive === false).length;

  const recentStores = [...stores]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const pendingList = stores
    .filter(s => !s.isApproved && s.isActive !== false)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary mx-auto" />
          <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Loading platform data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 bg-gray-50/30 min-h-screen">

      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-[900] text-gray-900 tracking-tight uppercase italic">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-sm font-bold text-gray-500">Platform overview · {formatDateTime(new Date())}</p>
          </div>
        </div>

        {pendingStores > 0 && (
          <Link
            to="/stores"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 font-bold text-xs uppercase tracking-widest hover:bg-amber-100 transition-all group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            {pendingStores} store{pendingStores !== 1 ? 's' : ''} awaiting approval
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* ── Stats Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard icon={Store}       label="Total Stores"    value={totalStores}   color="blue" />
        <StatsCard icon={CheckCircle} label="Active Stores"   value={activeStores}  color="green" />
        <StatsCard icon={Clock}       label="Pending Approval" value={pendingStores} color="orange" />
        <StatsCard icon={Users}       label="Offline"         value={offlineStores || '—'}  color="red" />
      </div>

      {/* ── Main Content Grid ──────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-10">

        {/* ── Left: Recent Stores (2 cols) ─────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Pending Approvals Table */}
          {pendingList.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-[900] text-gray-900 tracking-tight uppercase italic flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Needs Your Approval
                </h2>
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  {pendingList.length} pending
                </span>
              </div>

              <div className="space-y-3">
                {pendingList.slice(0, 5).map((store) => (
                  <Link
                    key={store._id}
                    to={`/stores/${store._id}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-amber-100 bg-amber-50/30 hover:bg-amber-50 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {store.logo ? (
                        <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{store.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {store.address?.city && (
                          <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {store.address.city}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-semibold">
                          · {formatRelativeTime(store.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-black uppercase tracking-widest shrink-0">
                      Review
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Stores Table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-[900] text-gray-900 tracking-tight uppercase italic flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                All Stores
              </h2>
              <Link
                to="/stores"
                className="text-xs font-black text-primary hover:underline uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
              >
                View all
              </Link>
            </div>

            {recentStores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Store className="w-12 h-12 mb-2 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">No stores registered yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-[11px] font-black text-gray-400 uppercase tracking-widest pb-4 px-2">Store</th>
                      <th className="text-left text-[11px] font-black text-gray-400 uppercase tracking-widest pb-4">Location</th>
                      <th className="text-left text-[11px] font-black text-gray-400 uppercase tracking-widest pb-4">Status</th>
                      <th className="text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pb-4 px-2">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentStores.map((store) => {
                      const status = getStoreStatus(store);
                      return (
                        <tr key={store._id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-2">
                            <Link to={`/stores/${store._id}`} className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {store.logo ? (
                                  <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Store className="w-4 h-4 text-gray-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-primary transition-colors">{store.name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{store.email}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="py-4">
                            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-300" />
                              {store.address?.city || '—'}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full capitalize border ${STORE_STATUS_BADGE[status]}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STORE_STATUS_DOT[status]}`} />
                              {status}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <span className="text-xs font-bold text-gray-400">{formatRelativeTime(store.createdAt)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel ──────────────────────────────────── */}
        <div className="space-y-8 flex flex-col">

          {/* Store Status Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-lg font-[900] text-gray-900 tracking-tight uppercase italic mb-8">Store Status</h2>
            <div className="space-y-6">
              {[
                { label: 'Active', count: activeStores,    color: 'bg-emerald-500' },
                { label: 'Pending', count: pendingStores,   color: 'bg-amber-500' },
                { label: 'Offline', count: offlineStores, color: 'bg-red-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-6 rounded-full group-hover:scale-y-125 transition-transform ${color}`} />
                    <span className="text-xs font-black text-gray-600 uppercase tracking-widest">{label}</span>
                  </div>
                  <span className="text-lg font-black text-gray-900 tabular-nums">{count}</span>
                </div>
              ))}
              {totalStores === 0 && (
                <p className="text-center text-xs font-bold text-gray-400 py-4 uppercase tracking-widest leading-loose">
                  No stores registered yet
                </p>
              )}
            </div>

            {/* Percentage bar */}
            {totalStores > 0 && (
              <div className="mt-6">
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
                  {activeStores > 0 && (
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(activeStores / totalStores) * 100}%` }} />
                  )}
                  {pendingStores > 0 && (
                    <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${(pendingStores / totalStores) * 100}%` }} />
                  )}
                  {offlineStores > 0 && (
                    <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${(offlineStores / totalStores) * 100}%` }} />
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {Math.round((activeStores / totalStores) * 100)}% active
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {totalStores} total
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#0B0F19] rounded-2xl p-8 shadow-xl shadow-gray-200/50 flex-1">
            <h2 className="text-lg font-[900] text-white tracking-tight uppercase italic mb-6">Console Actions</h2>
            <div className="space-y-4">
              <Link
                to="/stores"
                className="flex items-center justify-center w-full px-4 py-4 bg-primary text-white rounded-xl hover:bg-primary-600 transition-all font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
              >
                Manage Stores
              </Link>
              <Link
                to="/users"
                className="flex items-center justify-center w-full px-4 py-4 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all font-black uppercase text-xs tracking-widest"
              >
                Manage Users
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
