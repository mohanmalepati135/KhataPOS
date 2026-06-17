import React, { useState } from "react";
import { Store, CreditCard, Shield, Lock, Smartphone, RefreshCw, Layers, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppStore, AppUser } from "../types";

interface StoreSettingsProps {
  activeStore: AppStore;
  activeUser: AppUser;
  onUpdateStoreSettings: (payload: any) => Promise<any>;
}

export default function StoreSettings({
  activeStore,
  activeUser,
  onUpdateStoreSettings,
}: StoreSettingsProps) {
  const [storeName, setStoreName] = useState(activeStore.name);
  const [upiId, setUpiId] = useState(activeStore.upiId);
  const [gstEnabled, setGstEnabled] = useState(activeStore.gstEnabled);
  const [gstin, setGstin] = useState(activeStore.gstin || "");
  
  // Custom Cashier security PIN update
  const [cashierPin, setCashierPin] = useState("1234");
  const [isPinChanged, setIsPinChanged] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setErrorMsg("Store Name is required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      storeId: activeStore._id,
      name: storeName,
      upiId: upiId,
      gstEnabled: gstEnabled,
      gstin: gstEnabled ? gstin : undefined,
    };

    try {
      await onUpdateStoreSettings(payload);
      setSuccessMsg("Countertop configurations updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit settings parameters.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashierPin.length !== 4) {
      setErrorMsg("Cashier PIN must be exactly 4 digits.");
      return;
    }
    
    // Simulate updating cashier pin in backend
    setIsPinChanged(true);
    setSuccessMsg("Cashier PIN updated to: " + cashierPin + "!");
    setTimeout(() => {
      setSuccessMsg("");
      setIsPinChanged(false);
    }, 4000);
  };

  const isBluetoothSupported = typeof (navigator as any).bluetooth !== "undefined";
  const isSerialSupported = typeof (navigator as any).serial !== "undefined";

  return (
    <div className="bg-white rounded-[24px] border border-gray-200 p-6 shadow-sm min-h-[calc(100vh-140px)] select-none font-sans">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 pb-5 mb-6">
        <h2 className="font-display font-black text-lg text-gray-950 uppercase tracking-tight">Store setup & terminal keys</h2>
        <p className="text-xs text-gray-500 mt-0.5">Manage billing taxes, UPI accounts, Cashier desk credentials, and hardware links.</p>
      </div>

      {successMsg && (
        <div className="mb-5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 p-3.5 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 rounded-xl bg-red-50 text-red-650 border border-red-100 p-3.5 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: SETTINGS FORM (7/12) */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-5">
          <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wider block">1. Company profile & Tax Setup</h3>
          
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Kirana Store Title</label>
            <div className="relative">
              <Store className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kirana & General Store"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-1 focus:ring-[#2563EB] focus:outline-none transition whitespace-nowrap focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Merchant UPI address (Dynamic QR Code)</label>
            <div className="relative">
              <CreditCard className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. rameshstore@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-1 focus:ring-[#2563EB] font-mono focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 font-semibold">UPI code is rendered in QR format at cashier desk during digital checkouts.</p>
          </div>

          {/* GST TAX CONTROLS BOX */}
          <div className="rounded-2xl border border-gray-250 p-4 bg-[#FAF9F5] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-950 text-xs block">Invoice GST Taxation</span>
                <span className="text-[10px] text-gray-500">Expose GST taxes breakdown on printable thermal receipt tape</span>
              </div>
              <button
                type="button"
                onClick={() => setGstEnabled(!gstEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  gstEnabled ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    gstEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {gstEnabled && (
              <div className="animate-fade-in">
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">GSTIN Identification Number</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="GSTIN Code (e.g. 27AAAAA1111A1Z1)"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-gray-250 bg-white px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold text-xs px-4.5 py-2.5 shadow-md uppercase tracking-wider cursor-pointer"
          >
            {isLoading ? "Saving Configurations..." : "Commit Terminal Settings"}
          </button>
        </form>

        {/* RIGHT COLUMN: CASHIER PIN & SHIELD LOGINS (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CASHIER PIN CONFIG */}
          <form onSubmit={handleUpdatePin} className="border border-gray-100 bg-[#FAF9F5]/40 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 uppercase">
              <Shield className="h-4.5 w-4.5 text-blue-600" />
              <span>2. Cashier Counter PIN Authorization</span>
            </div>
            
            <p className="text-[11px] text-gray-500 leading-normal">
              Manage cashier login keys. Shared terminal staff unlocks the billing dashboard using this numerical credential.
            </p>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Counter Cashier 4-Digit PIN</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="PIN (default 1234)"
                  value={cashierPin}
                  onChange={(e) => setCashierPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-4 py-2 font-mono text-center tracking-widest text-sm rounded-xl border border-gray-200 bg-white"
                />
              </div>
              <p className="text-[9px] text-gray-400 mt-1">Simulated store pin code matches StoreId: <strong>{activeStore._id}</strong></p>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-xs font-semibold shadow"
            >
              Update Unlock PIN
            </button>
          </form>

          {/* HARDWARE COMPATIBILITY BADGES CONTAINER */}
          <div className="border border-slate-100 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-xs text-gray-800 uppercase tracking-wide block">3. Serial Device Port Permissions</h3>
            
            <div className="space-y-2">
              
              {/* Bluetooth Printer Port */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-50 bg-[#FAF9F5] text-xs">
                <span className="font-semibold text-gray-700">Bluetooth Thermal Printer:</span>
                {isBluetoothSupported ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded font-bold uppercase">
                    Supported (WEB BLE)
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded font-bold uppercase">
                    Check browser config
                  </span>
                )}
              </div>

              {/* Serial scale Port */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-50 bg-[#FAF9F5] text-xs">
                <span className="font-semibold text-gray-700">Serial weighing scale Parser:</span>
                {isSerialSupported ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded font-bold uppercase">
                    Supported (WEB SERIAL)
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded font-bold uppercase">
                    Check browser config
                  </span>
                )}
              </div>

            </div>

            {/* ALERT BOX if on iOS or Safari */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-150 flex items-start gap-2 text-[10px] text-blue-900 leading-snug">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <strong>Low Cost Tablet Advice:</strong> If using at countertop, run KhataPOS inside <strong>Google Chrome on Android</strong> for physical Bluetooth ESC/POS and Serial Scale driver integration.
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
