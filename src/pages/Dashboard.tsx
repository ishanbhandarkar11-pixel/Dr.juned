import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer, Delivery } from '../db/db';
import { getTodayStr, getCurrentMonthStr, formatDisplayDate, addDays } from '../utils/dateUtils';
import { uploadDeliveryToCloud, uploadCustomerToCloud, subscribeToCloudStatus, isCloudConnected } from '../db/firebase';
import { 
  Milk, 
  IndianRupee, 
  CalendarDays, 
  AlertCircle, 
  Plus, 
  Check, 
  Ban, 
  Edit3, 
  X,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  CheckCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';

interface DashboardProps {
  onNavigateToCustomer?: (customerId: string) => void;
  onOpenAddCustomer?: () => void;
  onNavigateToPayments?: () => void;
}

export default function Dashboard({ onNavigateToCustomer, onOpenAddCustomer, onNavigateToPayments }: DashboardProps) {
  const [actualToday, setActualToday] = useState<string>(() => getTodayStr());
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayStr());

  // Keep date synced with real device clock (e.g. when day changes from 18 to 19 or tab is reopened)
  useEffect(() => {
    const syncWithClock = () => {
      const nowToday = getTodayStr();
      setActualToday(nowToday);
      // If user was on the previous today, advance to the new today automatically
      setSelectedDate(prev => {
        if (prev < nowToday) return nowToday;
        return prev;
      });
    };

    syncWithClock();
    window.addEventListener('focus', syncWithClock);
    const interval = setInterval(syncWithClock, 15000); // check every 15s
    return () => {
      window.removeEventListener('focus', syncWithClock);
      clearInterval(interval);
    };
  }, []);

  const isToday = selectedDate === actualToday;
  const currentMonthStr = selectedDate.substring(0, 7);

  // Queries
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const rawTodayDeliveries = useLiveQuery(
    () => db.deliveries.where('date').equals(selectedDate).toArray(),
    [selectedDate]
  ) || [];
  const rawMonthDeliveries = useLiveQuery(
    () => db.deliveries.where('month').equals(currentMonthStr).toArray(),
    [currentMonthStr]
  ) || [];
  const rawAllDeliveries = useLiveQuery(() => db.deliveries.toArray()) || [];
  const allPayments = useLiveQuery(() => db.payments.toArray()) || [];

  // Deduplicated deliveries maps
  const todayDeliveries = useMemo(() => {
    const map = new Map<string, Delivery>();
    for (const d of rawTodayDeliveries) {
      if (!map.has(d.customerId)) {
        map.set(d.customerId, d);
      }
    }
    return Array.from(map.values());
  }, [rawTodayDeliveries]);

  const monthDeliveries = useMemo(() => {
    const map = new Map<string, Delivery>();
    for (const d of rawMonthDeliveries) {
      const key = `${d.customerId}_${d.date}`;
      if (!map.has(key)) {
        map.set(key, d);
      }
    }
    return Array.from(map.values());
  }, [rawMonthDeliveries]);

  const allDeliveries = useMemo(() => {
    const map = new Map<string, Delivery>();
    for (const d of rawAllDeliveries) {
      const key = `${d.customerId}_${d.date}`;
      if (!map.has(key)) {
        map.set(key, d);
      }
    }
    return Array.from(map.values());
  }, [rawAllDeliveries]);

  // Edit Quantity / Custom Action Modal
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editQtyValue, setEditQtyValue] = useState<number>(1);
  const [changePermanently, setChangePermanently] = useState<boolean>(false);
  const [sessionFilter, setSessionFilter] = useState<'All' | 'Morning' | 'Evening'>('All');
  const [cloudOnline, setCloudOnline] = useState<boolean>(isCloudConnected);

  useEffect(() => {
    return subscribeToCloudStatus(setCloudOnline);
  }, []);

  // Filtered by Morning / Evening session
  const filteredCustomers = useMemo(() => {
    if (sessionFilter === 'All') return customers;
    return customers.filter(c => (c.session || 'Morning') === sessionFilter);
  }, [customers, sessionFilter]);

  // Mark all filtered customers as delivered for today
  const handleMarkAllDelivered = async () => {
    const targetList = filteredCustomers.filter(c => c.status !== 'Paused');
    for (const cust of targetList) {
      const delId = `${cust.id}_${selectedDate}`;
      await db.deliveries.put({
        id: delId,
        customerId: cust.id,
        date: selectedDate,
        month: currentMonthStr,
        quantity: cust.defaultQuantity,
        rate: cust.rate,
        amount: cust.defaultQuantity * cust.rate,
        status: 'Delivered',
        remarks: 'Normal',
        isManual: true,
        session: cust.session || 'Morning',
        milkType: cust.milkType || 'Cow'
      });
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    // 1. Today's Milk
    const todayMilk = todayDeliveries.reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.quantity), 0);
    const morningMilk = todayDeliveries
      .filter(d => (d.session || customers.find(c => c.id === d.customerId)?.session || 'Morning') === 'Morning')
      .reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.quantity), 0);
    const eveningMilk = todayDeliveries
      .filter(d => (d.session || customers.find(c => c.id === d.customerId)?.session || 'Morning') === 'Evening')
      .reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.quantity), 0);
    
    // 2. Today's Amount
    const todayAmount = todayDeliveries.reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.amount), 0);

    // 3. This Month Sales
    const monthSales = monthDeliveries.reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.amount), 0);

    // 4. Pending Amount (Total due from all deliveries - total paid from all payments)
    const totalAllSales = allDeliveries.reduce((sum, d) => sum + (d.status === 'Skipped' ? 0 : d.amount), 0);
    const totalAllPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = Math.max(0, totalAllSales - totalAllPaid);

    return {
      todayMilk: Math.round(todayMilk * 100) / 100,
      morningMilk: Math.round(morningMilk * 100) / 100,
      eveningMilk: Math.round(eveningMilk * 100) / 100,
      todayAmount: Math.round(todayAmount * 100) / 100,
      monthSales: Math.round(monthSales * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100
    };
  }, [todayDeliveries, monthDeliveries, allDeliveries, allPayments, customers]);

  // Today's Changes List
  const todayChanges = useMemo(() => {
    return todayDeliveries
      .filter(d => {
        const cust = customers.find(c => c.id === d.customerId);
        if (!cust) return false;
        // Either skipped or quantity differs from default
        return d.status === 'Skipped' || d.quantity !== cust.defaultQuantity;
      })
      .map(d => {
        const cust = customers.find(c => c.id === d.customerId);
        return {
          delivery: d,
          customer: cust,
          isSkip: d.status === 'Skipped',
          oldQty: cust?.defaultQuantity || 1,
          newQty: d.quantity
        };
      });
  }, [todayDeliveries, customers]);

  // Quick Action 1: Mark Delivered (Standard)
  const handleMarkDelivered = async (cust: Customer) => {
    const existing = todayDeliveries.find(d => d.customerId === cust.id);
    const qty = cust.defaultQuantity;
    const rate = cust.rate;
    const amt = qty * rate;

    const delId = existing ? existing.id : `${cust.id}_${selectedDate}`;
    const delRecord: Delivery = {
      id: delId,
      customerId: cust.id,
      date: selectedDate,
      month: currentMonthStr,
      quantity: qty,
      rate: rate,
      amount: amt,
      status: 'Delivered',
      remarks: 'Normal',
      isManual: true,
      session: cust.session || 'Morning',
      milkType: cust.milkType || 'Cow'
    };
    await db.deliveries.put(delRecord);
    uploadDeliveryToCloud(delRecord);
  };

  // Quick Action 2: 1-Tap Skip (No Milk)
  const handleMarkSkip = async (cust: Customer) => {
    const existing = todayDeliveries.find(d => d.customerId === cust.id);
    const delId = existing ? existing.id : `${cust.id}_${selectedDate}`;
    const skipRecord: Delivery = {
      id: delId,
      customerId: cust.id,
      date: selectedDate,
      month: currentMonthStr,
      quantity: 0,
      rate: cust.rate,
      amount: 0,
      status: 'Skipped',
      remarks: 'No Milk',
      isManual: true,
      session: cust.session || 'Morning',
      milkType: cust.milkType || 'Cow'
    };
    await db.deliveries.put(skipRecord);
    uploadDeliveryToCloud(skipRecord);
  };

  // Save Custom Quantity Change
  const handleSaveCustomQty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const cust = editingCustomer;
    const qty = Number(editQtyValue);
    const rate = cust.rate;
    const amt = qty * rate;
    const isSkip = qty === 0;

    const existing = todayDeliveries.find(d => d.customerId === cust.id);
    const delId = existing ? existing.id : `${cust.id}_${selectedDate}`;
    const customRecord: Delivery = {
      id: delId,
      customerId: cust.id,
      date: selectedDate,
      month: currentMonthStr,
      quantity: qty,
      rate: rate,
      amount: amt,
      status: isSkip ? 'Skipped' : (qty !== cust.defaultQuantity ? 'Custom' : 'Delivered'),
      remarks: isSkip ? 'No Milk' : `Changed to ${qty}L`,
      isManual: true,
      session: cust.session || 'Morning',
      milkType: cust.milkType || 'Cow'
    };
    await db.deliveries.put(customRecord);
    uploadDeliveryToCloud(customRecord);

    // If user requested "Change from today onward"
    if (changePermanently && !isSkip) {
      await db.customers.update(cust.id, {
        defaultQuantity: qty
      });
      uploadCustomerToCloud({ ...cust, defaultQuantity: qty });
    }

    setEditingCustomer(null);
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 pb-28 pt-2 px-4 max-w-lg mx-auto font-sans">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00A2ED] to-sky-400 flex items-center justify-center text-xl shadow-lg shadow-sky-500/20">
            🐮
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Milk Manager
            </h1>
            <p className="text-[11px] font-semibold text-slate-400">
              Simple • Smart • For You
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 bg-[#1C2541] border border-[#2A3756] rounded-full px-1.5 py-1">
            <button
              onClick={() => setSelectedDate(prev => addDays(prev, -1))}
              title="पिछली तारीख (Previous Date)"
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2A3756] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <label className="relative cursor-pointer flex items-center gap-1.5 px-1 hover:opacity-85">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Calendar size={13} className="text-sky-400" />
              <span className="text-xs font-bold text-sky-400 whitespace-nowrap">
                {isToday ? `आज • ${formatDisplayDate(selectedDate)}` : formatDisplayDate(selectedDate)}
              </span>
            </label>
            <button
              onClick={() => setSelectedDate(prev => addDays(prev, 1))}
              title="अगली तारीख (Next Date)"
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2A3756] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isToday && (
              <button 
                onClick={() => setSelectedDate(actualToday)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30"
              >
                आज पर जाएँ
              </button>
            )}
            <span className={`text-[10px] font-semibold flex items-center gap-1 ${cloudOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cloudOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
              {cloudOnline ? 'Firebase Cloud' : 'Local Storage'}
            </span>
          </div>
        </div>
      </div>

      {/* Top 4 Work Metrics (Exact match to reference image) */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        
        {/* Card 1: Today's Milk */}
        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
            <Milk size={20} />
          </div>
          <span className="text-xs font-semibold text-slate-400">Today's Milk</span>
          <div className="text-2xl font-black text-white mt-0.5 tracking-tight">
            {stats.todayMilk} <span className="text-sm font-bold text-sky-400">L</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold mt-1.5">
            <span className="text-amber-300">सुबह: {stats.morningMilk}L</span>
            <span className="text-slate-500">•</span>
            <span className="text-indigo-300">शाम: {stats.eveningMilk}L</span>
          </div>
        </div>

        {/* Card 2: Today's Amount */}
        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <IndianRupee size={20} />
          </div>
          <span className="text-xs font-semibold text-slate-400">Today's Amount</span>
          <div className="text-2xl font-black text-white mt-0.5 tracking-tight">
            ₹ {stats.todayAmount.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1.5">
            <span>₹</span> Daily revenue
          </div>
        </div>

        {/* Card 3: This Month Sales */}
        <div className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-2">
            <CalendarDays size={20} />
          </div>
          <span className="text-xs font-semibold text-slate-400">This Month Sales</span>
          <div className="text-2xl font-black text-white mt-0.5 tracking-tight">
            ₹ {stats.monthSales.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] font-bold text-slate-400 mt-1.5">
            Running month total
          </div>
        </div>

        {/* Card 4: Pending Amount */}
        <div 
          onClick={onNavigateToPayments}
          className="bg-[#1C2541] border border-[#2A3756] rounded-2xl p-4 shadow-sm relative overflow-hidden cursor-pointer hover:border-rose-500/50 transition-all active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-2">
            <AlertCircle size={20} />
          </div>
          <span className="text-xs font-semibold text-slate-400">Pending Amount</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5 tracking-tight">
            ₹ {stats.totalPending.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 mt-1.5">
            <span>कुल बाकी</span> <ArrowRight size={12} />
          </div>
        </div>

      </div>

      {/* "आज का बदलाव" (Today's Changes Section) */}
      <div className="mt-5 bg-[#162038] border border-[#2A3756] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              आज का बदलाव (Today's Changes)
            </h2>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
            {todayChanges.length} बदला हुआ
          </span>
        </div>

        {todayChanges.length === 0 ? (
          <div className="py-2.5 px-3 rounded-xl bg-[#1C2541]/70 border border-[#2A3756] text-center">
            <p className="text-xs font-medium text-slate-400">
              बाकी सभी {customers.length} ग्राहक अपने रोज के हिसाब पर सही चल रहे हैं।
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayChanges.map(({ customer, isSkip, oldQty, newQty }, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#1C2541] border border-[#2A3756]"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    isSkip ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'
                  }`}>
                    {customer?.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {customer?.name}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {isSkip ? `${oldQty}L → Skip` : `${oldQty}L → ${newQty}L`}
                    </span>
                  </div>
                </div>

                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  isSkip 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  {isSkip ? 'No Milk' : 'Quantity Changed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Customers List with 1-Tap Actions */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              {isToday ? "Today's Customers" : "Customers"} ({filteredCustomers.length})
            </h2>
            <p className="text-[11px] font-medium text-slate-400">
              {formatDisplayDate(selectedDate)} • {isToday ? 'आज का दूध वितरण' : 'दूध वितरण'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllDelivered}
              title="सबको आज का Normal दूध मार्क करें"
              className="flex items-center gap-1 text-[11px] font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
            >
              <CheckCheck size={14} /> Mark All Normal
            </button>
            <button 
              onClick={onOpenAddCustomer}
              className="flex items-center gap-1 text-[11px] font-bold bg-[#00A2ED] hover:bg-sky-500 text-white px-2.5 py-1.5 rounded-xl transition-all shadow-md shadow-sky-500/20 active:scale-95"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Session Filter Tabs: All, Morning, Evening */}
        <div className="flex gap-2 mb-3">
          {(['All', 'Morning', 'Evening'] as const).map(session => (
            <button
              key={session}
              onClick={() => setSessionFilter(session)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                sessionFilter === session
                  ? 'bg-[#00A2ED] text-white shadow-md shadow-sky-500/20'
                  : 'bg-[#1C2541] text-slate-400 border border-[#2A3756] hover:text-white'
              }`}
            >
              {session === 'Morning' && <Sun size={12} className="text-amber-400" />}
              {session === 'Evening' && <Moon size={12} className="text-indigo-400" />}
              {session === 'All' ? 'सभी (All)' : session === 'Morning' ? 'सुबह (Morning)' : 'शाम (Evening)'}
            </button>
          ))}
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center bg-[#1C2541] border border-[#2A3756] rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-3">
              <Plus size={24} />
            </div>
            <h3 className="text-sm font-bold text-white">कोई ग्राहक नहीं है</h3>
            <p className="text-xs text-slate-400 mt-1">इस सत्र में कोई ग्राहक नहीं मिला।</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredCustomers.map(customer => {
              const delivery = todayDeliveries.find(d => d.customerId === customer.id);
              const isRecorded = !!delivery;
              const isDelivered = delivery?.status === 'Delivered';
              const isSkipped = delivery?.status === 'Skipped';
              const isCustom = delivery?.status === 'Custom' || (delivery && delivery.quantity !== customer.defaultQuantity && !isSkipped);
              const currentQty = delivery ? delivery.quantity : customer.defaultQuantity;

              return (
                <div 
                  key={customer.id}
                  className={`p-3.5 rounded-2xl bg-[#1C2541] border transition-all ${
                    !isRecorded 
                      ? 'border-amber-500/40 bg-gradient-to-r from-[#1C2541] to-amber-950/10' 
                      : isDelivered 
                        ? 'border-emerald-500/30' 
                        : isSkipped 
                          ? 'border-rose-500/30' 
                          : 'border-sky-500/30'
                  } flex flex-col gap-2.5 shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    
                    {/* Left: Avatar + Customer Info */}
                    <div 
                      onClick={() => onNavigateToCustomer?.(customer.id)}
                      className="flex items-center gap-3 cursor-pointer group flex-1"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner ${
                        customer.session === 'Evening'
                          ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30'
                          : 'bg-amber-900/50 text-amber-300 border border-amber-500/30'
                      }`}>
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
                          {customer.name}
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            customer.session === 'Evening'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {customer.session === 'Evening' ? 'शाम' : 'सुबह'}
                          </span>
                          {customer.status === 'Paused' && (
                            <span className="text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded">
                              PAUSED
                            </span>
                          )}
                        </h3>
                        <p className="text-xs font-semibold text-slate-400">
                          {currentQty} L • ₹{customer.rate}/L
                        </p>
                      </div>
                    </div>

                    {/* Status Indicator Pill */}
                    <div>
                      {!isRecorded ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock size={12} /> Pending (बाकी)
                        </span>
                      ) : isSkipped ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <Ban size={12} /> No Milk
                        </span>
                      ) : isCustom ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                          <Edit3 size={12} /> {currentQty} L
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check size={12} /> Delivered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1-Tap Quick Action Buttons Bar */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#2A3756]/60">
                    
                    {/* Action 1: Normal Delivered */}
                    <button
                      onClick={() => handleMarkDelivered(customer)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        isDelivered
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-[#2A3756]/80 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300'
                      }`}
                    >
                      <Check size={14} /> Normal ({customer.defaultQuantity}L)
                    </button>

                    {/* Action 2: Skip (No Milk) */}
                    <button
                      onClick={() => handleMarkSkip(customer)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        isSkipped
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-[#2A3756]/80 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300'
                      }`}
                    >
                      <Ban size={14} /> Skip (0L)
                    </button>

                    {/* Action 3: Edit Custom Qty */}
                    <button
                      onClick={() => {
                        setEditingCustomer(customer);
                        setEditQtyValue(currentQty);
                        setChangePermanently(false);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        isCustom
                          ? 'bg-[#00A2ED] text-white shadow-md shadow-sky-500/20'
                          : 'bg-[#2A3756]/80 text-slate-300 hover:bg-sky-500/20 hover:text-sky-300'
                      }`}
                    >
                      <Edit3 size={14} /> Change Qty
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Quantity Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C2541] border border-[#2A3756] rounded-3xl p-5 w-full max-w-sm shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3756]">
              <div>
                <h3 className="text-base font-bold text-white">दूध की मात्रा बदलें</h3>
                <p className="text-xs font-medium text-slate-400">{editingCustomer.name}</p>
              </div>
              <button 
                onClick={() => setEditingCustomer(null)}
                className="w-8 h-8 rounded-full bg-[#2A3756] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomQty} className="mt-4 space-y-4">
              
              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[0.5, 1, 1.5, 2].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setEditQtyValue(preset)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      editQtyValue === preset
                        ? 'bg-[#00A2ED] text-white'
                        : 'bg-[#2A3756] text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {preset} L
                  </button>
                ))}
              </div>

              {/* Exact Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  मात्रा (Litres)
                </label>
                <input 
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editQtyValue}
                  onChange={e => setEditQtyValue(Number(e.target.value))}
                  className="w-full bg-[#0B132B] border border-[#2A3756] rounded-xl px-4 py-3 text-white font-bold text-lg outline-none focus:border-[#00A2ED]"
                />
              </div>

              {/* Permanent Change Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-[#0B132B] border border-[#2A3756] cursor-pointer">
                <input 
                  type="checkbox"
                  checked={changePermanently}
                  onChange={e => setChangePermanently(e.target.checked)}
                  className="w-5 h-5 rounded border-[#2A3756] text-[#00A2ED] focus:ring-0 bg-[#1C2541]"
                />
                <span className="text-xs font-medium text-slate-300">
                  <strong className="text-white block">आगे के सभी दिनों के लिए बदलें</strong>
                  (पुराना हिसाब वैसा ही रहेगा, आगे यह मात्रा लागू होगी)
                </span>
              </label>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-3 rounded-xl bg-[#2A3756] text-slate-300 font-bold text-sm hover:bg-slate-700"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#00A2ED] hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
                >
                  सेव करें
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
