import React, { useState, useEffect, useRef } from 'react';
import { Customer, Delivery } from '../db/db';
import { X, Download, Share2, Check, AlertCircle, FileText } from 'lucide-react';
import { downloadBillImage, downloadBillPDF, createBillCanvas, getFormattedMonth } from '../utils/billCanvas';

interface BillReceiptModalProps {
  customer: Customer;
  month: string;
  deliveries: Delivery[];
  stats: {
    totalMilk: number;
    totalAmount: number;
    totalPaid: number;
    remaining: number;
  };
  onClose: () => void;
}

export default function BillReceiptModal({
  customer,
  month,
  deliveries,
  stats,
  onClose
}: BillReceiptModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const monthLabel = getFormattedMonth(month);

  // Generate preview image on mount
  useEffect(() => {
    try {
      const canvas = createBillCanvas(customer, month, deliveries, stats);
      setPreviewDataUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Error generating preview canvas:', err);
    }
  }, [customer, month, deliveries, stats]);

  // Handle Image Download / WhatsApp Share
  const handleImageAction = async () => {
    setIsGenerating(true);
    setDownloadSuccess(null);
    try {
      await downloadBillImage(customer, month, deliveries, stats);
      setDownloadSuccess('फोटो सफलतापूर्वक डाउनलोड/शेयर की गई!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Image error:', err);
      // Fallback: trigger preview data URL download
      if (previewDataUrl) {
        const link = document.createElement('a');
        link.href = previewDataUrl;
        link.download = `Bill_${customer.name}_${month}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadSuccess('फोटो डाउनलोड शुरू हो गया!');
        setTimeout(() => setDownloadSuccess(null), 4000);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle PDF Download
  const handlePDFAction = async () => {
    setIsGenerating(true);
    setDownloadSuccess(null);
    try {
      await downloadBillPDF(customer, month, deliveries, stats);
      setDownloadSuccess('PDF सफलतापूर्वक डाउनलोड हो गई!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF डाउनलोड करने में समस्या आई। कृपया फोटो डाउनलोड का उपयोग करें।');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 font-sans overflow-y-auto">
      <div className="bg-[#1C2541] border border-[#2A3756] rounded-3xl w-full max-w-lg shadow-2xl text-slate-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Top Modal Bar */}
        <div className="px-5 py-3.5 border-b border-[#2A3756] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🧾 ग्राहक बिल पर्ची (Milk Bill)</span>
            </h3>
            <p className="text-xs text-sky-400 font-semibold">{customer.name} • {monthLabel}</p>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2A3756] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Buttons Bar */}
        <div className="px-5 py-3 bg-[#141C33] border-b border-[#2A3756] flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={handlePDFAction}
            disabled={isGenerating}
            className="flex-1 py-2.5 px-3 bg-[#00A2ED] hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <FileText size={15} />
            <span>{isGenerating ? 'तैयार हो रहा है...' : 'PDF डाउनलोड करें'}</span>
          </button>

          <button
            onClick={handleImageAction}
            disabled={isGenerating}
            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <Share2 size={15} />
            <span>फोटो (WhatsApp) भेजें</span>
          </button>
        </div>

        {/* Success / Status Banner */}
        {downloadSuccess && (
          <div className="mx-4 mt-2 p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
            <Check size={16} />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Scrollable Bill Canvas / Image Preview */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950/60 flex flex-col items-center">
          
          <p className="text-[11px] text-slate-400 mb-2 font-medium">
            💡 फोटो पर दबाकर रखने (Long Press) से भी सीधे सेव या शेयर कर सकते हैं।
          </p>

          {previewDataUrl ? (
            <img 
              src={previewDataUrl} 
              alt={`Bill ${customer.name}`}
              className="w-full max-w-md rounded-xl shadow-2xl border border-slate-700 bg-white"
            />
          ) : (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">बिल लोड हो रहा है...</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
