import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer } from '../db/db';
import { getTodayStr, formatDisplayDate } from '../utils/dateUtils';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  X, 
  User, 
  Trash2,
  AlertTriangle,
  Pause,
  Calendar
} from 'lucide-react';
import { generateDeliveriesUpToToday } from '../db/generate';
import PauseCustomerModal from '../components/PauseCustomerModal';

interface CustomersProps {
  onSelectCustomer: (id: string) => void;
  showAddModalDefault?: boolean;
}

export default function Customers({ onSelectCustomer, showAddModalDefault = false }: CustomersProps) {
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [showAdd, setShowAdd] = useState(showAddModalDefault);
  const [deleteConfirmCust, setDeleteConfirmCust] = useState<Customer | null>(null);
  const [pausingCustomer, setPausingCustomer] = useState<Customer | null>(null);

  // Filter list
  const filtered = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase().trim());
    if (!matchesSearch) return false;
    const isPaused = c.status === 'Paused';
    if (activeFilter === 'active') return !isPaused;
    if (activeFilter === 'paused') return isPaused;
    return true;
  });

  const activeCount = customers.filter(c => c.status !== 'Paused').length;
  const pausedCount = customers.filter(c => c.status === 'Paused').length;

  // Handle permanent customer deletion
  const handleDeleteCustomer = async (cust: Customer) => {
    await db.deliveries.where('customerId').equals(cust.id).delete();
    await db.payments.where('customerId').equals(cust.id).delete();
    await db.customers.delete(cust.id);
    setDeleteConfirmCust(null);
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 pb-28 pt-2 px-4 max-w-lg mx-auto font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Customers</h1>
          <p className="text-xs font-semibold text-slate-400">{customers.length} customers registered</p>
        </div>
        
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-[#00A2ED] hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-sky-500/20"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Search Bar */}
      <div className="mt-4 relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-[#1C2541] border border-[#2A3756] rounded-2xl text-white placeholder-slate-400 font-medium text-sm outline-none focus:border-[#00A2ED] transition-colors"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Tabs / Chips */}
      <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeFilter === 'all'
              ? 'bg-[#00A2ED] text-white shadow-md shadow-sky-500/20'
              : 'bg-[#1C2541] border border-[#2A3756] text-slate-400 hover:text-white'
          }`}
        >
          All ({customers.length})
        </button>
        <button
          onClick={() => setActiveFilter('active')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeFilter === 'active'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-[#1C2541] border border-[#2A3756] text-slate-400 hover:text-white'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setActiveFilter('paused')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeFilter === 'paused'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-[#1C2541] border border-[#2A3756] text-slate-400 hover:text-white'
          }`}
        >
          Paused ({pausedCount})
        </button>
      </div>

      {/* Customer List */}
      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-[#1C2541] border border-[#2A3756] rounded-2xl">
            <User size={36} className="mx-auto text-slate-500 mb-2" />
            <p className="text-slate-300 font-bold text-sm">कोई ग्राहक नहीं मिला</p>
            <p className="text-slate-500 text-xs mt-1">नया ग्राहक जोड़ने के लिए ऊपर '+ Add' बटन दबाएँ।</p>
          </div>
        ) : (
          filtered.map(c => {
            const isPaused = c.status === 'Paused';

            return (
              <div 
                key={c.id}
                className="p-3.5 rounded-2xl bg-[#1C2541] border border-[#2A3756] flex items-center justify-between transition-all hover:border-slate-500 cursor-pointer active:scale-[0.99] group shadow-sm"
              >
                <div 
                  onClick={() => onSelectCustomer(c.id)}
                  className="flex items-center gap-3.5 flex-1"
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-inner ${
                    isPaused ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
                  }`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors flex items-center gap-2">
                      {c.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      {c.defaultQuantity} L/day • ₹{c.rate}/L
                    </p>
                    {isPaused && c.pauseStartDate && c.pauseEndDate && (
                      <p className="text-[11px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                        <Calendar size={12} /> {formatDisplayDate(c.pauseStartDate)} से {formatDisplayDate(c.pauseEndDate)} तक बंद
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Direct Pause / Active Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setPausingCustomer(c);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm ${
                      isPaused 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                    title={isPaused ? "दूध चालू करने के लिए टैप करें" : "दूध बंद (Pause) करने के लिए टैप करें"}
                  >
                    {isPaused ? (
                      <>
                        <Pause size={13} className="text-amber-400" />
                        <span>Paused (बंद)</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Active (चालू)</span>
                      </>
                    )}
                  </button>

                  {/* Fast Delete Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmCust(c);
                    }}
                    title="Delete customer permanently"
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>

                  <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pause / Resume Customer Modal */}
      {pausingCustomer && (
        <PauseCustomerModal 
          customer={pausingCustomer}
          onClose={() => setPausingCustomer(null)}
        />
      )}

      {/* Add Customer Modal (Exact match to Screen 3) */}
      {showAdd && (
        <AddCustomerModal 
          onClose={() => setShowAdd(false)}
          onAdded={(newCust) => onSelectCustomer(newCust.id)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCust && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C2541] border border-rose-500/30 rounded-3xl p-5 w-full max-w-sm shadow-2xl text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            
            <h3 className="text-base font-bold text-white">
              ग्राहक को हमेशा के लिए डिलीट करें?
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              क्या आप सच में <strong className="text-rose-300">{deleteConfirmCust.name}</strong> को और उनके सभी पुराने रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteConfirmCust(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#2A3756] text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                रद्द करें
              </button>
              <button
                onClick={() => handleDeleteCustomer(deleteConfirmCust)}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                हाँ, डिलीट करें
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Add Customer Modal Component
export function AddCustomerModal({ 
  onClose, 
  onAdded 
}: { 
  onClose: () => void; 
  onAdded?: (customer: Customer) => void 
}) {
  const [name, setName] = useState('');
  const [dailyQty, setDailyQty] = useState<number>(1);
  const [rate, setRate] = useState<number>(60);
  const [startDate, setStartDate] = useState(getTodayStr());
  const [status, setStatus] = useState<'Active' | 'Paused'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        name: name.trim(),
        startDate: startDate,
        defaultQuantity: Number(dailyQty),
        rate: Number(rate),
        status: status,
        isActive: status === 'Active',
        lastGeneratedDate: ''
      };

      await db.customers.add(newCustomer);
      await generateDeliveriesUpToToday();

      if (onAdded) {
        onAdded(newCustomer);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-[#1C2541] border border-[#2A3756] rounded-3xl p-6 w-full max-w-sm max-h-[92vh] overflow-y-auto shadow-2xl text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[#2A3756]">
          <h3 className="text-base font-bold text-white">Add Customer</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2A3756] text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Customer Name <span className="text-rose-400">*</span>
            </label>
            <input 
              required
              type="text"
              placeholder="e.g. Rahul"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-[#00A2ED] transition-colors"
            />
          </div>

          {/* Daily Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Daily Quantity (Litres) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input 
                required
                type="number"
                step="0.1"
                min="0.1"
                value={dailyQty}
                onChange={e => setDailyQty(Number(e.target.value))}
                className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-[#00A2ED] transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                L
              </span>
            </div>
          </div>

          {/* Rate per Litre */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Rate per Litre (₹) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input 
                required
                type="number"
                min="1"
                value={rate}
                onChange={e => setRate(Number(e.target.value))}
                className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-[#00A2ED] transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₹
              </span>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Start Date <span className="text-rose-400">*</span>
            </label>
            <input 
              required
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-[#00A2ED] transition-colors"
            />
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#0B132B] p-1 rounded-xl border border-[#2A3756]">
              <button
                type="button"
                onClick={() => setStatus('Active')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  status === 'Active'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('Paused')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  status === 'Paused'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Paused
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#00A2ED] hover:bg-sky-500 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              Save Customer
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
