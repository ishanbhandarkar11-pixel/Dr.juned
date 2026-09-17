import React, { useState } from 'react';
import { db } from '../db/db';
import { getTodayStr } from '../utils/dateUtils';
import { Bot, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateDeliveriesUpToToday } from '../db/generate';

export default function Assistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string, isError?: boolean}[]>([
    { role: 'assistant', text: 'Hello! I can help you manage your deliveries. Try saying:\n\n"Rahul ne aaj doodh nahi liya"\n"Amit ne aaj 2 litre liya"\n"15 September se Kiran ko morning mein 1.5 litre cow milk 50 rs par start karo"' }
  ]);

  const processCommand = async (text: string) => {
    const customers = await db.customers.toArray();
    const today = getTodayStr();
    
    let matchedCustomer = null;
    let maxMatchLen = 0;
    
    // Find customer by name
    for (const c of customers) {
      if (text.toLowerCase().includes(c.name.toLowerCase())) {
        if (c.name.length > maxMatchLen) {
          matchedCustomer = c;
          maxMatchLen = c.name.length;
        }
      }
    }

    const isNotTaken = text.toLowerCase().includes('nahi') || text.toLowerCase().includes('not');
    const isStart = text.toLowerCase().includes('start') || text.toLowerCase().includes('shuru');
    
    // Match quantities like "1 litre", "1.5 litre", "0.5 L"
    const qtyMatch = text.match(/([0-9.]+)\s*(litre|l|liters|liter|ltr)/i);
    const parsedQty = qtyMatch ? parseFloat(qtyMatch[1]) : null;

    if (isStart) {
      // New Customer Logic
      // "25 September se Amit ko morning mein 1 litre cow milk 50 rupees litre par start karo"
      const nameMatch = text.match(/(?:se|to)\s+([a-zA-Z\s]+?)\s+(?:ko|ki)/i);
      const possibleName = nameMatch ? nameMatch[1].trim() : "New Customer";
      
      const rateMatch = text.match(/([0-9.]+)\s*(rupees|rs|rupese)/i);
      const parsedRate = rateMatch ? parseFloat(rateMatch[1]) : 50;

      const dateMatch = text.match(/([0-9]+)\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
      
      let startDate = today;
      if (dateMatch) {
         const day = parseInt(dateMatch[1]);
         const monthName = dateMatch[2].toLowerCase();
         const monthMap: Record<string, number> = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
         const month = monthMap[monthName];
         const year = new Date().getFullYear(); // Assume current year for simplicity
         startDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      const session = text.toLowerCase().includes('evening') ? 'Evening' : 'Morning';
      const milkType = text.toLowerCase().includes('buffalo') ? 'Buffalo' : 'Cow';

      if (!parsedQty || !parsedRate) {
        return { text: "I need a clear quantity and rate to start a new customer. Please try again.", isError: true };
      }

      await db.customers.add({
        id: crypto.randomUUID(),
        name: possibleName,
        startDate: startDate,
        session: session,
        milkType: milkType,
        defaultQuantity: parsedQty,
        rate: parsedRate,
        isActive: true,
        lastGeneratedDate: ''
      });
      await generateDeliveriesUpToToday();
      return { text: `Success! Created customer ${possibleName} starting from ${startDate} for ${parsedQty}L @ ₹${parsedRate}.` };
    }

    if (!matchedCustomer) {
      return { text: "I couldn't identify the customer name in your message. Please mention a valid customer.", isError: true };
    }

    const todayDelivery = await db.deliveries.where({ customerId: matchedCustomer.id, date: today }).first();
    
    if (!todayDelivery) {
      return { text: `No delivery record found for ${matchedCustomer.name} today. Make sure they are active and have a start date of today or earlier.`, isError: true };
    }

    if (isNotTaken) {
      await db.deliveries.update(todayDelivery.id, { status: 'Skipped', quantity: 0, amount: 0, isManual: true });
      return { text: `Marked today's milk as NOT TAKEN for ${matchedCustomer.name}.` };
    }

    if (parsedQty !== null) {
      const amount = parsedQty * todayDelivery.rate;
      await db.deliveries.update(todayDelivery.id, { quantity: parsedQty, amount: amount, status: 'Delivered', isManual: true });
      return { text: `Updated today's delivery for ${matchedCustomer.name} to ${parsedQty}L (₹${amount}).` };
    }

    return { text: "I didn't understand the exact action. Please specify 'nahi liya' or a quantity like '1 litre'.", isError: true };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    try {
      const response = await processCommand(userText);
      setMessages(prev => [...prev, { role: 'assistant', text: response.text, isError: response.isError }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "An error occurred while processing your request.", isError: true }]);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24 h-screen flex flex-col">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
          <Bot size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assistant</h1>
          <p className="text-sm font-medium text-slate-500">Quick actions via text</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-4 overflow-y-auto mb-4 flex flex-col gap-4 shadow-sm">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : m.isError 
                  ? 'bg-red-50 text-red-900 border border-red-100 rounded-bl-none'
                  : 'bg-slate-100 text-slate-800 rounded-bl-none'
            }`}>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  {m.isError ? <AlertCircle size={14} className="text-red-500"/> : <CheckCircle2 size={14} className="text-green-600"/>}
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">System</span>
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="relative shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the assistant..." 
          className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 pl-5 pr-14 outline-none focus:border-blue-500 font-medium shadow-sm transition-colors"
        />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all">
          <Send size={18} className="ml-1" />
        </button>
      </form>
    </div>
  )
}
