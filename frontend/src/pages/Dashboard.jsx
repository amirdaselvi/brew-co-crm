import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  ShoppingBag,
  DollarSign,
  Send,
  Percent,
  Database,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSeed = async () => {
    await fetchStats();
  };

  /*const handleSeed = async () => {
    try {
      setSeeding(true);
      await api.seedDatabase();
      await fetchStats();
    } catch (err) {
      alert('Error seeding database: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };*/

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-stone-400 text-sm">Brewing dashboard metrics...</p>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Channel distribution data for Recharts
  const chartData = stats && stats.channel_distribution
    ? Object.keys(stats.channel_distribution).map(key => ({
      name: key.toUpperCase(),
      value: stats.channel_distribution[key]
    }))
    : [];

  const COLORS = ['#d97706', '#aa825f', '#7b553e', '#573c2c'];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-stone-800/40 pb-6">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-stone-100">
            Performance Workspace
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Real-time analytics and marketing command center for Brew & Co.
          </p>
        </div>

        {/* Database Seeding Trigger */}
        <div className="flex items-center space-x-3">
          {(!stats || stats.total_customers === 0) && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(217,119,6,0.25)] cursor-pointer"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Seeding 2,500+ records...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Seed Demo Data</span>
                </>
              )}
            </button>
          )}
          {stats && stats.total_customers > 0 && (
            <span className="text-xs text-stone-500 border border-stone-800/50 bg-stone-900/30 px-3 py-1.5 rounded-lg">
              Database Seeded • Ready
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="glass-card hover-glass-card p-6 rounded-2xl flex items-center space-x-4.5">
            <div className="bg-amber-600/10 p-3 rounded-xl border border-amber-500/20 text-amber-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Total Shoppers</p>
              <h3 className="font-display font-bold text-2xl text-stone-100 mt-0.5">{stats.total_customers}</h3>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card hover-glass-card p-6 rounded-2xl flex items-center space-x-4.5">
            <div className="bg-amber-600/10 p-3 rounded-xl border border-amber-500/20 text-amber-500">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Completed Orders</p>
              <h3 className="font-display font-bold text-2xl text-stone-100 mt-0.5">{stats.total_orders}</h3>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card hover-glass-card p-6 rounded-2xl flex items-center space-x-4.5">
            <div className="bg-amber-600/10 p-3 rounded-xl border border-amber-500/20 text-amber-500">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Total Revenue</p>
              <h3 className="font-display font-bold text-2xl text-stone-100 mt-0.5">{formatCurrency(stats.total_revenue)}</h3>
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-card hover-glass-card p-6 rounded-2xl flex items-center space-x-4.5">
            <div className="bg-amber-600/10 p-3 rounded-xl border border-amber-500/20 text-amber-500">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Avg Delivery Rate</p>
              <h3 className="font-display font-bold text-2xl text-stone-100 mt-0.5">{(stats.avg_delivery_rate * 100).toFixed(1)}%</h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts & Campaigns Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Recent Campaigns (Left columns) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-lg text-stone-100">
              Recent Campaigns
            </h3>
            <Link
              to="/campaigns"
              className="text-amber-500 text-xs font-medium flex items-center space-x-1 hover:underline"
            >
              <span>View all campaigns</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {stats && stats.recent_campaigns.length === 0 ? (
            <div className="border border-dashed border-stone-850 p-12 text-center rounded-xl">
              <p className="text-stone-500 text-sm">No campaigns dispatched yet.</p>
              <Link
                to="/campaigns"
                className="inline-flex items-center space-x-2 text-amber-500 border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 px-4 py-2 mt-4 rounded-xl text-xs font-semibold transition"
              >
                <span>Launch First Campaign</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-stone-300">
                <thead>
                  <tr className="border-b border-stone-850 text-stone-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="pb-3">Campaign</th>
                    <th className="pb-3">Channel</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Target Size</th>
                    <th className="pb-3 text-right">Dispatched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-900">
                  {stats && stats.recent_campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-stone-900/20 transition-all group">
                      <td className="py-4 font-medium text-stone-200">
                        <Link to={`/campaigns/${camp.id}`} className="hover:text-amber-400 block transition">
                          {camp.name}
                        </Link>
                        <span className="text-[11px] text-stone-500 block mt-0.5">
                          Created {new Date(camp.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 capitalize">
                        <span className="text-stone-400 text-xs font-medium px-2.5 py-1 rounded-md bg-stone-900 border border-stone-850">
                          {camp.channel}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${camp.status === 'completed' || camp.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : camp.status === 'sending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                            : 'bg-stone-800/40 text-stone-400 border-stone-700/50'
                          }`}>
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-4 text-right font-display text-stone-400">
                        {camp.stats ? camp.stats.total_sent : '-'}
                      </td>
                      <td className="py-4 text-right text-stone-500 text-xs">
                        {camp.sent_at ? new Date(camp.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Marketing Channels (Right Column) */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-stone-100 mb-1">
              Campaign Distribution
            </h3>
            <p className="text-stone-500 text-xs leading-normal">
              Volume split across customer engagement channels.
            </p>
          </div>

          <div className="h-48 my-4 relative flex items-center justify-center">
            {chartData.length === 0 ? (
              <p className="text-stone-600 text-xs text-center">No campaign channel data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#2e2a24',
                      borderRadius: '8px',
                      color: '#fafaf9',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-stone-850 pt-4">
            {chartData.map((item, i) => (
              <div key={item.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: COLORS[i % COLORS.length] || COLORS[0] }}></span>
                <span className="text-stone-400 truncate capitalize">{item.name.toLowerCase()}</span>
                <span className="text-stone-500 font-medium font-display ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>


    </div>
  );
}
