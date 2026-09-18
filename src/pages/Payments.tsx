import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer, Payment } from '../db/db';
import { getTodayStr, formatDisplayDate } from '../utils/dateUtils';
import { uploadPaymentToCloud } from '../db/firebase';
import { 
  Plus, 
  IndianRupee, 
  Search, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  Wallet,
  Clock,
  ArrowDownLeft,
  Filter
} from 'lucide-react';

interface PaymentsProps {
  onSelectCustomer?: (customerId: string) => void;
}

export default function Payments({ onSelectCustomer }: PaymentsProps) {
  const todayStr = getTodayStr();

  // Queries
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const allDeliveries = useLiveQuery(() => db.deliveries.toArray()) || [];
  const allPayments = useLiveQuery(() => db.payments.toArray()) || [];

  const [search, setSearch] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedCustomerIdForPay, setSelectedCustomerIdForPay] = useState<string | null>(null);

  // Per Customer Balance Mapping
  const customerBalances = useMemo(() => {
    return customers.map(cust => {
      const custDeliveries = allDeliveries.filter(d => d.customerId === cust.id);
      const custPayments = allPayments.filter(p => p.customerId === cust.id);

      const totalDue = custDeliveries.reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.amount), 0);
      const totalPaid = custPayments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, totalDue - totalPaid);

      return {
        customer: cust,
        totalDue,
        totalPaid,
        remaining
      };
    });
  }, [customers, allDeliveries, allPayments]);

  // Overall Totals
  const totals = useMemo(() => {
    const totalDue = customerBalances.reduce((sum, c) => sum + c.totalDue, 0);
    const totalPaid = customerBalances.reduce((sum, c) => sum + c.totalPaid, 0);
    const remaining = Math.max(0, totalDue - totalPaid);
    return { totalDue, totalPaid, remaining };
  }, [customerBalances]);

  // Filtered customer list
  const filteredBalances = customerBalances.filter(c => 
    c.customer.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  // Recent Payments (Newest first)
  const recentPayments = useMemo(() => {
    return [...allPayments].sort((a, b) => b.date.localeCompare(a.date));
  }, [allPayments]);

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 pb-28 pt-2 px-4 max-w-lg mx-auto font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Payments & Khata</h1>
          <p className="text-xs font-semibold text-slate-400">कुल हिसाब और भुगतान</p>
        </div>

        <button 
          onClick={() => {
            setSelectedCustomerIdForPay(null);
            setIsRecordModalOpen(true);
          }}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {/* Top 3 Metric Cards (Match Screen 7) */}
      <div className="grid grid-cols-3 gap-2.5 mt-4">
        
        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-3 shadow-sm text-center">
          <span className="text-[11px] font-semibold text-slate-400">Total Due</span>
          <div className="text-base font-black text-white mt-0.5">
            ₹ {totals.totalDue.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-3 shadow-sm text-center">
          <span className="text-[11px] font-semibold text-slate-400">Paid</span>
          <div className="text-base font-black text-emerald-400 mt-0.5">
            ₹ {totals.totalPaid.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-3 shadow-sm text-center">
          <span className="text-[11px] font-semibold text-slate-400">Remaining</span>
          <div className="text-base font-black text-rose-400 mt-0.5">
            ₹ {totals.remaining.toLocaleString('en-IN')}
          </div>
        </div>

      </div>

      {/* Search Input */}
      <div className="mt-4 relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text"
          placeholder="Search customer balance..."
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

      {/* Customer Balances List */}
      <div className="mt-4 space-y-2.5">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Customer Khata (ग्राहक खाता)
        </h2>

        {filteredBalances.map(({ customer, totalDue, totalPaid, remaining }) => (
          <div 
            key={customer.id}
            className="p-3.5 rounded-2xl bg-[#1C2541] border border-[#2A3756] flex items-center justify-between shadow-sm transition-all hover:border-slate-600"
          >
            <div 
              onClick={() => onSelectCustomer?.(customer.id)}
              className="flex items-center gap-3 cursor-pointer flex-1"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2A3756] text-white flex items-center justify-center font-bold text-sm">
                {customer.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {customer.name}
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  कुल: ₹{totalDue} • जमा: ₹{totalPaid}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">बाकी</span>
                <span className={`text-sm font-black ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ₹ {remaining}
                </span>
              </div>

              <button
                onClick={() => {
                  setSelectedCustomerIdForPay(customer.id);
                  setIsRecordModalOpen(true);
                }}
                className="ml-1 p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
              >
                + Pay
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Payments History (Match Screen 7) */}
      <div className="mt-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-2.5">
          Recent Payments (हाल के भुगतान)
        </h2>

        {recentPayments.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#1C2541] border border-[#2A3756] text-center text-xs text-slate-400">
            अभी तक कोई पेमेंट रिकॉर्ड नहीं हुआ है।
          </div>
        ) : (
          <div className="space-y-2">
            {recentPayments.slice(0, 10).map(p => {
              const cust = customers.find(c => c.id === p.customerId);

              return (
                <div 
                  key={p.id}
                  className="p-3 rounded-xl bg-[#1C2541] border border-[#2A3756] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <ArrowDownLeft size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-white block">{cust?.name || 'Customer'}</span>
                      <span className="text-[10px] text-slate-400">{formatDisplayDate(p.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0B132B] text-slate-300 border border-[#2A3756]">
                      {p.paymentMode}
                    </span>
                    <span className="font-black text-emerald-400 text-sm">
                      ₹ {p.amount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <GlobalRecordPaymentModal 
          customers={customers}
          customerBalances={customerBalances}
          preselectedCustomerId={selectedCustomerIdForPay}
          onClose={() => setIsRecordModalOpen(false)}
        />
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------------
// Global Record Payment Modal
// ---------------------------------------------------------------------------------
function GlobalRecordPaymentModal({
  customers,
  customerBalances,
  preselectedCustomerId,
  onClose
}: {
  customers: Customer[];
  customerBalances: { customer: Customer; remaining: number }[];
  preselectedCustomerId: string | null;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(
    preselectedCustomerId || (customers[0]?.id || '')
  );

  const selectedBalance = useMemo(() => {
    return customerBalances.find(c => c.customer.id === selectedId)?.remaining || 0;
  }, [customerBalances, selectedId]);

  const [amount, setAmount] = useState<number>(selectedBalance > 0 ? selectedBalance : 500);
  const [date, setDate] = useState(getTodayStr());
  const [mode, setMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !amount || amount <= 0) return;

    const newPayment: Payment = {
      id: crypto.randomUUID(),
      customerId: selectedId,
      date: date,
      amount: Number(amount),
      paymentMode: mode,
      notes: notes.trim()
    };

    await db.payments.add(newPayment);
    uploadPaymentToCloud(newPayment);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#1C2541] border border-[#2A3756] rounded-3xl p-5 w-full max-w-sm shadow-2xl text-slate-100">
        
        <div className="flex items-center justify-between pb-3 border-b border-[#2A3756]">
          <div>
            <h3 className="text-base font-bold text-white">Record Payment</h3>
            <p className="text-xs text-slate-400">ग्राहक के खाते में पैसे जमा करें</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2A3756] text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Customer
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:border-[#00A2ED]"
            >
              {customers.map(c => {
                const bal = customerBalances.find(b => b.customer.id === c.id)?.remaining || 0;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} (बाकी: ₹{bal})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Payment Amount (₹) *
            </label>
            <div className="relative">
              <input 
                required
                type="number"
                step="any"
                min="0.01"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-4 py-3 text-lg font-black text-emerald-400 outline-none focus:border-emerald-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                ₹ Paid
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'UPI', 'Bank'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    mode === m 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                      : 'bg-[#0B132B] border border-[#2A3756] text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Date
            </label>
            <input 
              required
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-[#00A2ED]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
            >
              ₹ {amount} जमा करें
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
