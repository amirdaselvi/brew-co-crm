import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Filter, 
  Send, 
  Coffee
} from 'lucide-react';

// Pages
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Segments from './pages/Segments';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/customers', name: 'Customers', icon: Users },
    { path: '/segments', name: 'Segments & Filters', icon: Filter },
    { path: '/campaigns', name: 'Campaigns', icon: Send },
  ];

  return (
    <aside className="w-64 h-screen sticky top-0 bg-stone-950/70 border-r border-stone-800/40 flex flex-col justify-between backdrop-blur-xl z-20">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-stone-800/30 flex items-center space-x-3">
          <div className="bg-amber-600/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              Brew & Co.
            </h1>
            <span className="text-[10px] text-stone-500 tracking-wider uppercase font-semibold block">
              Brew & Co. CRM
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5 mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3.5 px-4.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-600/10 text-amber-400 border-l-3 border-amber-500 shadow-[inset_1px_0_10px_rgba(245,158,11,0.05)]'
                    : 'text-stone-400 hover:bg-stone-900/50 hover:text-stone-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-stone-400 group-hover:text-stone-200'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Smart Engine Badge */}
      <div className="p-4 m-4 rounded-xl bg-stone-900/30 border border-stone-800/50 relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
        <div className="flex items-center space-x-2.5 mb-2">
          <div className="p-1 bg-amber-500/20 rounded-md text-amber-400">
            <Coffee className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-[11px] font-semibold text-amber-400 tracking-wider uppercase">
            Brew & Co. Engine Active
          </span>
        </div>
        <p className="text-[11px] text-stone-500 leading-normal">
          Suggesting smart audience filters and drafting personalized marketing campaigns.
        </p>
      </div>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-stone-950 text-stone-100 flex font-sans selection:bg-amber-500/30 selection:text-amber-200">
        {/* Background Gradients */}
        <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-amber-950/10 to-transparent pointer-events-none z-0"></div>
        <div className="fixed top-1/4 right-0 w-[500px] h-[500px] bg-amber-900/5 rounded-full blur-3xl pointer-events-none z-0"></div>
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main Workspace */}
        <main className="flex-1 min-w-0 p-8 z-10 relative overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
