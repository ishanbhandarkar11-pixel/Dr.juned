import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getCurrentMonthStr, formatMonthStr, getAllMonthsInRange, getTodayStr } from '../utils/dateUtils';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const deliveries = useLiveQuery(
    () => db.deliveries.where('month').equals(selectedMonth).toArray(),
    [selectedMonth]
  ) || [];

  const activeDeliveries = deliveries.filter(d => d.status === 'Delivered');
  const monthQty = activeDeliveries.reduce((sum, d) => sum + d.quantity, 0);
  const monthAmt = activeDeliveries.reduce((sum, d) => sum + d.amount, 0);

  // Group by customer
  const customerStats = customers.map(c => {
    const custDeliveries = activeDeliveries.filter(d => d.customerId === c.id);
    const qty = custDeliveries.reduce((sum, d) => sum + d.quantity, 0);
    const amt = custDeliveries.reduce((sum, d) => sum + d.amount, 0);
    return { ...c, qty, amt, days: custDeliveries.length };
  }).filter(c => c.qty > 0).sort((a,b) => b.amt - a.amt);

  // Getting a reasonable list of months for the dropdown
  // Usually from the earliest customer start date
  const earliestDate = customers.reduce((min, c) => c.startDate < min ? c.startDate : min, getTodayStr());
  const startMonth = earliestDate.substring(0, 7);
  const availableMonths = getAllMonthsInRange(startMonth, getCurrentMonthStr()).reverse();

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <select 
          value={selectedMonth} 
          onChange={e => setSelectedMonth(e.target.value)}
          className="border-2 border-slate-200 bg-white rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500"
        >
          {availableMonths.map(m => (
            <option key={m} value={m}>{formatMonthStr(m)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-md shadow-blue-600/20">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <BarChart3 size={18} />
            <span className="text-sm font-bold uppercase tracking-wide">Total Milk</span>
          </div>
          <p className="text-3xl font-black">{monthQty} L</p>
        </div>
        <div className="bg-green-600 text-white p-5 rounded-2xl shadow-md shadow-green-600/20">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <TrendingUp size={18} />
            <span className="text-sm font-bold uppercase tracking-wide">Total Amount</span>
          </div>
          <p className="text-3xl font-black">₹{monthAmt}</p>
        </div>
      </div>

      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Users size={20} className="text-slate-500"/> Customer Summary
      </h2>
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {customerStats.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 font-medium">No activity this month.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {customerStats.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{c.name}</h3>
                  <p className="text-sm font-medium text-slate-500">{c.days} deliveries</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{c.qty} L</p>
                  <p className="text-sm font-semibold text-slate-500">₹{c.amt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
