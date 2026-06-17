import React, { useState, useEffect } from "react";
import { TrendingUp, Banknote, CreditCard, ChevronRight, BookOpen, AlertTriangle, RefreshCw, BarChart2, ShieldCheck } from "lucide-react";
import { AppStore, AppUser } from "../types";

interface StoreReportsProps {
  activeStore: AppStore;
  activeUser: AppUser;
}

interface ReportData {
  summary: {
    totalSales: number;
    cashSales: number;
    upiSales: number;
    creditSales: number;
    billCount: number;
    profit: number;
    lowStockCount: number;
    totalCreditOutstanding: number;
  };
  categoryPopularity: { name: string; value: number }[];
}

export default function StoreReports({ activeStore, activeUser }: StoreReportsProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/daily?storeId=${activeStore._id}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error("Unable to load daily metric report summary.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeStore]);

  if (isLoading || !reportData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs">Compiling desk sales databases...</p>
        </div>
      </div>
    );
  }

  const { summary, categoryPopularity } = reportData;

  // Find max category value for high contrast ratio calculations
  const maxCategoryVal = Math.max(...categoryPopularity.map((c) => c.value), 1);

  return (
    <div className="bg-white rounded-[24px] border border-gray-200 p-6 shadow-sm min-h-[calc(100vh-140px)] space-y-6 font-sans">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h2 className="font-display font-black text-lg text-gray-950 uppercase tracking-tight">Daily shifting Sales Analysis</h2>
          <p className="text-xs text-gray-500 mt-0.5">Live reporting on cashier transactions and credit outstanding debts.</p>
        </div>
        <button
          onClick={fetchReports}
          className="p-2.5 text-gray-500 hover:text-[#2563EB] rounded-xl border border-gray-300 bg-white hover:bg-slate-50 transition cursor-pointer"
          title="Reload metrics"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* METRIC ROW BENTO BLOCKS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* TOTAL SALES */}
        <div className="bg-[#FAF9F5] rounded-2xl border-2 border-gray-200 p-4">
          <div className="flex justify-between items-center text-gray-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Today's Sales</span>
            <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <span className="font-mono font-black text-2xl text-[#2d3748] block mt-1">₹{summary.totalSales.toLocaleString()}</span>
          <span className="text-[10px] text-[#2563EB] font-bold block mt-1">{summary.billCount} Completed Bill(s)</span>
        </div>

        {/* CASH SALES */}
        <div className="bg-[#FAF9F5] rounded-2xl border-2 border-gray-200 p-4">
          <div className="flex justify-between items-center text-gray-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Cash Register</span>
            <Banknote className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <span className="font-mono font-black text-2xl text-[#22C55E] block mt-1">₹{summary.cashSales.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 font-semibold block mt-1">In Counter Vault</span>
        </div>

        {/* UPI TRANSACTIONS */}
        <div className="bg-[#FAF9F5] rounded-2xl border-2 border-gray-200 p-4">
          <div className="flex justify-between items-center text-gray-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">UPI Digital</span>
            <CreditCard className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <span className="font-mono font-black text-2xl text-blue-855 block mt-1">₹{summary.upiSales.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 font-semibold block mt-1">Direct Bank Settled</span>
        </div>

        {/* CREDIT ACTIVE */}
        <div className="bg-[#FAF9F5] rounded-2xl border-2 border-gray-200 p-4">
          <div className="flex justify-between items-center text-gray-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest">Credit Logged</span>
            <BookOpen className="h-4.5 w-4.5 text-red-500" />
          </div>
          <span className="font-mono font-black text-2xl text-red-750 block mt-1">₹{summary.creditSales.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 font-semibold block mt-1">Credited to Khata Book</span>
        </div>

      </div>

      {/* DETAILED DOUBLE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* CHART BAR PANEL */}
        <div className="border border-gray-250 rounded-[24px] p-5 bg-[#FAF9F5] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 mb-4 uppercase tracking-wider">
              <BarChart2 className="h-4.5 w-4.5 text-[#2563EB] animate-pulse" />
              <span>Category contribution Volume</span>
            </div>

            {categoryPopularity.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">Waiting for billing items to draw graph charts...</p>
            ) : (
              <div className="space-y-4">
                {categoryPopularity.map((c) => {
                  const percentage = Math.round((c.value / maxCategoryVal) * 100);
                  return (
                    <div key={c.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-gray-700 uppercase tracking-wide">{c.name}</span>
                        <span className="font-mono text-gray-500 text-[10px]">{c.value} Item unit(s)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-400 leading-snug mt-5">
            Note: Percentages map item volumes relative to highest-selling category during today's active counter shift.
          </p>
        </div>

        {/* METRICS & CHECKS */}
        <div className="border border-slate-100 rounded-3xl p-5 space-y-4.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">Gross Profit Estimate</span>
          
          <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
            <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide block">Margin Earnings</span>
              <span className="font-mono font-bold text-2xl text-emerald-900 block">₹{summary.profit.toLocaleString()}</span>
              <p className="text-[9px] text-emerald-600 mt-0.5">Computed as gross receipts minus original list costs.</p>
            </div>
          </div>

          {/* WARNING BADGES */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-xs text-gray-700 block">System Critical Bulletins</h4>
            
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-2 text-xs text-amber-900 leading-snug">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5" />
              <div>
                <strong>Low Stock Warnings:</strong> {summary.lowStockCount} item(s) are at or below safety reorder threshold limits! Review stock shelf.
              </div>
            </div>

            <div className="p-3 rounded-xl border border-red-200 bg-red-50/40 flex items-start gap-2 text-xs text-red-900 leading-snug">
              <BookOpen className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <strong>Outstanding Khata Credit:</strong> Total shopper debt is <strong>₹{summary.totalCreditOutstanding.toLocaleString()}</strong> across all customer registers.
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
