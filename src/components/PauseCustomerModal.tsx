import React, { useState } from 'react';
import { Customer, db } from '../db/db';
import { getTodayStr, addDays, formatDisplayDate } from '../utils/dateUtils';
import { X, Calendar, Play, Pause, CheckCircle2 } from 'lucide-react';

interface PauseCustomerModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PauseCustomerModal({
  customer,
  onClose,
  onSuccess
}: PauseCustomerModalProps) {
  const today = getTodayStr();
  const [startDate, setStartDate] = useState(customer.pauseStartDate || today);
  const [endDate, setEndDate] = useState(customer.pauseEndDate || addDays(today, 5));
  const [isSaving, setIsSaving] = useState(false);

  const isCurrentlyPaused = customer.status === 'Paused';

  const handleSavePause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) {
      alert("शुरुआत की तारीख (Start Date) अंतिम तारीख (End Date) से बाद की नहीं हो सकती!");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update customer status
      await db.customers.update(customer.id, {
        status: 'Paused',
        isActive: false,
        pauseStartDate: startDate,
        pauseEndDate: endDate
      });

      // 2. Mark existing deliveries in that date range as Skipped
      const deliveriesToUpdate = await db.deliveries
        .where('customerId')
        .equals(customer.id)
        .filter(d => d.date >= startDate && d.date <= endDate)
        .toArray();

      for (const d of deliveriesToUpdate) {
        await db.deliveries.update(d.id, {
          status: 'Skipped',
          quantity: 0,
          amount: 0,
          remarks: 'Paused'
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error pausing customer:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeNow = async () => {
    setIsSaving(true);
    try {
      await db.customers.update(customer.id, {
        status: 'Active',
        isActive: true,
        pauseStartDate: undefined,
        pauseEndDate: undefined
      });

      // If today was marked as Skipped due to pause, restore to normal if user wishes
      const todayDel = await db.deliveries
        .where('customerId')
        .equals(customer.id)
        .filter(d => d.date === today)
        .first();

      if (todayDel && todayDel.remarks === 'Paused') {
        await db.deliveries.update(todayDel.id, {
          status: 'Delivered',
          quantity: customer.defaultQuantity,
          rate: customer.rate,
          amount: customer.defaultQuantity * customer.rate,
          remarks: 'Normal'
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error resuming customer:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#1C2541] border border-[#2A3756] rounded-3xl p-5 w-full max-w-sm shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2A3756]">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isCurrentlyPaused ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
            }`}>
              {isCurrentlyPaused ? <Pause size={18} /> : <Calendar size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {isCurrentlyPaused ? 'दूध चालू / एडिट करें' : 'दूध बंद करें (Pause)'}
              </h3>
              <p className="text-[11px] font-semibold text-slate-400">ग्राहक: {customer.name}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2A3756] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSavePause} className="mt-4 space-y-4">
          
          {/* Starting Date */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <span>📅 कब से बंद करना है (Starting Date) *</span>
            </label>
            <input 
              required
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-[#00A2ED]"
            />
          </div>

          {/* Ending Date */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <span>📅 कब तक बंद रखना है (Ending Date) *</span>
            </label>
            <input 
              required
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-[#00A2ED]"
            />
          </div>

          {/* Explanation Banner */}
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200 leading-relaxed">
            <p className="font-bold mb-1 flex items-center gap-1 text-amber-300">
              <CheckCircle2 size={14} /> ऑटोमैटिक चालू होने का नियम:
            </p>
            <p className="text-[11px] text-slate-300">
              <strong>{formatDisplayDate(startDate)}</strong> से <strong>{formatDisplayDate(endDate)}</strong> तक दूध की मात्रा <strong>0 L (Skip)</strong> रहेगी।
              अंतिम तारीख बीतते ही दूध अपने-आप फिर से चालू हो जाएगा!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-[#00A2ED] hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Pause size={14} /> दूध बंद सेट करें (Save Pause)
            </button>

            {isCurrentlyPaused && (
              <button
                type="button"
                onClick={handleResumeNow}
                disabled={isSaving}
                className="w-full py-2.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Play size={14} /> अभी तुरंत चालू करें (Resume Now)
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
