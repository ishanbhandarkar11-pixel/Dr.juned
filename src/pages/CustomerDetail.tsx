import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer, Delivery, Payment } from '../db/db';
import { 
  getTodayStr, 
  getCurrentMonthStr, 
  formatDisplayDate, 
  addDays,
  getPreviousMonthStr,
  getNextMonthStr,
  formatMonthStr
} from '../utils/dateUtils';
import { 
  ArrowLeft, 
  IndianRupee, 
  Milk, 
  CheckCircle2, 
  Ban, 
  MoreVertical, 
  X, 
  Plus, 
  Download, 
  Clock, 
  Trash2, 
  Calendar,
  AlertTriangle,
  Edit3,
  Pause,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PauseCustomerModal from '../components/PauseCustomerModal';
import BillReceiptModal from '../components/BillReceiptModal';
import { 
  uploadCustomerToCloud, 
  uploadDeliveryToCloud, 
  uploadPaymentToCloud, 
  deleteCustomerFromCloud 
} from '../db/firebase';

interface CustomerDetailProps {
  customerId: string;
  onBack: () => void;
}

export default function CustomerDetail({ customerId, onBack }: CustomerDetailProps) {
  const todayStr = getTodayStr();
  const currentMonthStr = getCurrentMonthStr();

  // Queries
  const customer = useLiveQuery(() => db.customers.get(customerId), [customerId]);
  const allDeliveries = useLiveQuery(
    () => db.deliveries.where('customerId').equals(customerId).toArray(),
    [customerId]
  ) || [];
  const allPayments = useLiveQuery(
    () => db.payments.where('customerId').equals(customerId).toArray(),
    [customerId]
  ) || [];

  // Month navigation (Defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);

  // Month-filtered deliveries (deduplicated by date)
  const monthDeliveries = useMemo(() => {
    const seenDates = new Set<string>();
    const unique: Delivery[] = [];
    const sorted = [...allDeliveries]
      .filter(d => d.month === selectedMonth)
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first

    for (const d of sorted) {
      if (!seenDates.has(d.date)) {
        seenDates.add(d.date);
        unique.push(d);
      }
    }
    return unique;
  }, [allDeliveries, selectedMonth]);

  // Overall & Month Calculations
  const stats = useMemo(() => {
    const totalMilk = monthDeliveries.reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.quantity), 0);
    const totalAmount = monthDeliveries.reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.amount), 0);
    
    // Deduplicated all deliveries
    const seenAllDates = new Set<string>();
    const uniqueAllDeliveries: Delivery[] = [];
    for (const d of allDeliveries) {
      if (!seenAllDates.has(d.date)) {
        seenAllDates.add(d.date);
        uniqueAllDeliveries.push(d);
      }
    }

    // Payments made in the selected month
    const monthPayments = allPayments.filter(p => p.date.startsWith(selectedMonth));
    const monthPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    // Remaining balance for the selected month
    const monthRemaining = Math.max(0, totalAmount - monthPaid);

    return {
      totalMilk: Math.round(totalMilk * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPaid: Math.round(monthPaid * 100) / 100,
      remaining: Math.round(monthRemaining * 100) / 100
    };
  }, [monthDeliveries, allPayments, selectedMonth]);

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#0B132B] text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="text-center">
          <p className="text-slate-400">ग्राहक नहीं मिला।</p>
          <button onClick={onBack} className="mt-3 px-4 py-2 bg-[#00A2ED] text-white rounded-xl text-xs font-bold">
            वापस जाएँ
          </button>
        </div>
      </div>
    );
  }

  // Delete Customer permanently
  const handleDeleteCustomer = async () => {
    await db.deliveries.where('customerId').equals(customerId).delete();
    await db.payments.where('customerId').equals(customerId).delete();
    await db.customers.delete(customerId);
    deleteCustomerFromCloud(customerId);
    onBack();
  };

  // Generate clean PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Brand Title
    doc.setFillColor(11, 19, 43); // #0B132B
    doc.rect(0, 0, 210, 36, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MILK MANAGER - MONTHLY BILL', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Month: ${selectedMonth}   |   Date of Issue: ${todayStr}`, 14, 28);

    // Customer Info Card
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Customer Name: ${customer.name}`, 14, 46);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Daily Qty: ${customer.defaultQuantity} L  |  Standard Rate: Rs ${customer.rate}/L`, 14, 53);

    // Summary Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 58, 182, 22, 3, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Milk: ${stats.totalMilk} L`, 20, 71);
    doc.text(`Total Amount: Rs ${stats.totalAmount}`, 70, 71);
    doc.text(`Paid: Rs ${stats.totalPaid}`, 125, 71);
    doc.setTextColor(225, 29, 72);
    doc.text(`Balance: Rs ${stats.remaining}`, 160, 71);

    // Table of deliveries
    const tableData = monthDeliveries.map((d, index) => [
      String(index + 1),
      d.date,
      d.status === 'Skipped' ? '0 L (Skipped)' : `${d.quantity} L`,
      `Rs ${d.rate}`,
      `Rs ${d.amount}`,
      d.remarks || d.status
    ]);

    autoTable(doc, {
      startY: 86,
      head: [['#', 'Date (YYYY-MM-DD)', 'Quantity', 'Rate', 'Amount', 'Status / Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 162, 237], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`Bill_${customer.name}_${selectedMonth}.pdf`);
  };

  const isCustomerPaused = customer.status === 'Paused';

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 pb-28 pt-2 px-4 max-w-lg mx-auto font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-[#1C2541] border border-[#2A3756] flex items-center justify-center text-slate-300 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-lg font-extrabold text-white tracking-tight">{customer.name}</h1>

        {/* 3-dots Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 rounded-2xl bg-[#1C2541] border border-[#2A3756] flex items-center justify-center text-slate-300 hover:text-white"
          >
            <MoreVertical size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-12 w-48 bg-[#1C2541] border border-[#2A3756] rounded-2xl shadow-2xl py-1.5 z-30">
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsPauseModalOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-[#2A3756] flex items-center gap-2"
              >
                <Clock size={16} className="text-amber-400" />
                {isCustomerPaused ? 'Resume / Edit Pause' : 'Pause Customer'}
              </button>
              
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsBillModalOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-[#2A3756] flex items-center gap-2"
              >
                <Download size={16} className="text-sky-400" />
                View & Download Bill (बिल पर्ची)
              </button>

              <div className="my-1 border-t border-[#2A3756]"></div>

              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsDeleteConfirmOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Permanently
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Card (Match Screen 4) */}
      <div className="mt-4 p-4 rounded-3xl bg-[#1C2541] border border-[#2A3756] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00A2ED] to-sky-400 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-sky-500/20">
            {customer.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {customer.name}
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {customer.defaultQuantity} L/day • ₹{customer.rate}/L
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Start Date: {formatDisplayDate(customer.startDate)}
            </p>
            {isCustomerPaused && customer.pauseStartDate && customer.pauseEndDate && (
              <p className="text-[11px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                <Calendar size={12} /> {formatDisplayDate(customer.pauseStartDate)} से {formatDisplayDate(customer.pauseEndDate)} तक दूध बंद
              </p>
            )}
          </div>
        </div>

        <div>
          <button
            onClick={() => setIsPauseModalOpen(true)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm ${
              isCustomerPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title={isCustomerPaused ? "दूध चालू करने के लिए टैप करें" : "दूध बंद (Pause) करने के लिए टैप करें"}
          >
            {isCustomerPaused ? (
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
        </div>
      </div>

      {/* Month Selector Bar (Allows viewing past and future months easily) */}
      <div className="mt-3.5 bg-[#162038] border border-[#2A3756] rounded-2xl p-2.5 px-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setSelectedMonth(getPreviousMonthStr(selectedMonth))}
          className="p-1.5 px-2.5 rounded-xl bg-[#1C2541] border border-[#2A3756] text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1 text-xs font-bold"
          title="पिछला महीना देखें"
        >
          <ChevronLeft size={18} />
          <span>पिछला</span>
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-sky-400" />
            <span className="text-sm font-black text-white tracking-wide">
              {formatMonthStr(selectedMonth)}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">
            {stats.totalAmount === 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/80 text-slate-300 border border-slate-600">
                कोई रिकॉर्ड नहीं (₹0 बाकी)
              </span>
            ) : stats.remaining <= 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ पूरा चुकता (Paid)
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ₹{stats.remaining} बाकी (Pending)
              </span>
            )}
            
            {selectedMonth !== currentMonthStr && (
              <button
                onClick={() => setSelectedMonth(currentMonthStr)}
                className="text-[10px] text-sky-400 hover:underline font-semibold"
              >
                (चालू महीना)
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setSelectedMonth(getNextMonthStr(selectedMonth))}
          className="p-1.5 px-2.5 rounded-xl bg-[#1C2541] border border-[#2A3756] text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1 text-xs font-bold"
          title="अगला महीना देखें"
        >
          <span>अगला</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 4 Metrics (Match Screen 4) */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        
        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-3.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Total Milk</span>
          <div className="text-xl font-black text-white mt-1">
            {stats.totalMilk} <span className="text-sm font-bold text-sky-400">L</span>
          </div>
        </div>

        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-3.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Total Amount</span>
          <div className="text-xl font-black text-white mt-1">
            ₹ {stats.totalAmount.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-3.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Paid</span>
          <div className="text-xl font-black text-emerald-400 mt-1">
            ₹ {stats.totalPaid.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-3.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Remaining (बाकी)</span>
          <div className="text-xl font-black text-rose-400 mt-1">
            ₹ {stats.remaining.toLocaleString('en-IN')}
          </div>
        </div>

      </div>

      {/* Record Payment Button */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="flex-1 py-3 bg-[#00A2ED] hover:bg-sky-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
        >
          <IndianRupee size={16} /> Record Payment (जमा करें)
        </button>

        <button
          onClick={() => setIsBillModalOpen(true)}
          className="py-3 px-4 bg-[#1C2541] hover:bg-[#2A3756] border border-[#2A3756] text-sky-400 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
        >
          <Download size={16} /> Bill (पर्ची)
        </button>
      </div>

      {/* Daily Records List */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-wide">
            Daily Details ({monthDeliveries.length} days)
          </h3>
          <span className="text-xs font-bold text-slate-400">
            टैप करके बदलें
          </span>
        </div>

        <div className="space-y-2">
          {monthDeliveries.map(d => {
            const isToday = d.date === todayStr;
            const isSkipped = d.status === 'Skipped';
            const isCustom = d.status === 'Custom' || (d.quantity !== customer.defaultQuantity && !isSkipped);

            return (
              <div
                key={d.id}
                onClick={() => setEditingDelivery(d)}
                className="p-3 rounded-2xl bg-[#1C2541] border border-[#2A3756] flex items-center justify-between cursor-pointer hover:border-sky-500/40 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isSkipped 
                      ? 'bg-rose-500/20 text-rose-400' 
                      : isToday 
                        ? 'bg-sky-500/20 text-sky-400' 
                        : 'bg-[#2A3756] text-slate-300'
                  }`}>
                    {d.date.split('-')[2]}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-white block">
                      {formatDisplayDate(d.date)} {isToday && <span className="text-sky-400 font-extrabold">(Today)</span>}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {d.quantity} L • ₹{d.amount} {d.remarks ? `(${d.remarks})` : ''}
                    </span>
                  </div>
                </div>

                <div>
                  {isSkipped ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Skip
                    </span>
                  ) : isCustom ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Changed
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Delivered
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal 
          customer={customer}
          currentBalance={stats.remaining}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* Pause Customer Modal */}
      {isPauseModalOpen && (
        <PauseCustomerModal 
          customer={customer}
          onClose={() => setIsPauseModalOpen(false)}
        />
      )}

      {/* Edit Specific Delivery Modal */}
      {editingDelivery && (
        <EditDeliveryModal
          delivery={editingDelivery}
          customer={customer}
          onClose={() => setEditingDelivery(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C2541] border border-rose-500/30 rounded-3xl p-5 w-full max-w-sm shadow-2xl text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            
            <h3 className="text-base font-bold text-white">Delete Permanently?</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              क्या आप सच में <strong>{customer.name}</strong> को और उनके सभी पिछले रिकॉर्ड और पेमेंट को हमेशा के लिए मिटाना चाहते हैं?
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#2A3756] text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                रद्द करें
              </button>
              <button
                onClick={handleDeleteCustomer}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                हाँ, मिटा दें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt Modal (Shows full bill with crisp Hindi customer name and 1-click photo/PDF download) */}
      {isBillModalOpen && (
        <BillReceiptModal 
          customer={customer}
          month={selectedMonth}
          deliveries={monthDeliveries}
          stats={stats}
          onClose={() => setIsBillModalOpen(false)}
        />
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------------
// Record Payment Modal
// ---------------------------------------------------------------------------------
function RecordPaymentModal({ 
  customer, 
  currentBalance, 
  onClose 
}: { 
  customer: Customer; 
  currentBalance: number; 
  onClose: () => void; 
}) {
  const [amount, setAmount] = useState<number>(currentBalance > 0 ? currentBalance : 500);
  const [date, setDate] = useState(getTodayStr());
  const [mode, setMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    const newPayment: Payment = {
      id: crypto.randomUUID(),
      customerId: customer.id,
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
            <h3 className="text-base font-bold text-white">Record Payment (पैसे जमा करें)</h3>
            <p className="text-xs text-slate-400">{customer.name} • बाकी: ₹{currentBalance}</p>
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
              जमा राशि (Amount in ₹) *
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
              भुगतान का माध्यम (Payment Mode)
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
              तारीख (Payment Date)
            </label>
            <input 
              required
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-[#00A2ED]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              नोट्स / विवरण (वैकल्पिक)
            </label>
            <input 
              type="text"
              placeholder="e.g. Google Pay / Cash Received"
              value={notes}
              onChange={e => setNotes(e.target.value)}
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

// ---------------------------------------------------------------------------------
// Edit Delivery Modal (Skip, Custom Qty, Rate Change from date onward)
// ---------------------------------------------------------------------------------
function EditDeliveryModal({ 
  delivery, 
  customer, 
  onClose 
}: { 
  delivery: Delivery; 
  customer: Customer; 
  onClose: () => void; 
}) {
  const [quantity, setQuantity] = useState<number>(delivery.quantity);
  const [rate, setRate] = useState<number>(delivery.rate || customer.rate);
  const [applyForwardQty, setApplyForwardQty] = useState(false);
  const [applyForwardRate, setApplyForwardRate] = useState(false);

  // 1-Tap Skip
  const handleQuickSkip = async () => {
    const updated: Delivery = {
      ...delivery,
      status: 'Skipped',
      quantity: 0,
      amount: 0,
      remarks: 'No Milk',
      isManual: true
    };
    await db.deliveries.put(updated);
    uploadDeliveryToCloud(updated);
    onClose();
  };

  // 1-Tap Normal
  const handleQuickNormal = async () => {
    const qty = customer.defaultQuantity;
    const r = customer.rate;
    const updated: Delivery = {
      ...delivery,
      status: 'Delivered',
      quantity: qty,
      rate: r,
      amount: qty * r,
      remarks: 'Normal',
      isManual: true
    };
    await db.deliveries.put(updated);
    uploadDeliveryToCloud(updated);
    onClose();
  };

  // Save Custom Changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(quantity);
    const r = Number(rate);
    const amt = q * r;
    const isSkip = q === 0;

    // 1. Update this specific day
    const updated: Delivery = {
      ...delivery,
      quantity: q,
      rate: r,
      amount: amt,
      status: isSkip ? 'Skipped' : (q !== customer.defaultQuantity ? 'Custom' : 'Delivered'),
      remarks: isSkip ? 'No Milk' : `Custom ${q}L @ ₹${r}`,
      isManual: true
    };
    await db.deliveries.put(updated);
    uploadDeliveryToCloud(updated);

    // 2. If user selected "Apply Quantity forward from this date"
    if (applyForwardQty && !isSkip) {
      await db.customers.update(customer.id, {
        defaultQuantity: q
      });
      // Update future generated deliveries for this customer
      const futureDeliveries = await db.deliveries
        .where('customerId')
        .equals(customer.id)
        .filter(d => d.date > delivery.date && d.status !== 'Skipped')
        .toArray();

      for (const fd of futureDeliveries) {
        await db.deliveries.update(fd.id, {
          quantity: q,
          amount: q * fd.rate
        });
      }
    }

    // 3. If user selected "Apply Rate forward from this date"
    if (applyForwardRate) {
      await db.customers.update(customer.id, {
        rate: r
      });
      // Update future deliveries with new rate
      const futureDeliveries = await db.deliveries
        .where('customerId')
        .equals(customer.id)
        .filter(d => d.date >= delivery.date)
        .toArray();

      for (const fd of futureDeliveries) {
        if (fd.status !== 'Skipped') {
          await db.deliveries.update(fd.id, {
            rate: r,
            amount: fd.quantity * r
          });
        }
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#1C2541] border border-[#2A3756] rounded-3xl p-5 w-full max-w-sm shadow-2xl text-slate-100">
        
        <div className="flex items-center justify-between pb-3 border-b border-[#2A3756]">
          <div>
            <h3 className="text-base font-bold text-white">दिन का रिकॉर्ड बदलें</h3>
            <p className="text-xs text-slate-400">{formatDisplayDate(delivery.date)}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2A3756] text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1-Tap Fast Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            onClick={handleQuickNormal}
            className="py-2 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 flex items-center justify-center gap-1"
          >
            <CheckCircle2 size={14} /> Normal ({customer.defaultQuantity}L)
          </button>

          <button
            type="button"
            onClick={handleQuickSkip}
            className="py-2 px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 flex items-center justify-center gap-1"
          >
            <Ban size={14} /> Skip (0L)
          </button>
        </div>

        {/* Detailed Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              मात्रा (Litres)
            </label>
            <input 
              required
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-white font-bold text-sm outline-none focus:border-[#00A2ED]"
            />
          </div>

          <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#0B132B] border border-[#2A3756] cursor-pointer">
            <input 
              type="checkbox"
              checked={applyForwardQty}
              onChange={e => setApplyForwardQty(e.target.checked)}
              className="w-4 h-4 rounded border-[#2A3756] text-[#00A2ED]"
            />
            <span className="text-[11px] font-medium text-slate-300">
              इस तारीख से आगे भी यही मात्रा (Quantity) रखें
            </span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              रेट (₹ per Litre)
            </label>
            <input 
              required
              type="number"
              step="any"
              min="1"
              value={rate}
              onChange={e => setRate(Number(e.target.value))}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-white font-bold text-sm outline-none focus:border-[#00A2ED]"
            />
          </div>

          <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#0B132B] border border-[#2A3756] cursor-pointer">
            <input 
              type="checkbox"
              checked={applyForwardRate}
              onChange={e => setApplyForwardRate(e.target.checked)}
              className="w-4 h-4 rounded border-[#2A3756] text-[#00A2ED]"
            />
            <span className="text-[11px] font-medium text-slate-300">
              इस तारीख से आगे नया रेट लागू करें (पुराने दिनों का रेट नहीं बदलेगा)
            </span>
          </label>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#2A3756] text-slate-300 font-bold text-xs hover:bg-slate-700"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#00A2ED] hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
            >
              सेव करें
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
