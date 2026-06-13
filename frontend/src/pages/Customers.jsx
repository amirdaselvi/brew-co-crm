import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Mail, 
  Phone as PhoneIcon, 
  MapPin, 
  Calendar, 
  ShoppingBag,
  TrendingUp,
  Loader2,
  Coffee
} from 'lucide-react';

export default function Customers() {
  // Filters state
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [minSpent, setMinSpent] = useState('');
  
  // Data state
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected customer modal
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Constants
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Goa'];
  const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55+'];

  const fetchCustomersList = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers({
        page,
        perPage: 15,
        search,
        city,
        ageGroup,
        minSpent: minSpent ? parseFloat(minSpent) : ''
      });
      setCustomers(data.customers);
      setTotal(data.total);
      setPages(data.pages);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch customers.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch when page, filter options change
  useEffect(() => {
    fetchCustomersList();
  }, [page, city, ageGroup]);

  // Handle Search Input manually to avoid spamming calls
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomersList();
  };

  const handleMinSpentChange = (e) => {
    setMinSpent(e.target.value);
    setPage(1);
  };

  useEffect(() => {
    // Automatically fetch when minSpent is cleared
    if (minSpent === '') {
      fetchCustomersList();
    }
  }, [minSpent]);

  // Fetch customer detail when ID selected
  useEffect(() => {
    if (selectedCustomerId) {
      const fetchDetail = async () => {
        try {
          setDetailLoading(true);
          const data = await api.getCustomer(selectedCustomerId);
          setCustomerDetail(data);
        } catch (err) {
          alert('Failed to load customer profile details: ' + err.message);
        } finally {
          setDetailLoading(false);
        }
      };
      fetchDetail();
    } else {
      setCustomerDetail(null);
    }
  }, [selectedCustomerId]);

  const handleClearFilters = () => {
    setSearch('');
    setCity('');
    setAgeGroup('');
    setMinSpent('');
    setPage(1);
    // Let states settle, then trigger reload
    setTimeout(() => {
      fetchCustomersList();
    }, 50);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-stone-800/40 pb-5">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-stone-100">
            Shoppers Directory
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Browse, search, and inspect the Brew & Co. customer base.
          </p>
        </div>
      </div>

      {/* Filters Form */}
      <form onSubmit={handleSearchSubmit} className="glass-card p-5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Search */}
        <div className="space-y-2 md:col-span-4">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Search Name / Email</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Aarav Sharma"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800/60 rounded-xl px-4 py-2.5 pl-10 text-stone-200 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500/50 transition"
            />
            <Search className="w-4 h-4 text-stone-600 absolute left-3.5 top-3.5" />
          </div>
        </div>

        {/* City Filter */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">City</label>
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            className="w-full bg-stone-900 border border-stone-800/60 rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
          >
            <option value="">All Cities</option>
            {cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Age Group */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Age Group</label>
          <select
            value={ageGroup}
            onChange={(e) => { setAgeGroup(e.target.value); setPage(1); }}
            className="w-full bg-stone-900 border border-stone-800/60 rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
          >
            <option value="">All Ages</option>
            {ageGroups.map(ag => (
              <option key={ag} value={ag}>{ag}</option>
            ))}
          </select>
        </div>

        {/* Spend filter */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Min Spent (₹)</label>
          <input
            type="number"
            placeholder="e.g. 500"
            value={minSpent}
            onChange={handleMinSpentChange}
            className="w-full bg-stone-900 border border-stone-800/60 rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:border-amber-500/50 transition"
          />
        </div>

        {/* Buttons */}
        <div className="flex space-x-2 md:col-span-2">
          <button
            type="submit"
            className="flex-1 bg-amber-600 hover:bg-amber-550 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-[0_0_15px_rgba(217,119,6,0.15)] cursor-pointer text-center"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex-1 bg-stone-800 hover:bg-stone-750 text-stone-300 px-4 py-2.5 rounded-xl text-sm transition cursor-pointer text-center"
            title="Reset Filters"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Main Table Card */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-stone-400 text-sm">Sorting through dossiers...</span>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-400 text-sm">{error}</div>
        ) : customers.length === 0 ? (
          <div className="p-20 text-center text-stone-500 text-sm space-y-2">
            <p>No shoppers matched your query.</p>
            <p className="text-xs text-stone-600">Try loosening your search strings or database filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead>
                <tr className="border-b border-stone-850 text-stone-500 text-xs uppercase tracking-wider font-semibold bg-stone-900/10">
                  <th className="py-4.5 px-6">Customer</th>
                  <th className="py-4.5 px-6">Contact</th>
                  <th className="py-4.5 px-6">Location</th>
                  <th className="py-4.5 px-6">Age</th>
                  <th className="py-4.5 px-6 text-right">Orders</th>
                  <th className="py-4.5 px-6 text-right">Total Spent</th>
                  <th className="py-4.5 px-6">Last Active</th>
                  <th className="py-4.5 px-6">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-900">
                {customers.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedCustomerId(c.id)}
                    className="hover:bg-stone-900/25 transition-all cursor-pointer group"
                  >
                    <td className="py-4 px-6 font-semibold text-stone-200 group-hover:text-amber-400 transition-colors">
                      {c.name}
                      <span className="text-[10px] text-stone-500 block font-normal mt-0.5">ID: #00{c.id}</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-stone-400 space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3 h-3 text-stone-600" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="flex items-center space-x-1.5">
                          <PhoneIcon className="w-3 h-3 text-stone-600" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-stone-400 capitalize">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-stone-600" />
                        <span>{c.city}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-stone-400">{c.age_group || '-'}</td>
                    <td className="py-4 px-6 text-right font-display font-medium text-stone-400">{c.order_count}</td>
                    <td className="py-4 px-6 text-right font-display font-bold text-amber-500/90">{formatCurrency(c.total_spent)}</td>
                    <td className="py-4 px-6 text-xs text-stone-500">
                      {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.tags.slice(0, 3).map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded bg-amber-900/15 text-amber-500/80 border border-amber-500/10 uppercase"
                          >
                            {tag}
                          </span>
                        ))}
                        {c.tags.length > 3 && (
                          <span className="text-[9px] text-stone-500 font-bold px-1.5 py-0.5 bg-stone-900 rounded border border-stone-850">
                            +{c.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Row */}
        {!loading && customers.length > 0 && (
          <div className="flex justify-between items-center px-6 py-4.5 border-t border-stone-900/60 text-stone-400 bg-stone-900/5">
            <span className="text-xs">
              Showing <strong>{customers.length}</strong> of <strong>{total}</strong> shoppers
            </span>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-stone-800 bg-stone-900 hover:bg-stone-800 hover:text-stone-200 transition disabled:opacity-40 disabled:hover:bg-stone-900 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <span className="text-xs font-semibold">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, pages))}
                disabled={page === pages}
                className="p-1.5 rounded-lg border border-stone-800 bg-stone-900 hover:bg-stone-800 hover:text-stone-200 transition disabled:opacity-40 disabled:hover:bg-stone-900 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800/80 w-full max-w-4xl rounded-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Modal Close */}
            <button 
              onClick={() => setSelectedCustomerId(null)}
              className="absolute top-4.5 right-4.5 p-1.5 rounded-lg text-stone-500 hover:bg-stone-800 hover:text-stone-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {detailLoading || !customerDetail ? (
              <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-stone-400 text-sm">Calling up shopper dossier...</span>
              </div>
            ) : (
              <>
                {/* Modal Header Profile */}
                <div className="p-6 border-b border-stone-800/50 bg-stone-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-amber-600/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center font-display font-bold text-xl uppercase">
                      {customerDetail.customer.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl text-stone-100">{customerDetail.customer.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-stone-400">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-600" />
                          <span className="capitalize">{customerDetail.customer.city}</span>
                        </span>
                        <span>•</span>
                        <span>Age {customerDetail.customer.age_group || 'Unknown'}</span>
                        <span>•</span>
                        <span className="text-stone-500">ID: #00{customerDetail.customer.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Key Stats */}
                  <div className="flex items-center space-x-6 border-l border-stone-800 pl-6 hidden md:flex">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Lifetime Orders</span>
                      <h4 className="font-display font-bold text-lg text-stone-300 mt-0.5">{customerDetail.customer.order_count}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Total Spent</span>
                      <h4 className="font-display font-bold text-lg text-amber-500">{formatCurrency(customerDetail.customer.total_spent)}</h4>
                    </div>
                  </div>
                </div>

                {/* Modal Tabs Content */}
                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                  
                  {/* Left Column: Purchase History */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 border-b border-stone-850 pb-2">
                      <ShoppingBag className="w-4 h-4 text-stone-500" />
                      <h4 className="text-xs uppercase font-bold tracking-wider text-stone-400">Order Logs</h4>
                    </div>

                    {customerDetail.orders.length === 0 ? (
                      <p className="text-stone-500 text-xs italic">No orders registered for this account.</p>
                    ) : (
                      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                        {customerDetail.orders.map((ord) => {
                          const items = Array.isArray(ord.items) ? ord.items : JSON.parse(ord.items || '[]');
                          return (
                            <div key={ord.id} className="bg-stone-950/40 border border-stone-850 p-3.5 rounded-xl space-y-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-stone-300">Order #{ord.id}</span>
                                <span className="font-bold text-amber-500">{formatCurrency(ord.total_amount)}</span>
                              </div>
                              
                              <div className="flex items-center justify-between text-stone-500 text-[10px]">
                                <span>{new Date(ord.order_date).toLocaleString()}</span>
                                <span className="text-emerald-400 capitalize px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10">
                                  {ord.status}
                                </span>
                              </div>
                              
                              {items.length > 0 && (
                                <div className="border-t border-stone-900 pt-2 mt-2">
                                  <span className="text-[10px] text-stone-600 block uppercase font-bold tracking-wider mb-1">Products</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {items.map((item, idx) => (
                                      <span key={idx} className="bg-stone-900 border border-stone-800 text-[10px] text-stone-400 px-2 py-0.5 rounded-md flex items-center space-x-1">
                                        <Coffee className="w-2.5 h-2.5 text-stone-500" />
                                        <span>{item}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Communications History */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 border-b border-stone-850 pb-2">
                      <Mail className="w-4 h-4 text-stone-500" />
                      <h4 className="text-xs uppercase font-bold tracking-wider text-stone-400">Communication Logs</h4>
                    </div>

                    {customerDetail.communications.length === 0 ? (
                      <p className="text-stone-500 text-xs italic">No messages sent to this account yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                        {customerDetail.communications.map((comm) => (
                          <div key={comm.id} className="bg-stone-950/40 border border-stone-850 p-3.5 rounded-xl space-y-2.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-stone-300">Campaign #{comm.campaign_id}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${
                                comm.status === 'read' || comm.status === 'clicked'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : comm.status === 'delivered'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : comm.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-stone-800 text-stone-400'
                              }`}>
                                {comm.status}
                              </span>
                            </div>

                            <p className="text-stone-400 text-xs italic leading-normal bg-stone-900/50 p-2 rounded-lg border border-stone-900">
                              "{comm.message}"
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-stone-500">
                              <span className="uppercase font-semibold text-stone-600 bg-stone-900 border border-stone-850 px-2 py-0.5 rounded">
                                {comm.channel}
                              </span>
                              <span>{new Date(comm.sent_at).toLocaleString()}</span>
                            </div>

                            {comm.status === 'failed' && comm.failure_reason && (
                              <div className="text-[10px] text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg mt-1">
                                <strong>Error:</strong> {comm.failure_reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Modal Footer Profile Tags */}
                <div className="p-4 border-t border-stone-800/50 bg-stone-950/20 px-6 flex flex-wrap gap-2.5">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider self-center mr-2">Assigned Tags</span>
                  {customerDetail.customer.tags.map((tag, idx) => (
                    <span 
                      key={idx}
                      className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-600/10 text-amber-500 border border-amber-500/10 uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                  {customerDetail.customer.tags.length === 0 && (
                    <span className="text-xs text-stone-600 italic">No marketing tags allocated.</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
