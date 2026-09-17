import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileBarChart, BotMessageSquare } from 'lucide-react';
import { generateDeliveriesUpToToday } from './db/generate';

import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Reports from './pages/Reports';
import Assistant from './pages/Assistant';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Generate automatic deliveries up to today on app load
    generateDeliveriesUpToToday().then(() => {
      setIsInitializing(false);
    }).catch(err => {
      console.error("DB Init error", err);
      setIsInitializing(false);
    });
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-slate-800">Initializing System...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Main Content Area */}
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'customers' && (
        selectedCustomerId 
          ? <CustomerDetail customerId={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} />
          : <Customers onSelectCustomer={setSelectedCustomerId} />
      )}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'assistant' && <Assistant />}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 pb-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-40">
        <div className="max-w-md mx-auto flex justify-between items-center px-6 h-20">
          <NavItem 
            icon={<LayoutDashboard size={24} />} 
            label="Dashboard" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Users size={24} />} 
            label="Customers" 
            isActive={activeTab === 'customers'} 
            onClick={() => {
              setSelectedCustomerId(null);
              setActiveTab('customers');
            }} 
          />
          <NavItem 
            icon={<FileBarChart size={24} />} 
            label="Reports" 
            isActive={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')} 
          />
          <NavItem 
            icon={<BotMessageSquare size={24} />} 
            label="Assistant" 
            isActive={activeTab === 'assistant'} 
            onClick={() => setActiveTab('assistant')} 
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 gap-1.5 transition-all ${
        isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-80'}`}>
        {label}
      </span>
    </button>
  );
}
