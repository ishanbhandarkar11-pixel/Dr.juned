import React, { useState, useEffect } from 'react';
import { Home, Users, CreditCard } from 'lucide-react';
import { generateDeliveriesUpToToday } from './db/generate';

import Dashboard from './pages/Dashboard';
import Customers, { AddCustomerModal } from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Payments from './pages/Payments';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'customers' | 'payments'>('home');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Generate automatic deliveries up to today on app load & remove Shrikisan
    generateDeliveriesUpToToday()
      .then(() => setIsInitializing(false))
      .catch(err => {
        console.error('DB Init error', err);
        setIsInitializing(false);
      });
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex items-center justify-center font-sans">
        <div className="text-center animate-pulse">
          <div className="w-14 h-14 border-4 border-[#00A2ED] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-base font-bold text-white tracking-wide">Milk Manager चालू हो रहा है...</h2>
          <p className="text-xs text-slate-400 mt-1">Simple • Smart • For You</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      
      {/* View Router */}
      <main className="max-w-lg mx-auto">
        {selectedCustomerId ? (
          <CustomerDetail 
            customerId={selectedCustomerId} 
            onBack={() => setSelectedCustomerId(null)} 
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <Dashboard 
                onNavigateToCustomer={(id) => setSelectedCustomerId(id)}
                onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
                onNavigateToPayments={() => setActiveTab('payments')}
              />
            )}

            {activeTab === 'customers' && (
              <Customers 
                onSelectCustomer={(id) => setSelectedCustomerId(id)} 
              />
            )}

            {activeTab === 'payments' && (
              <Payments 
                onSelectCustomer={(id) => setSelectedCustomerId(id)} 
              />
            )}
          </>
        )}
      </main>

      {/* Global Add Customer Modal */}
      {isAddCustomerOpen && (
        <AddCustomerModal 
          onClose={() => setIsAddCustomerOpen(false)}
          onAdded={(newCust) => {
            setSelectedCustomerId(newCust.id);
            setIsAddCustomerOpen(false);
          }}
        />
      )}

      {/* Bottom Navigation Bar (Matching Mockup) */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#162038]/95 backdrop-blur-md border-t border-[#2A3756] pb-1 shadow-2xl z-40">
        <div className="max-w-lg mx-auto flex justify-around items-center px-4 h-16">
          
          <NavItem 
            icon={<Home size={20} />} 
            label="Home" 
            isActive={activeTab === 'home' && !selectedCustomerId} 
            onClick={() => {
              setSelectedCustomerId(null);
              setActiveTab('home');
            }} 
          />

          <NavItem 
            icon={<Users size={20} />} 
            label="Customers" 
            isActive={activeTab === 'customers' && !selectedCustomerId} 
            onClick={() => {
              setSelectedCustomerId(null);
              setActiveTab('customers');
            }} 
          />

          <NavItem 
            icon={<CreditCard size={20} />} 
            label="Payments" 
            isActive={activeTab === 'payments' && !selectedCustomerId} 
            onClick={() => {
              setSelectedCustomerId(null);
              setActiveTab('payments');
            }} 
          />

        </div>
      </nav>

    </div>
  );
}

function NavItem({ 
  icon, 
  label, 
  isActive, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick: () => void; 
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
        isActive ? 'text-[#00A2ED]' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${
        isActive ? 'bg-sky-500/15 text-[#00A2ED]' : 'bg-transparent'
      }`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold tracking-wider ${
        isActive ? 'font-extrabold text-[#00A2ED]' : 'font-semibold opacity-70'
      }`}>
        {label}
      </span>
    </button>
  );
}
