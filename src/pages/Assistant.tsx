import React, { useState } from 'react';
import { db } from '../db/db';
import { getTodayStr } from '../utils/dateUtils';
import { Bot, Send, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { generateDeliveriesUpToToday } from '../db/generate';

export default function Assistant() {
  const defaultMessage = { role: 'assistant' as const, text: 'नमस्ते! मैं आपका स्मार्ट AI असिस्टेंट हूँ। आप मुझसे किसी भी भाषा (हिंदी, इंग्लिश, हिंग्लिश) या तरीके से बात कर सकते हैं।\n\nउदाहरण:\n- "आज रमेश ने दूध नहीं लिया"\n- "सुरेश को आज 2 लीटर दिया"\n- "एक नया ग्राहक अमित जोड़ दो, 1 लीटर गाय का दूध, 50 रुपए रेट, आज से"' };
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string, isError?: boolean}[]>([defaultMessage]);

  const handleClearChat = () => {
    if (confirm("क्या आप चैट हिस्ट्री डिलीट करना चाहते हैं?")) {
      setMessages([defaultMessage]);
    }
  };

  const processAction = async (action: any) => {
    try {
      if (action.type === 'MARK_NOT_TAKEN') {
        const delivery = await db.deliveries.where({ customerId: action.customerId, date: action.date }).first();
        if (delivery) {
          await db.deliveries.update(delivery.id, { status: 'Skipped', quantity: 0, amount: 0, isManual: true, remarks: 'Not Taken' });
        }
      } else if (action.type === 'UPDATE_DELIVERY') {
        const delivery = await db.deliveries.where({ customerId: action.customerId, date: action.date }).first();
        if (delivery) {
          const amount = action.quantity * (action.rate || delivery.rate);
          await db.deliveries.update(delivery.id, { 
            quantity: action.quantity, 
            amount: amount, 
            status: 'Delivered', 
            isManual: true 
          });
        }
      } else if (action.type === 'DELETE_CUSTOMER') {
        const custId = action.customerId;
        const toDelete = await db.deliveries.where({ customerId: custId }).toArray();
        await db.deliveries.bulkDelete(toDelete.map(d => d.id));
        await db.customers.delete(custId);
      } else if (action.type === 'ADD_CUSTOMER') {
        const newCustId = crypto.randomUUID();
        await db.customers.add({
          id: newCustId,
          name: action.name,
          startDate: action.startDate,
          session: action.session || 'Morning',
          milkType: action.milkType || 'Cow',
          defaultQuantity: action.quantity,
          rate: action.rate,
          status: 'Active',
          isActive: true,
          lastGeneratedDate: ''
        });
        await generateDeliveriesUpToToday();
      }
    } catch (e) {
      console.error("Action execution error:", e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, text: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const customers = await db.customers.toArray();
      const todayStr = getTodayStr();

      // Pass the recent conversation history to the backend
      const conversationHistory = newMessages.map(m => ({ role: m.role, text: m.text }));

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userText, 
          history: conversationHistory,
          customers, 
          todayStr 
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const errMsg = errData?.details || errData?.error || 'Failed to reach AI server';
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      if (data.actions && data.actions.length > 0) {
        for (const act of data.actions) {
          await processAction(act);
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);

    } catch (err: any) {
      console.error(err);
      let errorMsg = "माफ़ करें, मुझे कुछ तकनीकी समस्या आ रही है। कृपया थोड़ी देर बाद प्रयास करें।";
      if (err.message) {
        errorMsg += `\n\n(Error: ${err.message})`;
      }
      setMessages(prev => [...prev, { role: 'assistant', text: errorMsg, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#00a2ed]/10 text-[#00a2ed] rounded-2xl flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Assistant</h1>
            <p className="text-sm font-medium text-slate-500">Natural Language Support</p>
          </div>
        </div>
        
        <button 
          onClick={handleClearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
        >
          <Trash2 size={14} /> Clear Chat
        </button>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-4 overflow-y-auto mb-4 flex flex-col gap-4 shadow-sm">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
              m.role === 'user' 
                ? 'bg-[#00a2ed] text-white rounded-br-none' 
                : m.isError 
                  ? 'bg-red-50 text-red-900 border border-red-100 rounded-bl-none'
                  : 'bg-slate-100 text-slate-800 rounded-bl-none'
            }`}>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  {m.isError ? <AlertCircle size={14} className="text-red-500"/> : <Bot size={14} className="text-[#00a2ed]"/>}
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">AI</span>
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-5 py-3 bg-slate-100 text-slate-800 rounded-bl-none flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#00a2ed]" />
              <span className="text-sm font-medium">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="relative shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="हिन्दी या अंग्रेजी में टाइप करें..." 
          className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 pl-5 pr-14 outline-none focus:border-[#00a2ed] font-medium shadow-sm transition-colors"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#00a2ed] text-white rounded-xl flex items-center justify-center hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50">
          <Send size={18} className="ml-1" />
        </button>
      </form>
    </div>
  )
}
