/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { localDb, syncOfflineData, LocalProduct, LocalCustomer, LocalBill } from "./db";
import { AppStore, AppUser, CartItem } from "./types";
import { Scale, Printer, LogOut, ChevronRight, ShoppingCart, Check, RefreshCw, Layers, ShieldAlert } from "lucide-react";

// Import modular panels
import AuthScreens from "./components/AuthScreens";
import HardwareSimulator from "./components/HardwareSimulator";
import BillingCounter from "./components/BillingCounter";
import InventoryManager from "./components/InventoryManager";
import KhataLedger from "./components/KhataLedger";
import StoreReports from "./components/StoreReports";
import StoreSettings from "./components/StoreSettings";

export default function App() {
  // Session States
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);
  const [activeStore, setActiveStore] = useState<AppStore | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Active Desk tab
  const [activeTab, setActiveTab] = useState<"billing" | "inventory" | "khata" | "reports" | "settings">("billing");

  // Counter local states
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<LocalCustomer | null>(null);

  // Hardware Link simulation states
  const [scaleWeight, setScaleWeight] = useState<number>(1.250); // initial 1.25 kg weight
  const [printedReceiptHtml, setPrintedReceiptHtml] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");

  // Hydrate local database from server API on boot
  useEffect(() => {
    const hydrateLocalDb = async () => {
      try {
        const storeId = activeStore?._id || "s1";
        
        // 1. Fetch products from server (if online) and load into Dexie
        const prodRes = await fetch(`/api/products?storeId=${storeId}`);
        if (prodRes.ok) {
          const prodList = await prodRes.json();
          if (prodList && prodList.length > 0) {
            await localDb.products.clear();
            await localDb.products.bulkPut(prodList);
            console.log("Hydrated Dexie products database from server.");
          }
        }

        // 2. Fetch customers from server (if online) and load into Dexie
        const custRes = await fetch(`/api/customers?storeId=${storeId}`);
        if (custRes.ok) {
          const custList = await custRes.json();
          if (custList && custList.length > 0) {
            await localDb.customers.clear();
            await localDb.customers.bulkPut(custList);
            console.log("Hydrated Dexie customers database from server.");
          }
        }
      } catch (err) {
        console.warn("Unable to fetch hydration states on boot (Counter is operating completely offline).");
      }

      // Read local Dexie databases into active React states (master client copy)
      refreshReactDbStates();
    };

    if (activeUser && activeStore) {
      hydrateLocalDb();
    }
  }, [activeUser, activeStore]);

  const refreshReactDbStates = async () => {
    const localProds = await localDb.products.toArray();
    const localCusts = await localDb.customers.toArray();
    setProducts(localProds);
    setCustomers(localCusts);
  };

  // Setup dynamic receipts rollout hook for counter payments inside components
  useEffect(() => {
    (window as any).dispatchReceiptRoll = (html: string, paymentMethod: string, amount: number, phone: string) => {
      setPrintedReceiptHtml(html);
      
      // Update local catalog list stock quantities immediately
      cart.forEach(async (cartItem) => {
        const dbProd = await localDb.products.get(cartItem.productId);
        if (dbProd) {
          await localDb.products.update(cartItem.productId, {
            stockQty: Math.max(0, dbProd.stockQty - cartItem.quantity)
          });
        }
      });

      // Update customer local credit balance state if credit chosen
      if (paymentMethod === "credit" && activeCustomer) {
        localDb.customers.update(activeCustomer._id, {
          creditBalance: activeCustomer.creditBalance + amount
        });
      }

      // Trigger automatic backup sync to cloud database if online
      if (!isOfflineMode && activeStore) {
        triggerSync(activeStore._id);
      } else {
        refreshReactDbStates();
      }
    };

    return () => {
      delete (window as any).dispatchReceiptRoll;
    };
  }, [cart, activeCustomer, isOfflineMode, activeStore]);

  // Synchronize Dexie state with Backend db_store
  const triggerSync = async (storeId: string) => {
    setIsSyncing(true);
    setSyncStatusMsg("Backing up ledger logs to cloud...");
    try {
      await syncOfflineData(storeId);
      setSyncStatusMsg("Terminal backup synchronized!");
      setTimeout(() => setSyncStatusMsg(""), 3000);
    } catch (e) {
      setSyncStatusMsg("Unable to backup (offline cue locked)");
      setTimeout(() => setSyncStatusMsg(""), 4000);
    } finally {
      setIsSyncing(false);
      refreshReactDbStates();
    }
  };

  // Auth logins callback switcher
  const handleAuthSuccess = (user: AppUser, store: AppStore, token: string) => {
    setActiveUser(user);
    setActiveStore(store);
    setAuthToken(token);
    
    // Seed initial demo store configs
    if (store.name) {
      setActiveTab("billing");
    }
  };

  // LOGOUT Counter staff
  const handleLogout = () => {
    if (confirm("Are you sure you want to lock the active billing desk?")) {
      setActiveUser(null);
      setActiveStore(null);
      setAuthToken(null);
      setCart([]);
      setActiveCustomer(null);
      setPrintedReceiptHtml(null);
    }
  };

  // CART OPERATIONS HANDLERS
  const handleAddToCart = (product: LocalProduct, quantity: number, weight?: number) => {
    const existingIdx = cart.findIndex((item) => item.productId === product._id);
    
    if (existingIdx > -1) {
      const updated = [...cart];
      if (product.unitType === "kg") {
        updated[existingIdx].quantity = quantity; // overwrite with scale weight
      } else {
        updated[existingIdx].quantity += quantity;
      }
      setCart(updated);
    } else {
      const newItem: CartItem = {
        productId: product._id,
        name: product.name,
        barcode: product.barcode,
        quantity: quantity,
        unitType: product.unitType,
        price: product.price,
        costPrice: product.costPrice,
        discount: 0,
        taxRate: product.taxRate,
        category: product.category,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
    } else {
      setCart(cart.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)));
    }
  };

  const handleUpdateDiscount = (productId: string, disc: number) => {
    setCart(cart.map((item) => (item.productId === productId ? { ...item, discount: Math.max(0, disc) } : item)));
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // Inventory addition callback
  const handleAddNewProductSubmit = async (payload: any) => {
    try {
      if (isOfflineMode) {
        const id = "p_off_" + Math.random().toString(36).substr(2, 9);
        const offlineProduct: LocalProduct = { ...payload, _id: id, createdAt: new Date().toISOString() };
        await localDb.products.put(offlineProduct);
        refreshReactDbStates();
        return offlineProduct;
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const saved = await res.json();
          await localDb.products.put(saved);
          refreshReactDbStates();
          return saved;
        } else {
          const errInfo = await res.json();
          throw new Error(errInfo.error);
        }
      }
    } catch (e: any) {
      alert(e.message || "Failed to commit stock item.");
      throw e;
    }
  };

  const handleUpdateProductSubmit = async (id: string, payload: any) => {
    try {
      if (isOfflineMode) {
        await localDb.products.update(id, payload);
        refreshReactDbStates();
        return { _id: id, ...payload };
      } else {
        const res = await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          await localDb.products.put(updated);
          refreshReactDbStates();
          return updated;
        } else {
          const errInfo = await res.json();
          throw new Error(errInfo.error);
        }
      }
    } catch (e: any) {
      alert(e.message || "Failed to update item.");
      throw e;
    }
  };

  // Customer Payment callbacks
  const handleRecordPaymentSubmit = async (customerId: string, amount: number, note: string) => {
    try {
      if (isOfflineMode) {
        const cust = await localDb.customers.get(customerId);
        if (cust) {
          const updatedBal = Math.max(0, cust.creditBalance - amount);
          await localDb.customers.update(customerId, { creditBalance: updatedBal });
          await localDb.creditLedger.add({
            _id: "cl_off_" + Math.random().toString(36).substr(2, 9),
            storeId: activeStore?._id || "s1",
            customerId,
            billId: null,
            amount: -amount,
            note: note || "Offline Payment",
            createdAt: new Date().toISOString(),
          });
          refreshReactDbStates();
          return true;
        }
      } else {
        const res = await fetch(`/api/customers/${customerId}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, note, storeId: activeStore?._id }),
        });
        if (res.ok) {
          const data = await res.json();
          // Sync database copy
          await localDb.customers.put(data.customer);
          refreshReactDbStates();
          return data;
        } else {
          const errInfo = await res.json();
          throw new Error(errInfo.error);
        }
      }
    } catch (e: any) {
      alert(e.message || "Unable to save transaction payment.");
      throw e;
    }
  };

  // Create Customer callbacks
  const handleAddNewCustomerSubmit = async (name: string, phone: string, baseBalance?: number) => {
    try {
      const payload = { storeId: activeStore?._id || "s1", name, phone, creditBalance: baseBalance || 0 };
      if (isOfflineMode) {
        const id = "c_off_" + Math.random().toString(36).substr(2, 9);
        const offlineCust: LocalCustomer = { _id: id, ...payload, createdAt: new Date().toISOString() };
        await localDb.customers.put(offlineCust);
        if (offlineCust.creditBalance > 0) {
          await localDb.creditLedger.add({
            _id: "cl_off_" + Math.random().toString(36).substr(2, 9),
            storeId: activeStore?._id || "s1",
            customerId: id,
            billId: null,
            amount: offlineCust.creditBalance,
            note: "Opening Balance Offline",
            createdAt: new Date().toISOString(),
          });
        }
        refreshReactDbStates();
        return offlineCust;
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          await localDb.customers.put(data);
          refreshReactDbStates();
          return data;
        } else {
          const errInfo = await res.json();
          throw new Error(errInfo.error);
        }
      }
    } catch (e: any) {
      console.error("Unable to add shopper profile:", e);
      return null;
    }
  };

  // Update Settings callbacks
  const handleUpdateStoreSettingsSubmit = async (payload: any) => {
    try {
      if (isOfflineMode) {
        const current = { ...activeStore, ...payload };
        setActiveStore(current);
        return current;
      } else {
        const res = await fetch("/api/settings/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setActiveStore(data.store);
          return data.store;
        } else {
          const errInfo = await res.json();
          throw new Error(errInfo.error);
        }
      }
    } catch (e: any) {
      alert(e.message || "Failed to edit merchant variables.");
      throw e;
    }
  };

  const handleBarcodeLaserScan = (barcode: string) => {
    // Simulated scan callback from HardwareSimulator gun
    const matched = products.find((p) => p.barcode === barcode);
    if (matched) {
      if (matched.unitType === "kg") {
        // Triggers open weigher modal
        (window as any).triggerWeighManual?.(matched);
      } else {
        handleAddToCart(matched, 1);
        
        // Dynamic scan message alert trigger
        const overlay = document.getElementById("billing-barcode-gun") as HTMLInputElement;
        if (overlay) overlay.value = matched.name;
      }
    }
  };

  // If session is unauthenticated, mount AuthScreens
  if (!activeUser || !activeStore) {
    return <AuthScreens onAuthSuccess={handleAuthSuccess} isOfflineMode={isOfflineMode} />;
  }

  return (
    <div className="min-h-screen bg-[#EAE7E0] p-2 sm:p-5 flex items-center justify-center font-sans selection:bg-blue-100">
      <div className="w-full max-w-[1440px] bg-[#F8F8F6] rounded-[24px] sm:rounded-[36px] shadow-2xl border-4 sm:border-[12px] border-[#1A1A1A] overflow-hidden flex flex-col min-h-[92vh]">
        
        {/* 1. TOP HEADER BRANDING ROW */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm select-none">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#22C55E] flex items-center justify-center text-white font-display font-bold text-lg shadow-sm">
                K
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-gray-950">
                Khata<span className="text-[#2563EB]">POS</span>
              </span>
            </div>

            <span className="text-[11px] text-gray-300 font-light">|</span>

            {/* Connected state */}
            <div className="flex items-center gap-2">
              {isOfflineMode ? (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 font-semibold text-[10px] px-2.5 py-1 rounded-full border border-amber-200 uppercase tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Offline local Counter</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 font-semibold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200 uppercase tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  <span>Secure Sync Active</span>
                </span>
              )}

              {isSyncing && (
                <span className="text-[10px] text-blue-600 animate-pulse flex items-center gap-1 font-mono">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing Database...</span>
                </span>
              )}
              
              {syncStatusMsg && !isSyncing && (
                <span className="text-[10px] text-[#555] font-semibold font-sans bg-gray-100 border px-2 py-0.5 rounded animate-fade-in">
                  {syncStatusMsg}
                </span>
              )}
            </div>
          </div>

          {/* MERCHANT / SHIFT NAME & CONTROLS */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="inline-block text-[9px] bg-slate-100 font-bold px-1.5 py-0.2 rounded text-slate-700 uppercase p-0.5">
                Shift: {activeUser.role}
              </span>
              <p className="font-semibold text-xs text-gray-900 mt-0.5 leading-none">{activeUser.name}</p>
              <p className="text-[9px] text-gray-400 mt-1 leading-none">{activeStore.name}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:text-red-650 hover:bg-slate-50 transition"
              title="Lock Cashier Counter"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* 2. SUB-BAR NAVIGATION / SIDEBAR TAB BAR */}
        <div className="w-full px-6 py-6 flex-1 flex flex-col md:flex-row gap-6 max-h-[calc(100vh-140px)] overflow-y-auto">
          
          {/* LEFTSIDEBAR TAB CONTROLLERS (Desktop tab rail) */}
          <div className="md:w-56 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto pb-1 md:pb-0 select-none">
            
            <button
              onClick={() => setActiveTab("billing")}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold shrink-0 border transition-all ${
                activeTab === "billing"
                  ? "bg-[#2563EB] border-[#2563EB] text-white shadow"
                  : "bg-white border-gray-200 hover:bg-slate-50 text-gray-650"
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-[#22C55E]" />
              <span>Counter Billing</span>
              {cart.length > 0 && (
                <span className="ml-auto bg-[#22C55E] text-[10px] text-white px-1.5 rounded-full font-bold">
                  {cart.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold shrink-0 border transition-all ${
                activeTab === "inventory"
                  ? "bg-[#2563EB] border-[#2563EB] text-white shadow"
                  : "bg-white border-gray-200 hover:bg-slate-50 text-gray-650"
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Shelf Stock</span>
            </button>

            <button
              onClick={() => setActiveTab("khata")}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold shrink-0 border transition-all ${
                activeTab === "khata"
                  ? "bg-[#2563EB] border-[#2563EB] text-white shadow"
                  : "bg-white border-gray-200 hover:bg-slate-50 text-gray-650"
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <span>Khata Book</span>
            </button>

            {activeUser.role === "owner" ? (
              <>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold shrink-0 border transition-all ${
                    activeTab === "reports"
                      ? "bg-[#2563EB] border-[#2563EB] text-white shadow"
                      : "bg-white border-gray-200 hover:bg-slate-50 text-gray-650"
                  }`}
                >
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>Reports Summary</span>
                </button>

                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold shrink-0 border transition-all ${
                    activeTab === "settings"
                      ? "bg-[#2563EB] border-[#2563EB] text-white shadow"
                      : "bg-white border-gray-200 hover:bg-slate-50 text-gray-650"
                  }`}
                >
                  <div className="h-2 w-2 rounded-full bg-orange-400" />
                  <span>Counter Settings</span>
                </button>
              </>
            ) : (
              <div className="hidden md:block rounded-2xl border border-dashed border-gray-200 p-4 text-center text-[10px] text-gray-450 mt-5 leading-relaxed bg-white">
                <ShieldAlert className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                <span>Owner locked sections (Reports & Settings hidden for Cashier shifts).</span>
              </div>
            )}
          </div>

          {/* 3. ACTIVE DASH AREA DOCK */}
          <div className="flex-1 min-w-0">
            {activeTab === "billing" && (
              <BillingCounter
                products={products}
                customers={customers}
                cart={cart}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdateDiscount={handleUpdateDiscount}
                onRemoveItem={handleRemoveItem}
                onClearCart={() => setCart([])}
                activeCustomer={activeCustomer}
                onSetActiveCustomer={setActiveCustomer}
                onAddNewCustomer={handleAddNewCustomerSubmit}
                scaleWeight={scaleWeight}
                activeUser={activeUser}
                activeStore={activeStore}
              />
            )}

            {activeTab === "inventory" && (
              <InventoryManager
                products={products}
                activeStore={activeStore}
                onAddNewProduct={handleAddNewProductSubmit}
                onUpdateProduct={handleUpdateProductSubmit}
              />
            )}

            {activeTab === "khata" && (
              <KhataLedger
                customers={customers}
                activeStore={activeStore}
                onRecordPayment={handleRecordPaymentSubmit}
                onAddNewCustomer={handleAddNewCustomerSubmit}
              />
            )}

            {activeTab === "reports" && activeUser.role === "owner" && (
              <StoreReports activeStore={activeStore} activeUser={activeUser} />
            )}

            {activeTab === "settings" && activeUser.role === "owner" && (
              <StoreSettings
                activeStore={activeStore}
                activeUser={activeUser}
                onUpdateStoreSettings={handleUpdateStoreSettingsSubmit}
              />
            )}
          </div>
        </div>

        {/* 4. FLOATING HARDWARE COUNTER CONTROLS SIDE PANEL */}
        <HardwareSimulator
          products={products}
          onBarcodeScan={handleBarcodeLaserScan}
          scaleWeight={scaleWeight}
          onWeightChange={setScaleWeight}
          printedReceiptHtml={printedReceiptHtml}
          onClearReceipt={() => setPrintedReceiptHtml(null)}
          isOfflineMode={isOfflineMode}
          onToggleOffline={() => {
            const toggled = !isOfflineMode;
            setIsOfflineMode(toggled);
            if (!toggled) {
              // Re-trigger sync immediately when toggled online!
              triggerSync(activeStore._id);
            }
          }}
        />
      </div>
    </div>
  );
}
