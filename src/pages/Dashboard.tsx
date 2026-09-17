import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getTodayStr, formatDisplayDate, getCurrentMonthStr } from '../utils/dateUtils';
import { Edit2, Trash2, X } from 'lucide-react';

export default function Dashboard() {
  const today = getTodayStr();
  const currentMonth = getCurrentMonthStr();
  
  const deliveriesToday = useLiveQuery(
    () => db.deliveries.where('date').equals(today).toArray(),
    [today]
  ) || [];

  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const deliveriesMonth = useLiveQuery(
    () => db.deliveries.where('month').equals(currentMonth).toArray(),
    [currentMonth]
  ) || [];

  const activeDeliveriesToday = deliveriesToday.filter(d => d.status === 'Delivered');
  const todayTotalQty = activeDeliveriesToday.reduce((sum, d) => sum + d.quantity, 0);
  const todayTotalAmt = activeDeliveriesToday.reduce((sum, d) => sum + d.amount, 0);

  const activeDeliveriesMonth = deliveriesMonth.filter(d => d.status === 'Delivered');
  const monthTotalQty = activeDeliveriesMonth.reduce((sum, d) => sum + d.quantity, 0);
  const monthTotalAmt = activeDeliveriesMonth.reduce((sum, d) => sum + d.amount, 0);

  const [editingDelivery, setEditingDelivery] = useState<any>(null);

  const handleDelete = async (id: string) => {
    if (confirm('Mark as NOT TAKEN?')) {
      await db.deliveries.update(id, { status: 'Skipped', quantity: 0, amount: 0, isManual: true });
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDelivery) {
      const amount = editingDelivery.quantity * editingDelivery.rate;
      await db.deliveries.update(editingDelivery.id, { 
        quantity: editingDelivery.quantity, 
        amount: amount,
        isManual: true,
        status: 'Delivered'
      });
      setEditingDelivery(null);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Milk Management</h1>
        <p className="text-slate-500 font-medium">{formatDisplayDate(today)}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Today's Milk</p>
          <p className="text-2xl font-black text-blue-900">{todayTotalQty} L</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <p className="text-xs text-green-600 font-bold uppercase tracking-wide">Today's Amt</p>
          <p className="text-2xl font-black text-green-900">₹{todayTotalAmt}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Month's Milk</p>
          <p className="text-xl font-bold text-slate-800">{monthTotalQty} L</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Month's Amt</p>
          <p className="text-xl font-bold text-slate-800">₹{monthTotalAmt}</p>
        </div>
      </div>

      <h2 className="text-lg font-bold text-slate-900 mb-4">Today's Deliveries</h2>
      <div className="space-y-3">
        {deliveriesToday.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-slate-500 font-medium">No deliveries expected today.</p>
          </div>
        ) : (
          deliveriesToday.map(delivery => {
            const customer = customers.find(c => c.id === delivery.customerId);
            if (!customer) return null;
            const isSkipped = delivery.status === 'Skipped';
            return (
              <div key={delivery.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isSkipped ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div>
                  <h3 className={`font-bold text-lg ${isSkipped ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                    {customer.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500">{customer.session} • {customer.milkType}</p>
                  {isSkipped && <span className="inline-block mt-1 text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded">NOT TAKEN</span>}
                </div>
                {!isSkipped ? (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-900">{delivery.quantity} L</p>
                      <p className="text-sm font-semibold text-slate-500">₹{delivery.amount}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingDelivery(delivery)} className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 active:scale-95 transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(delivery.id)} className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 active:scale-95 transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ) : (
                   <div className="flex items-center gap-4">
                     <button onClick={() => setEditingDelivery({...delivery, quantity: customer.defaultQuantity})} className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-200 rounded-xl hover:bg-slate-300 active:scale-95 transition-all">Undo</button>
                   </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {editingDelivery && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Edit Today's Delivery</h3>
              <button onClick={() => setEditingDelivery(null)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"><X size={20}/></button>
            </div>
            <form onSubmit={saveEdit}>
               <div className="mb-5">
                 <label className="block text-sm font-bold text-slate-700 mb-2">Actual Quantity (Litres)</label>
                 <input type="number" step="0.1" required min="0" value={editingDelivery.quantity} onChange={e => setEditingDelivery({...editingDelivery, quantity: parseFloat(e.target.value) || 0})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold text-lg outline-none focus:border-blue-500 transition-colors" />
               </div>
               <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <p className="text-sm font-medium text-slate-500 mb-1">Rate: ₹{editingDelivery.rate}/L</p>
                 <p className="font-bold text-xl text-slate-900">Total Amount: ₹{editingDelivery.quantity * editingDelivery.rate}</p>
               </div>
               <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-[0.98] transition-all text-lg">Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
