import React, { useState, useEffect } from "react";
import { Search, UserPlus, Phone, BookOpen, Send, DollarSign, Calendar, FileText, Check, ShieldAlert, Sparkles } from "lucide-react";
import { LocalCustomer, LocalCreditLedger } from "../db";
import { AppStore } from "../types";

interface KhataLedgerProps {
  customers: LocalCustomer[];
  activeStore: AppStore;
  onRecordPayment: (customerId: string, amount: number, note: string) => Promise<any>;
  onAddNewCustomer: (name: string, phone: string, balance?: number) => Promise<any>;
}

export default function KhataLedger({
  customers,
  activeStore,
  onRecordPayment,
  onAddNewCustomer,
}: KhataLedgerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [ledgerHistory, setLedgerHistory] = useState<LocalCreditLedger[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Cash Payments modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // New customer registration state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBalance, setRegBalance] = useState("");
  const [regError, setRegError] = useState("");
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Math totals
  const totalCreditOutstanding = customers.reduce((acc, c) => acc + c.creditBalance, 0);

  // Search filter
  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
  );

  // Select first customer inside list by default if none selected and customers are there
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0]._id);
    }
  }, [customers, selectedCustomerId]);

  // Query Credit Ledger statement list for active customer
  useEffect(() => {
    if (selectedCustomerId) {
      setIsLoadingLedger(true);
      fetch(`/api/customers/${selectedCustomerId}/ledger`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          // Sort reverse chronological
          const sorted = data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setLedgerHistory(sorted);
        })
        .catch(() => {
          // Fallback simple mock ledger structure if API is stale
          setLedgerHistory([]);
        })
        .finally(() => {
          setIsLoadingLedger(false);
        });
    }
  }, [selectedCustomerId, customers]);

  const activeCustomer = customers.find((c) => c._id === selectedCustomerId);

  // Handle Record Counter Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !payAmount || Number(payAmount) <= 0) {
      setPayError("Enter a valid positive number.");
      return;
    }

    setPayError("");
    setIsSubmittingPay(true);

    try {
      await onRecordPayment(selectedCustomerId, Number(payAmount), payNote || "Credit payment received at counter");
      setIsPayModalOpen(false);
      setPayAmount("");
      setPayNote("");
    } catch (err: any) {
      setPayError(err.message || "Failed to submit cash settlement.");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Handle adding new custom khata shopper
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      setRegError("Customer Name and Phone coordinates are required.");
      return;
    }
    if (regPhone.length < 10) {
      setRegError("Verify 10 digit active phone number.");
      return;
    }

    setRegError("");
    setIsSubmittingReg(true);

    try {
      const added = await onAddNewCustomer(regName, regPhone, Number(regBalance || 0));
      if (added) {
        setSelectedCustomerId(added._id);
        setIsRegisterOpen(false);
        setRegName("");
        setRegPhone("");
        setRegBalance("");
      } else {
        setRegError("Shopper phone line already registered.");
      }
    } catch (err: any) {
      setRegError(err.message || "Unable to register client.");
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Compose dynamic WhatsApp notification reminder links
  const triggerWhatsAppReminder = (cust: LocalCustomer) => {
    const textMsg = `Dear ${cust.name}, your outstanding Khata balance at *${activeStore.name}* is *₹${cust.creditBalance.toLocaleString()}*. Kindly settle this balance at your earliest convenience via UPI to *${activeStore.upiId || "rameshstore@okaxis"}*. Thank you!`;
    const encoded = encodeURIComponent(textMsg);
    const waUrl = `https://wa.me/91${cust.phone}?text=${encoded}`;
    window.open(waUrl, "_blank");
  };  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start h-[calc(100vh-140px)] select-none font-sans">
      
      {/* COLUMN 1: CUSTOMERS DIRECT LIST (5/12) */}
      <div className="md:col-span-5 flex flex-col h-full bg-white rounded-[24px] border border-gray-200 p-4 shadow-sm overflow-hidden">
        
        {/* TOTAL KHATA RECTANGLE */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-red-950 uppercase tracking-widest block">Counter Debt Outstanding</span>
            <BookOpen className="h-4.5 w-4.5 text-red-600" />
          </div>
          <span className="font-mono font-black text-3xl text-red-800 block mt-1">₹{totalCreditOutstanding.toLocaleString()}</span>
          <p className="text-[10px] text-red-700 mt-1 font-semibold">Settle with buyers regularly to maintain working cash pool.</p>
        </div>

        {/* CONTROLS */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by shopper name or tel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-250 pl-9 pr-3 py-2.5 rounded-xl text-xs focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white focus:outline-none transition"
            />
          </div>
          <button
            onClick={() => {
              setRegError("");
              setIsRegisterOpen(true);
            }}
            className="rounded-xl bg-[#2563EB] hover:bg-blue-700 font-bold px-3.5 py-2.5 text-xs text-white transition flex items-center gap-1.5 shadow-md uppercase tracking-wider cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add account</span>
          </button>
        </div>

        {/* SCROLLABLE CUSTOMER VERTICAL SHELF */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="font-semibold text-sm text-gray-700">No Customers Added yet</p>
              <p className="text-xs mt-1">Configure credit buyers with "+ Add Account" above.</p>
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const worksAsSelected = c._id === selectedCustomerId;
              return (
                <div
                  key={c._id}
                  onClick={() => setSelectedCustomerId(c._id)}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition duration-150 flex items-center justify-between ${
                    worksAsSelected
                      ? "border-2 border-[#2563EB] bg-blue-50/30 shadow-sm"
                      : "border-gray-250 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs text-gray-950">{c.name}</h4>
                    <span className="font-mono text-[10px] text-gray-500 leading-none font-semibold">{c.phone}</span>
                  </div>

                  <div className="text-right">
                    {c.creditBalance > 0 ? (
                      <span className="font-mono font-bold text-red-800 bg-red-100 border border-red-200 px-2 py-0.5 rounded text-[10px]">
                        Debt: ₹{c.creditBalance.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-750 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                        Clear
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 2: CUSTOMER LEDGER CHRONIC HISTORY (7/12) */}
      <div className="md:col-span-7 flex flex-col h-full bg-white rounded-[24px] border border-gray-200 p-5 shadow-sm overflow-hidden">
        
        {activeCustomer ? (
          <div className="flex flex-col h-full justify-between">
            
            {/* LEDGER CARD PROFILE HEADER */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4 mb-4 gap-4">
                <div>
                  <h3 className="font-display font-black text-gray-950 text-base uppercase tracking-tight">{activeCustomer.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 font-mono font-semibold">
                    <Phone className="h-3.5 w-3.5 text-[#2563EB]" />
                    <span>+91 {activeCustomer.phone}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPayModalOpen(true)}
                    className="rounded-xl bg-[#22C55E] hover:bg-green-600 text-white font-bold px-3.5 py-2.5 text-xs transition flex items-center gap-1 shadow-md uppercase tracking-wide cursor-pointer"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Record cash payment</span>
                  </button>

                  <button
                    onClick={() => triggerWhatsAppReminder(activeCustomer)}
                    className="rounded-xl border border-gray-300 bg-white text-gray-700 font-bold px-3.5 py-2.5 text-xs transition flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
                    title="Send prefilled ledger details reminder to buyer WhatsApp account"
                  >
                    <Send className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp Alert</span>
                  </button>
                </div>
              </div>

              {/* CURRENT ACCOUNT STATUS BLOCK */}
              <div className="flex gap-4 mb-4 bg-slate-50 p-3 rounded-2xl border border-gray-100">
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Ledger Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${activeCustomer.creditBalance > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                    <span className="text-xs font-semibold text-gray-700">
                      {activeCustomer.creditBalance > 0 ? "Outstanding Debt Active" : "No Outstanding Debt"}
                    </span>
                  </div>
                </div>

                <div className="w-px bg-gray-200" />

                <div className="flex-1 text-right">
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Shopper Balance Due</span>
                  <p className={`font-mono text-base font-bold ${activeCustomer.creditBalance > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    ₹{activeCustomer.creditBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* STATEMENT HISTORY TABLE */}
            <div className="flex-1 overflow-y-auto mb-4 border border-slate-100 rounded-2xl shadow-inner">
              {isLoadingLedger ? (
                <p className="text-center text-xs text-gray-400 py-20">Refreshing Ledger statement details...</p>
              ) : ledgerHistory.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <FileText className="h-8 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No transactions found in this katha</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Purchases done on credit or payments logs will render here.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F5] text-gray-500 font-semibold border-b border-gray-100">
                      <th className="p-3">Posting Date</th>
                      <th className="p-3">Reference/Bill</th>
                      <th className="p-3">Description Memo</th>
                      <th className="p-3 text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerHistory.map((l) => {
                      const isPayment = l.amount < 0;
                      return (
                        <tr key={l._id} className="border-b border-slate-50 hover:bg-slate-50/20 text-gray-700">
                          <td className="p-3 font-mono text-gray-400 text-[10px]">
                            {new Date(l.createdAt).toLocaleDateString()} {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 font-mono font-medium">
                            {l.billId ? `BILL #${l.billId.substring(2, 8).toUpperCase()}` : "DIRECT_PAY"}
                          </td>
                          <td className="p-3 text-gray-550 italic truncate max-w-[180px]">{l.note}</td>
                          <td className={`p-3 text-right font-mono font-bold ${isPayment ? "text-emerald-600" : "text-red-600"}`}>
                            {isPayment ? `-₹${Math.abs(l.amount)}` : `+₹${l.amount}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400 h-full">
            <BookOpen className="h-10 w-12 text-gray-200 mb-2" />
            <h4 className="font-semibold text-gray-700 text-sm">Select Buyer Profile</h4>
            <p className="text-xs text-gray-400 mt-1">Select customer from the left side list or add record to explore Khata balances.</p>
          </div>
        )}
      </div>

      {/* MODAL: CASH PAYMENT SETTLEMENT COUNTER */}
      {isPayModalOpen && activeCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border text-center">
            <h3 className="font-display font-bold text-base text-gray-950">Record Outstanding Payment</h3>
            <p className="text-xs text-gray-500 mt-1">Receive cash directly to reduce buyer dues</p>

            {payError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2 border rounded-xl my-3">{payError}</p>
            )}

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 my-6 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Cash Amount Received (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full font-mono rounded-xl border border-gray-250 px-3.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">Due balance: <strong>₹{activeCustomer.creditBalance}</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Memo Notes / Method</label>
                <input
                  type="text"
                  placeholder="e.g. Settle partial grocery debt"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-250 px-3.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-gray-550"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition disabled:bg-gray-200"
                >
                  {isSubmittingPay ? "Posting..." : "Confirm Received Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER NEW CUSTOMER ACCOUNT */}
      {isRegisterOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border">
            <h3 className="font-display font-bold text-base text-gray-950 text-center">Add Khata Account</h3>
            <p className="text-xs text-gray-500 text-center mt-1">Register continuous credit shopper on desk</p>

            {regError && (
              <p className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded-xl my-3">{regError}</p>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 my-5 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Shopper Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Mobile Number (WhatsApp)</label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="e.g. 9876543210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full font-mono rounded-xl border border-gray-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Opening Outstanding Debt (Optional)</label>
                <input
                  type="number"
                  placeholder="₹ 0"
                  value={regBalance}
                  onChange={(e) => setRegBalance(e.target.value)}
                  className="w-full font-mono rounded-xl border border-gray-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-gray-550"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReg}
                  className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:bg-gray-200"
                >
                  {isSubmittingReg ? "Registering..." : "Add Khata Shopper"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
