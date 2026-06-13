import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Users, 
  BarChart2,
  List,
  Loader2,
  Clock
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI Insights State
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Auto-refresh reference
  const refreshInterval = useRef(null);

  const fetchCampaignDetails = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.getCampaign(parseInt(id));
      setCampaign(data.campaign);
      setCommunications(data.communications || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch campaign details.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignDetails(true);

    // Set up auto-polling while campaign callbacks are executing
    refreshInterval.current = setInterval(() => {
      fetchCampaignDetails(false);
    }, 2000);

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [id]);

  // Turn off auto-refresh when campaign updates settle
  useEffect(() => {
    if (campaign && campaign.stats) {
      const stats = campaign.stats;
      const allDone = stats.delivered + stats.failed >= stats.total_sent;
      if (allDone && campaign.status === 'sent' && refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    }
  }, [campaign]);

  // AI Campaign Performance analysis trigger
  const handleGenerateInsights = async () => {
    try {
      setAiLoading(true);
      const data = await api.getCampaignInsights(parseInt(id));
      setAiInsights(data);
    } catch (err) {
      alert('AI analytics failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading && !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-stone-400 text-sm">Decoding campaign dispatch logs...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4 text-center p-20">
        <div className="text-red-400 font-bold">{error || 'Campaign not found.'}</div>
        <Link to="/campaigns" className="text-amber-500 underline text-sm flex items-center justify-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Campaigns Control Room</span>
        </Link>
      </div>
    );
  }

  const stats = campaign.stats || { total_sent: 0, delivered: 0, read: 0, clicked: 0, failed: 0 };
  const delPct = stats.total_sent ? (stats.delivered / stats.total_sent) * 100 : 0;
  const readPct = stats.delivered ? (stats.read / stats.delivered) * 100 : 0;
  const clickPct = stats.read ? (stats.clicked / stats.read) * 100 : 0;

  // Funnel data array for Recharts
  const funnelData = [
    { name: 'Dispatched', count: stats.total_sent, color: '#aa825f' },
    { name: 'Delivered', count: stats.delivered, color: '#aa825f' },
    { name: 'Opened/Read', count: stats.read, color: '#d97706' },
    { name: 'Clicked CTA', count: stats.clicked, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-800/40 pb-5 gap-4">
        <div className="flex items-start space-x-3.5">
          <Link 
            to="/campaigns" 
            className="p-2.5 rounded-xl border border-stone-800 bg-stone-900/40 hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display font-bold text-2xl tracking-tight text-stone-100">
                {campaign.name}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                campaign.channel === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-stone-800 text-stone-400 border-stone-750'
              }`}>
                {campaign.channel}
              </span>
            </div>
            <p className="text-stone-500 text-xs mt-1">
              Launched to <strong>{campaign.segment_name || 'Unknown Segment'}</strong> • {new Date(campaign.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 self-start md:self-center">
          <button
            onClick={() => fetchCampaignDetails(true)}
            className="flex items-center space-x-1.5 border border-stone-800 bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-stone-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Force Refresh</span>
          </button>

          <button
            onClick={handleGenerateInsights}
            disabled={aiLoading}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold text-xs px-4.5 py-2.5 rounded-xl transition shadow-[0_4px_15px_rgba(217,119,6,0.15)] disabled:opacity-50 cursor-pointer"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Performance Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">Total Sent</span>
          <h3 className="font-display font-extrabold text-2xl text-stone-200 mt-1">{stats.total_sent}</h3>
          <span className="text-[10px] text-stone-500 block mt-1">Recipients targeted</span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">Delivery Rate</span>
          <h3 className="font-display font-extrabold text-2xl text-stone-200 mt-1">{delPct.toFixed(1)}%</h3>
          <span className="text-[10px] text-stone-500 block mt-1">{stats.delivered} delivered • {stats.failed} failed</span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">Read/Open Rate</span>
          <h3 className="font-display font-extrabold text-2xl text-stone-200 mt-1">{readPct.toFixed(1)}%</h3>
          <span className="text-[10px] text-stone-500 block mt-1">{stats.read} read receipts</span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">Click CTR</span>
          <h3 className="font-display font-extrabold text-2xl text-amber-500 mt-1">{clickPct.toFixed(1)}%</h3>
          <span className="text-[10px] text-stone-500 block mt-1">{stats.clicked} link clicks</span>
        </div>
      </div>

      {/* AI Post-Mortem insights Card (conditional render) */}
      {aiInsights && (
        <div className="glass-card p-6 rounded-2xl border border-amber-600/20 relative overflow-hidden animate-pulse-subtle">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-amber-600/5 to-transparent pointer-events-none"></div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-stone-850 pb-3">
              <BarChart2 className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-bold text-stone-200">Campaign Performance Report</h3>
            </div>
            
            <p className="text-sm font-semibold text-stone-300">
              "{aiInsights.summary}"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
              {aiInsights.insights.map((ins, idx) => (
                <div key={idx} className="bg-stone-950/40 p-4 rounded-xl border border-stone-850 flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="font-semibold text-stone-200">{ins.title}</h5>
                    <p className="text-stone-400 mt-1 leading-relaxed">{ins.description}</p>
                  </div>
                  <div className="text-[10px] font-bold text-amber-500/90 uppercase tracking-wider">
                    👉 Strategy: {ins.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Funnel Chart & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recharts Funnel Chart (Left column) */}
        <div className="lg:col-span-1 glass-card p-6 rounded-2xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-stone-850 pb-3">
            <BarChart2 className="w-4.5 h-4.5 text-stone-500" />
            <h3 className="font-display font-bold text-stone-200">Conversion Funnel</h3>
          </div>

          <div className="h-64 flex items-center justify-center">
            {stats.total_sent === 0 ? (
              <p className="text-stone-600 text-xs italic">No campaign conversion stats recorded.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#78716c" fontSize={11} width={80} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1c1917', 
                      borderColor: '#2e2a24',
                      color: '#fafaf9',
                      fontSize: '11px',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" radius={6} barSize={20}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Message Template Copy Mockup (Right Columns) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-stone-850 pb-3">
            <Clock className="w-4.5 h-4.5 text-stone-500" />
            <h3 className="font-display font-bold text-stone-200">Campaign Blueprint</h3>
          </div>

          {campaign.subject && (
            <div className="text-xs text-stone-300">
              <strong className="text-stone-500 font-semibold mr-1.5">Subject Line:</strong>
              <span>{campaign.subject}</span>
            </div>
          )}

          <div className="bg-stone-950 border border-stone-850 p-4.5 rounded-xl">
            <span className="text-[9px] font-bold text-stone-600 tracking-wider uppercase block border-b border-stone-900 pb-1.5 mb-2">Copywriting Template</span>
            <p className="text-xs text-stone-300 leading-relaxed font-medium italic whitespace-pre-line">
              "{campaign.message_template}"
            </p>
          </div>
        </div>
      </div>

      {/* Recipient Logs Logging Table */}
      <div className="glass-card rounded-2xl overflow-hidden space-y-4 p-6">
        <div className="flex items-center space-x-2 border-b border-stone-850 pb-3">
          <List className="w-4.5 h-4.5 text-stone-500" />
          <h3 className="font-display font-bold text-stone-200">Individual Recipient Logs</h3>
        </div>

        {communications.length === 0 ? (
          <p className="text-stone-500 text-xs italic text-center p-6">No communication logs recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead>
                <tr className="border-b border-stone-850 text-stone-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-2">Recipient</th>
                  <th className="pb-3 px-2">Reference ID</th>
                  <th className="pb-3 px-2">Engagement Status</th>
                  <th className="pb-3 px-2">Failure Details</th>
                  <th className="pb-3 px-2 text-right">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-900">
                {communications.map((comm) => (
                  <tr key={comm.id} className="hover:bg-stone-900/15 transition-all text-xs">
                    <td className="py-3 px-2 font-semibold text-stone-250">
                      {comm.customer?.name || `Customer ID #${comm.customer_id}`}
                      <span className="text-[10px] text-stone-500 block font-normal mt-0.5">{comm.customer?.email}</span>
                    </td>
                    <td className="py-3 px-2 font-mono text-[10px] text-stone-500">{comm.id}</td>
                    <td className="py-3 px-2 capitalize">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        comm.status === 'read' || comm.status === 'clicked'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                          : comm.status === 'delivered'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/15'
                          : comm.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/15'
                          : 'bg-stone-850 text-stone-400 border-stone-800'
                      }`}>
                        {comm.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[10.5px] text-stone-400 max-w-[200px] truncate">
                      {comm.status === 'failed' && comm.failure_reason ? (
                        <span className="text-rose-400/90" title={comm.failure_reason}>{comm.failure_reason}</span>
                      ) : (
                        <span className="text-stone-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-stone-500">
                      {new Date(comm.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
