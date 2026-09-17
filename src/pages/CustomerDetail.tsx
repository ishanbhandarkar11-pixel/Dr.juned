import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ArrowLeft, Edit2, Trash2, Settings, History, Save, X, CheckCircle2, Download } from 'lucide-react';
import { getCurrentMonthStr, formatMonthStr, formatDisplayDate, getAllMonthsInRange, getTodayStr } from '../utils/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CustomerDetail({ customerId, onBack }: { customerId: string, onBack: () => void }) {
  const customer = useLiveQuery(() => db.customers.get(customerId), [customerId]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  
  const deliveries = useLiveQuery(
    () => db.deliveries.where({ customerId, month: selectedMonth }).toArray(),
    [customerId, selectedMonth]
  ) || [];

  const [showSettings, setShowSettings] = useState(false);

  if (!customer) return null;

  const activeDeliveries = deliveries.filter(d => d.status === 'Delivered');
  const monthQty = activeDeliveries.reduce((sum, d) => sum + d.quantity, 0);
  const monthAmt = activeDeliveries.reduce((sum, d) => sum + d.amount, 0);

  // Generate list of months from start date to current month
  const todayMonth = getCurrentMonthStr();
  const startMonth = customer.startDate.substring(0, 7);
  const availableMonths = getAllMonthsInRange(startMonth, todayMonth).reverse();

  const toggleActive = async () => {
    if (confirm(`Are you sure you want to ${customer.isActive ? 'deactivate' : 'reactivate'} this customer?`)) {
      await db.customers.update(customerId, { isActive: !customer.isActive });
    }
  };

  const deleteCustomer = async () => {
    if (confirm('DANGER: Delete this customer permanently? This action will permanently remove the customer profile and all associated historical records.')) {
      await db.customers.delete(customerId);
      const toDelete = await db.deliveries.where({ customerId }).toArray();
      await db.deliveries.bulkDelete(toDelete.map(d => d.id));
      onBack();
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Monthly Milk Bill', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on ${formatDisplayDate(getTodayStr())}`, 14, 28);

    // Customer Info
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Bill To: ${customer.name}`, 14, 40);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Plan: ${customer.session} • ${customer.milkType}`, 14, 46);
    doc.text(`Default: ${customer.defaultQuantity} L @ Rs.${customer.rate}/L`, 14, 52);

    // Billing Month & Summary
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Billing Month: ${formatMonthStr(selectedMonth)}`, 120, 40);
    
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(`Total Milk: ${monthQty} L`, 120, 48);
    doc.setFontSize(14);
    doc.text(`Total Due: Rs. ${monthAmt}`, 120, 56);

    // Table Data
    const tableColumn = ["Date", "Status", "Quantity (L)", "Amount (Rs)"];
    const tableRows: any[] = [];

    const sortedDeliveries = [...deliveries].sort((a,b) => a.date.localeCompare(b.date));

    sortedDeliveries.forEach(d => {
      const isSkipped = d.status === 'Skipped';
      const dateStr = formatDisplayDate(d.date);
      const statusStr = isSkipped ? 'Not Taken' : (d.isManual ? 'Delivered (Edited)' : 'Delivered');
      const qtyStr = isSkipped ? '-' : d.quantity.toString();
      const amtStr = isSkipped ? '-' : d.amount.toString();
      tableRows.push([dateStr, statusStr, qtyStr, amtStr]);
    });

    if (tableRows.length === 0) {
      tableRows.push([{ content: 'No records found for this month.', colSpan: 4, styles: { halign: 'center' } }]);
    }

    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      foot: tableRows.length > 0 ? [["Monthly Total", "", `${monthQty} L`, `Rs. ${monthAmt}`]] : undefined,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    // Save File
    const fileName = `Milk_Bill_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedMonth}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
          <ArrowLeft size={24} className="text-slate-700"/>
        </button>
        <h1 className="text-2xl font-bold text-slate-900 flex-1">{customer.name}</h1>
        <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Default Plan</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{customer.defaultQuantity} L @ ₹{customer.rate}/L</h2>
          </div>
          <div className={`px-3 py-1 text-xs font-bold rounded-full ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
            {customer.isActive ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg">{customer.session}</span>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg">{customer.milkType}</span>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg">Started {formatDisplayDate(customer.startDate)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History size={20} className="text-blue-600" /> History
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadPDF} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
          >
            <Download size={18} /> <span className="hidden sm:inline">Download</span> PDF
          </button>
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="border-2 border-slate-200 bg-white rounded-xl px-3 py-1.5 font-bold text-slate-700 outline-none focus:border-blue-500"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthStr(m)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Monthly Milk</p>
          <p className="text-xl font-bold text-slate-900">{monthQty} L</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Monthly Bill</p>
          <p className="text-xl font-bold text-slate-900">₹{monthAmt}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {deliveries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 font-medium">No records found for {formatMonthStr(selectedMonth)}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deliveries.sort((a,b) => b.date.localeCompare(a.date)).map(d => {
              const isSkipped = d.status === 'Skipped';
              return (
                <div key={d.id} className={`p-4 flex items-center justify-between ${isSkipped ? 'bg-slate-50' : 'bg-white'}`}>
                  <div>
                    <p className={`font-bold ${isSkipped ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{formatDisplayDate(d.date)}</p>
                    {d.isManual && !isSkipped && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">EDITED</span>}
                    {isSkipped && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">NOT TAKEN</span>}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isSkipped ? 'text-slate-400' : 'text-slate-900'}`}>{d.quantity} L</p>
                    <p className="text-sm font-semibold text-slate-500">₹{d.amount}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showSettings && (
        <CustomerSettingsModal 
          customer={customer} 
          onClose={() => setShowSettings(false)} 
          onToggleActive={toggleActive}
          onDelete={deleteCustomer}
        />
      )}
    </div>
  )
}

function CustomerSettingsModal({ customer, onClose, onToggleActive, onDelete }: any) {
  const [form, setForm] = useState({
    session: customer.session,
    milkType: customer.milkType,
    defaultQuantity: customer.defaultQuantity,
    rate: customer.rate
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.customers.update(customer.id, {
      session: form.session,
      milkType: form.milkType,
      defaultQuantity: Number(form.defaultQuantity),
      rate: Number(form.rate)
    });
    // This affects future generations naturally.
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Customer Settings</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"><X size={20}/></button>
        </div>

        <form onSubmit={save} className="space-y-4 mb-8">
           <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-2">
             <p className="text-sm text-blue-800 font-medium flex items-start gap-2">
               <CheckCircle2 size={16} className="mt-0.5 shrink-0"/> 
               Changing the default plan only applies to future deliveries. Past records remain unchanged.
             </p>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Session</label>
               <select value={form.session} onChange={e => setForm({...form, session: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500 bg-white">
                 <option>Morning</option>
                 <option>Evening</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Milk Type</label>
               <select value={form.milkType} onChange={e => setForm({...form, milkType: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500 bg-white">
                 <option>Cow</option>
                 <option>Buffalo</option>
               </select>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Rate (₹/L)</label>
               <input required type="number" min="0" value={form.rate} onChange={e => setForm({...form, rate: Number(e.target.value)})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500" />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1.5">Default Qty (L)</label>
               <input required type="number" step="0.1" min="0.1" value={form.defaultQuantity} onChange={e => setForm({...form, defaultQuantity: Number(e.target.value)})} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-blue-500" />
             </div>
           </div>
           
           <div className="pt-2">
             <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2">
               <Save size={18} /> Update Plan
             </button>
           </div>
        </form>

        <div className="pt-6 border-t border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-900 mb-2">Danger Zone</h4>
          <button type="button" onClick={onToggleActive} className={`w-full py-3 font-bold rounded-xl active:scale-[0.98] transition-all border-2 ${customer.isActive ? 'border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100' : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'}`}>
            {customer.isActive ? 'Deactivate Customer' : 'Reactivate Customer'}
          </button>
          <button type="button" onClick={onDelete} className="w-full py-3 font-bold rounded-xl active:scale-[0.98] transition-all border-2 border-red-200 text-red-700 bg-red-50 hover:bg-red-100 flex justify-center items-center gap-2">
            <Trash2 size={18}/> Delete Permanently
          </button>
        </div>
      </div>
    </div>
  )
}
