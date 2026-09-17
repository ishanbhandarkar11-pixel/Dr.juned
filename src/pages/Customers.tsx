import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getTodayStr } from '../utils/dateUtils';
import { Plus, User, Search, ChevronRight, X } from 'lucide-react';
import { generateDeliveriesUpToToday } from '../db/generate';

export default function Customers({ onSelectCustomer }: { onSelectCustomer: (id: string) => void }) {
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
       <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
         <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm">
           <Plus size={20} /> Add
         </button>
       </div>

       <div className="mb-6 relative">
         <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
         <input 
           type="text" 
           placeholder="Search customers..." 
           value={search}
           onChange={e => setSearch(e.target.value)}
           className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium transition-colors"
         />
       </div>

       <div className="space-y-3">
         {filtered.length === 0 ? (
           <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
             <p className="text-slate-500 font-medium">No customers found.</p>
           </div>
         ) : (
           filtered.map(c => (
             <div key={c.id} onClick={() => onSelectCustomer(c.id)} className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${c.isActive ? 'bg-white border-slate-100 hover:border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
               <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${c.isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                   <User size={24} />
                 </div>
                 <div>
                   <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                     {c.name} {!c.isActive && <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">INACTIVE</span>}
                   </h3>
                   <p className="text-sm font-medium text-slate-500">{c.session} • {c.defaultQuantity}L @ ₹{c.rate}</p>
                 </div>
               </div>
               <ChevronRight size={24} className="text-slate-300" />
             </div>
           ))
         )}
       </div>

       {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    startDate: getTodayStr(),
    session: 'Morning',
    milkType: 'Cow',
    defaultQuantity: 1,
    rate: 50
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.customers.add({
      id: crypto.randomUUID(),
      name: form.name,
      startDate: form.startDate,
      session: form.session as 'Morning' | 'Evening',
      milkType: form.milkType as 'Cow' | 'Buffalo',
      defaultQuantity: Number(form.defaultQuantity),
      rate: Number(form.rate),
      isActive: true,
      lastGeneratedDate: '' 
    });
    await generateDeliveriesUpToToday();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Add Customer</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"><X size={20}/></button>
        </div>
        <form onSubmit={save} className="space-y-5">
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-1.5">Customer Name</label>
             <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500" />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Start Date</label>
               <input required type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500" />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Session</label>
               <select value={form.session} onChange={e => setForm({...form, session: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500 bg-white">
                 <option>Morning</option>
                 <option>Evening</option>
               </select>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Milk Type</label>
               <select value={form.milkType} onChange={e => setForm({...form, milkType: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500 bg-white">
                 <option>Cow</option>
                 <option>Buffalo</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Rate (₹/L)</label>
               <input required type="number" min="0" value={form.rate} onChange={e => setForm({...form, rate: Number(e.target.value)})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500" />
             </div>
           </div>
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-1.5">Default Quantity (L)</label>
             <input required type="number" step="0.1" min="0.1" value={form.defaultQuantity} onChange={e => setForm({...form, defaultQuantity: Number(e.target.value)})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500" />
           </div>
           
           <div className="pt-2">
             <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-[0.98] transition-all text-lg">Save Customer</button>
           </div>
        </form>
      </div>
    </div>
  )
}
