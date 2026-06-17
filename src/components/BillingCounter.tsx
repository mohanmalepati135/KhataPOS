import React, { useState, useEffect, useRef } from "react";
import { Search, Barcode, Trash2, UserPlus, ShoppingBag, CreditCard, Banknote, HelpCircle, User, CheckCircle2, ChevronRight, Scale, Sparkles, Send, MessageSquare, Phone, ExternalLink, Share2, Clipboard, Check, Printer, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { LocalProduct, LocalCustomer, LocalBillItem } from "../db";
import { CartItem, AppStore, AppUser } from "../types";

interface BillingCounterProps {
  products: LocalProduct[];
  customers: LocalCustomer[];
  cart: CartItem[];
  onAddToCart: (product: LocalProduct, quantity: number, weight?: number) => void;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onUpdateDiscount: (productId: string, disc: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  activeCustomer: LocalCustomer | null;
  onSetActiveCustomer: (customer: LocalCustomer | null) => void;
  onAddNewCustomer: (name: string, phone: string) => Promise<any>;
  scaleWeight: number;
  activeUser: AppUser;
  activeStore: AppStore;
}

export default function BillingCounter({
  products,
  customers,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  activeCustomer,
  onSetActiveCustomer,
  onAddNewCustomer,
  scaleWeight,
  activeUser,
  activeStore,
}: BillingCounterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  
  // Barcode quick search state (manual barcode scanner mock input as well)
  const [barcodeSearchInput, setBarcodeSearchInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Loose weight scale modal state
  const [weighingProduct, setWeighingProduct] = useState<LocalProduct | null>(null);
  
  // Mobile camera barcode scanner states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  
  // Create / Select customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [custError, setCustError] = useState("");

  // Payment popup state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "credit">("cash");
  const [receivedCash, setReceivedCash] = useState("");
  const [billError, setBillError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scan success toast / trigger
  const [lastScannedItemName, setLastScannedItemName] = useState<string | null>(null);

  // WhatsApp Receipt Dispatch states
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [isWhatsappEnabled, setIsWhatsappEnabled] = useState(true);
  const [checkoutSuccessState, setCheckoutSuccessState] = useState<{
    billId: string;
    total: number;
    changeAmount: number;
    receiptHtml: string;
    whatsappUrl: string;
    whatsappText: string;
    phone: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Prefill WhatsApp phone number on active customer linking
  useEffect(() => {
    if (activeCustomer) {
      setWhatsappPhone(activeCustomer.phone);
    } else {
      setWhatsappPhone("");
    }
  }, [activeCustomer]);

  // Calculate unique categories from products
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  // Search filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery);
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate cart sums
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  
  // GST Tax logic
  let taxSumDecimal = 0;
  if (activeStore.gstEnabled) {
    cart.forEach((item) => {
      // Selling price carries GST included. Derive base price and TAX
      const itemBaseTotal = (item.price * item.quantity) - (item.discount * item.quantity);
      const taxFactor = item.taxRate / (100 + item.taxRate);
      taxSumDecimal += itemBaseTotal * taxFactor;
    });
  }
  const taxSum = Math.round(taxSumDecimal * 100) / 100;
  const finalDiscountedTotal = Math.max(0, subtotal - totalItemDiscounts);

  // Trigger manual barcode checkout
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearchInput.trim()) return;

    const matched = products.find((p) => p.barcode === barcodeSearchInput.trim());
    if (matched) {
      if (matched.unitType === "kg") {
        setWeighingProduct(matched);
      } else {
        onAddToCart(matched, 1);
        triggerScanOverlay(matched.name);
      }
      setBarcodeSearchInput("");
    } else {
      alert(`Product with barcode "${barcodeSearchInput}" not registered in inventory.`);
      setBarcodeSearchInput("");
    }
  };

  const triggerScanOverlay = (name: string) => {
    setLastScannedItemName(name);
    setTimeout(() => {
      setLastScannedItemName(null);
    }, 2500);
  };

  // Keyboard barcode simulator support (focus listeners)
  useEffect(() => {
    const handleGlobalBarcode = (event: KeyboardEvent) => {
      // Real USB/Bluetooth scanners emulate typing several rapid keys ending in 'Enter'.
      // For general development usability, our HardwareSimulator fires events directly or we provide the top text input.
    };
    window.addEventListener("keydown", handleGlobalBarcode);
    return () => window.removeEventListener("keydown", handleGlobalBarcode);
  }, [products]);

  // Mobile Camera QR/Barcode Scanner hook
  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;
    
    if (isScannerOpen) {
      setScannerError(null);
      // Wait for the modal/reader element to mount
      const startCameraTimer = setTimeout(() => {
        try {
          const readerElement = document.getElementById("mobile-camera-reader");
          if (!readerElement) {
            console.error("Reader element not found in DOM");
            return;
          }

          html5Qrcode = new Html5Qrcode("mobile-camera-reader");
          scannerInstanceRef.current = html5Qrcode;

          const config = { 
            fps: 15, 
            qrbox: (width: number, height: number) => {
              const size = Math.min(width, height) * 0.70;
              return { width: Math.round(size), height: Math.round(size) };
            }
          };

          html5Qrcode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              console.log("Scanned barcode text:", decodedText);
              
              // Search in products
              const matched = products.find(
                (p) => p.barcode === decodedText || p.barcode.trim() === decodedText.trim()
              );

              if (matched) {
                if (matched.unitType === "kg") {
                  setWeighingProduct(matched);
                } else {
                  onAddToCart(matched, 1);
                  triggerScanOverlay(matched.name);
                }
                setIsScannerOpen(false); // close scanner on match
              } else {
                setScannerError(`Scanned barcode: "${decodedText}" not registered in stock.`);
              }
            },
            (error) => {
              // Ignore standard scanning failures (just seeking frames)
            }
          ).catch((err) => {
            console.error("Camera start error:", err);
            setScannerError("Unable to access camera. Please allow camera permissions.");
          });
        } catch (err: any) {
          console.error("Scanner setup error:", err);
          setScannerError(err.message || "Failed to initialize mobile camera reader.");
        }
      }, 350);

      return () => {
        clearTimeout(startCameraTimer);
        if (html5Qrcode) {
          if (html5Qrcode.isScanning) {
            html5Qrcode.stop().then(() => {
              console.log("Camera scanned stopped cleanly on close.");
            }).catch(err => console.error("Error stopping scanning", err));
          }
        }
      };
    }
  }, [isScannerOpen, products]);

  // Handle product card click
  const handleProductCardClick = (product: LocalProduct) => {
    if (product.unitType === "kg") {
      setWeighingProduct(product);
    } else {
      onAddToCart(product, 1);
      triggerScanOverlay(product.name);
    }
  };

  // Finalize weight based product addition
  const handleConfirmWeighedAdd = () => {
    if (weighingProduct) {
      onAddToCart(weighingProduct, scaleWeight);
      triggerScanOverlay(weighingProduct.name);
      setWeighingProduct(null);
    }
  };

  // Create new customer
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setCustError("Name and Phone are required.");
      return;
    }
    if (newCustPhone.length < 10) {
      setCustError("Phone number must be 10 digits.");
      return;
    }

    setCustError("");
    try {
      const added = await onAddNewCustomer(newCustName, newCustPhone);
      if (added) {
        onSetActiveCustomer(added);
        setNewCustName("");
        setNewCustPhone("");
        setIsCustomerModalOpen(false);
      } else {
        setCustError("This phone number is already registered.");
      }
    } catch (err) {
      setCustError("Failed to add customer profile.");
    }
  };

  // Regenerate WhatsApp Receipt link dynamically if cashier corrects phone on success drawer
  const handleRegenerateWhatsAppLink = async (newPhone: string) => {
    if (!checkoutSuccessState || !newPhone.trim()) return;
    
    try {
      const billItemsList: LocalBillItem[] = cart.map((c) => ({
        productId: c.productId,
        nameSnapshot: c.name,
        quantity: c.quantity,
        unitPrice: c.price,
        discount: c.discount,
        lineTotal: Math.round(((c.price - c.discount) * c.quantity) * 100) / 100,
      }));

      const waRes = await fetch("/api/whatsapp/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newPhone.trim(),
          items: billItemsList,
          subtotal: subtotal,
          discount: totalItemDiscounts,
          taxTotal: taxSum,
          total: finalDiscountedTotal,
          storeName: activeStore.name,
          upiId: activeStore.upiId,
          gstin: activeStore.gstin,
          staffName: activeUser.name,
          billId: checkoutSuccessState.billId,
        }),
      });

      if (waRes.ok) {
        const waData = await waRes.json();
        setCheckoutSuccessState((prev) => prev ? {
          ...prev,
          whatsappUrl: waData.url,
          whatsappText: waData.text,
          phone: newPhone.trim(),
        } : null);
      }
    } catch (err) {
      console.error("Failed to regenerate WhatsApp receipt URL:", err);
    }
  };

  // Run final visual updates, clear cart and reset states back to zero
  const handleCompleteTransactionReset = () => {
    if (checkoutSuccessState) {
      // Trigger standard visual receipts rollout in our simulator on app.tsx
      (window as any).dispatchReceiptRoll?.(
        checkoutSuccessState.receiptHtml,
        paymentMethod,
        checkoutSuccessState.total,
        checkoutSuccessState.phone || activeCustomer?.phone || ""
      );
    }

    // Reset components states
    onClearCart();
    onSetActiveCustomer(null);
    setWhatsappPhone("");
    setReceivedCash("");
    setCheckoutSuccessState(null);
    setIsPaymentOpen(false);
  };

  // Handle Checkout submission
  const handleFinalCheckoutSubmit = async () => {
    if (cart.length === 0) {
      setBillError("Cart is empty.");
      return;
    }

    if (paymentMethod === "credit" && !activeCustomer) {
      setBillError("Please select a Khata customer to save on credit.");
      return;
    }

    setBillError("");
    setIsSubmitting(true);

    try {
      // Core build bill items
      const billItemsList: LocalBillItem[] = cart.map((c) => ({
        productId: c.productId,
        nameSnapshot: c.name,
        quantity: c.quantity,
        unitPrice: c.price,
        discount: c.discount,
        lineTotal: Math.round(((c.price - c.discount) * c.quantity) * 100) / 100,
      }));

      // Post parameters to backend or local database
      const billPayload = {
        storeId: activeStore._id,
        customerId: activeCustomer ? activeCustomer._id : null,
        staffUserId: activeUser._id,
        items: billItemsList,
        subtotal: subtotal,
        discount: totalItemDiscounts,
        taxTotal: taxSum,
        total: finalDiscountedTotal,
        paymentMethod: paymentMethod,
        status: "completed" as const,
        createdAt: new Date().toISOString(),
      };

      // Push API
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billPayload),
      });

      if (!response.ok) {
        const errInfo = await response.json();
        throw new Error(errInfo.error || "Counter Server Rejected Bill");
      }

      const savedBill = await response.json();

      // Trigger standard visual receipts rollout in our simulator on app.tsx
      const upiUrl = `upi://pay?pa=${activeStore.upiId}&pn=${encodeURIComponent(activeStore.name)}&am=${finalDiscountedTotal}&cu=INR`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUrl)}`;

      // Generate HTML thermal view code
      const receiptHtml = `
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
          <h2 style="font-size: 14px; font-weight: bold; margin: 0;">${activeStore.name}</h2>
          <p style="font-size: 10px; margin: 2px 0;">GSTIN: ${activeStore.gstin || "N/A"}</p>
          <p style="font-size: 10px; margin: 2px 0;">Ph: ${activeUser.phone}</p>
        </div>
        <div style="font-size: 10px; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <p style="margin: 2px 0;"><b>Date:</b> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          <p style="margin: 2px 0;"><b>Bill ID:</b> ${savedBill._id.replace(/^b_/, "").substring(0, 6).toUpperCase()}</p>
          <p style="margin: 2px 0;"><b>Staff:</b> ${activeUser.name} (${activeUser.role})</p>
          ${activeCustomer ? `<p style="margin: 2px 0;"><b>Cust:</b> ${activeCustomer.name} (${activeCustomer.phone})</p>` : ""}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; line-height: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th align="left">Item</th>
              <th align="center">Qty</th>
              <th align="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${cart
              .map(
                (item) => `
              <tr>
                <td align="left">${item.name}</td>
                <td align="center">${item.quantity} ${item.unitType}</td>
                <td align="right">₹${Math.round((item.price - item.discount) * item.quantity)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div style="border-top: 1px dashed #000; margin-top: 6px; padding-top: 4px; font-size: 10px;">
          <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${subtotal}</span></div>
          ${totalItemDiscounts > 0 ? `<div style="display: flex; justify-content: space-between; color: red;"><span>Disc:</span><span>-₹${totalItemDiscounts}</span></div>` : ""}
          ${activeStore.gstEnabled ? `<div style="display: flex; justify-content: space-between;"><span>GST Tax:</span><span>₹${taxSum}</span></div>` : ""}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; border-top: 1px solid #000; margin-top: 4px; padding-top: 2px;">
            <span>TOTAL:</span><span>₹${finalDiscountedTotal}</span>
          </div>
        </div>
        <div style="text-align: center; margin-top: 10px; padding-top: 6px; border-top: 1px dashed #000;">
          <p style="font-size: 10px; font-weight: bold; margin: 0 0 4px 0;">Payment: ${paymentMethod.toUpperCase()}</p>
          ${
            paymentMethod === "upi"
              ? `
            <div style="margin: 8px auto; text-align: center;">
              <img src="${qrApiUrl}" style="width: 110px; height: 110px;" alt="UPI QR" />
              <p style="font-size: 8px; color: gray; margin: 2px 0;">Scan via PhonePe, GPay, Paytm</p>
            </div>
          `
              : ""
          }
          <p style="font-size: 9px; margin: 4px 0;">Thank you! Visit again.</p>
          <p style="font-size: 8px; color: gray; margin: 0;">Powered by KhataPOS</p>
        </div>
      `;

      // Fetch WhatsApp Formatted deep-link in parallel / background from server-side
      let whatsappUrl = "";
      let whatsappText = "";
      if (isWhatsappEnabled && whatsappPhone.trim()) {
        try {
          const waRes = await fetch("/api/whatsapp/receipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: whatsappPhone.trim(),
              items: billItemsList,
              subtotal: subtotal,
              discount: totalItemDiscounts,
              taxTotal: taxSum,
              total: finalDiscountedTotal,
              storeName: activeStore.name,
              upiId: activeStore.upiId,
              gstin: activeStore.gstin,
              staffName: activeUser.name,
              billId: savedBill._id,
            }),
          });
          if (waRes.ok) {
            const waData = await waRes.json();
            whatsappUrl = waData.url;
            whatsappText = waData.text;
          }
        } catch (err) {
          console.error("Backend WhatsApp dispatcher error:", err);
        }
      }

      const rawChange = paymentMethod === "cash" && receivedCash ? parseFloat(receivedCash) - finalDiscountedTotal : 0;
      const changeAmount = Math.max(0, rawChange);

      // Transition to elegant checkout completed success view so the user has visual focus on receipt
      setCheckoutSuccessState({
        billId: savedBill._id,
        total: finalDiscountedTotal,
        changeAmount: changeAmount,
        receiptHtml: receiptHtml,
        whatsappUrl: whatsappUrl,
        whatsappText: whatsappText,
        phone: whatsappPhone.trim(),
      });

    } catch (err: any) {
      console.error("Bill processing failed:", err);
      setBillError(err.message || "Failed to commit bill transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomersFiltered = customers.filter((c) =>
    c.name.toLowerCase().includes(custSearch.toLowerCase()) || 
    c.phone.includes(custSearch)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-140px)] select-none">
      
      {/* COLUMN 1: PRODUCT CATALOG & CATEGORIES (8/12) */}
      <div className="lg:col-span-8 flex flex-col h-full bg-white rounded-[24px] border border-gray-200 p-4 shadow-sm overflow-hidden">
        
        {/* BARCODE SEARCH + TEXT INPUT SEARCH */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
          <form onSubmit={handleBarcodeSubmit} className="relative md:col-span-4">
            <Barcode className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              ref={barcodeRef}
              type="text"
              placeholder="Laser Barcode Scan..."
              value={barcodeSearchInput}
              onChange={(e) => setBarcodeSearchInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white transition font-mono tracking-wider"
            />
          </form>

          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search food, soap, or shelf item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF9F5] border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white transition"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="md:col-span-4 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-95 border border-emerald-500"
            title="Scan labels using Mobile Camera"
          >
            <Camera className="h-4 w-4 animate-pulse text-emerald-100" />
            <span>Scan with Mobile Camera</span>
          </button>
        </div>

        {/* SCAN SUCCESS OVERLAY ALERT DOCK */}
        {lastScannedItemName && (
          <div className="bg-[#22C55E] text-white rounded-xl mb-4 px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md animate-bounce">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>Scanned "{lastScannedItemName}" successfully on bill!</span>
            </div>
            <span className="font-mono text-[9px] bg-green-700 px-1.5 py-0.5 rounded text-white">+1 Qty</span>
          </div>
        )}

        {/* ITEM CATEGORIES SCROLL RAIL */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 border-b border-gray-100 max-w-[80vw]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
                categoryFilter === cat
                  ? "bg-[#2563EB] text-white shadow-sm border border-[#2563EB]"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* PRODUCTS DIRECT GRID */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-300 mb-2" />
              <h4 className="font-semibold text-gray-800 text-sm">No items in this shelf</h4>
              <p className="text-xs text-gray-400 mt-0.5">Define more products in the stock tab above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const cartQty = cart.find((item) => item.productId === p._id)?.quantity || 0;
                const isLowStock = p.stockQty <= p.lowStockThreshold;

                return (
                  <div
                    key={p._id}
                    onClick={() => handleProductCardClick(p)}
                    className={`relative cursor-pointer group bg-white border p-3 hover:shadow-lg transition-all duration-200 flex flex-col justify-between ${
                      cartQty > 0 
                        ? "border-2 border-[#2563EB] bg-[#F8F9FF] rounded-[24px] shadow-sm" 
                        : "border-gray-200 bg-white rounded-[24px]"
                    }`}
                  >
                    {cartQty > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#2563EB] font-bold font-mono text-[10px] text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
                        {p.unitType === "kg" ? cartQty.toFixed(1) : cartQty}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[8px] bg-slate-100 border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                          {p.category}
                        </span>
                        {isLowStock && (
                          <span className="text-[7px] text-amber-800 bg-amber-50 border-l-2 border-amber-400 pl-1 py-0.2 rounded font-semibold whitespace-nowrap">
                            Stock: {p.stockQty}
                          </span>
                        )}
                      </div>
                      <h4 className="text-gray-900 font-semibold text-xs tracking-tight line-clamp-2 leading-snug">
                        {p.name}
                      </h4>
                    </div>

                    <div className="flex items-end justify-between mt-3 pt-2 border-t border-gray-100">
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-[#111827] text-sm">
                          ₹{p.price}
                        </span>
                        <span className="text-[9px] text-[#2563EB] font-bold">
                          per {p.unitType}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#2563EB] font-bold opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {p.unitType === "kg" ? "Weigh scale" : "+ Add Item"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: BILL CART & CHECKOUT DRAWER (4/12) */}
      <div className="lg:col-span-4 flex flex-col h-full bg-white rounded-[24px] border border-gray-200 p-4 shadow-sm overflow-hidden">
        
        {/* COUNTER USER SESSION CHIPS */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] text-xs font-bold font-mono">
              {activeUser.name[0]}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-900 leading-tight uppercase tracking-wider">Operational Desk</p>
              <p className="text-[9px] text-gray-500 leading-none">{activeUser.name} ({activeUser.role})</p>
            </div>
          </div>
          <button
            onClick={onClearCart}
            disabled={cart.length === 0}
            className="text-[10px] text-red-650 hover:text-red-700 font-bold disabled:text-gray-300 transition"
          >
            Clear Bill
          </button>
        </div>

        {/* CUSTOMER LEDGER ASSOCIATOR BAR */}
        <div className="mb-3">
          {activeCustomer ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#2563EB]" />
                <div>
                  <h4 className="font-bold text-xs text-blue-950 font-sans">{activeCustomer.name}</h4>
                  <p className="font-mono text-[9px] text-[#2563EB] leading-none">{activeCustomer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeCustomer.creditBalance > 0 && (
                  <span className="text-[9px] bg-red-100 text-red-700 font-mono font-bold px-1.5 py-0.5 rounded">
                    Khata: ₹{activeCustomer.creditBalance}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onSetActiveCustomer(null)}
                  className="rounded-full bg-blue-100 text-[10px] text-blue-800 px-2 py-0.5 hover:bg-blue-200 transition font-semibold"
                >
                  Unlink
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setCustSearch("");
                setIsCustomerModalOpen(true);
              }}
              className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 px-3 hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-blue-50/20 text-gray-600 text-xs font-bold flex items-center justify-center gap-1.5 transition duration-150"
            >
              <UserPlus className="h-4 w-4 text-[#2563EB]" />
              <span>Link Khata Customer Account</span>
            </button>
          )}
        </div>

        {/* CART ITEMS BOX */}
        <div className="flex-1 overflow-y-auto mb-4 border-b border-gray-100 pr-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
              <ShoppingBag className="h-12 w-12 text-gray-250 mb-2" />
              <p className="text-xs font-semibold text-gray-550">Counter cart is empty.</p>
              <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] leading-normal">Tap items on the left or scan item barcodes with laser pistol gun.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-start justify-between gap-2 bg-gray-50 hover:bg-slate-100/50 p-2.5 rounded-xl border border-gray-200/50 animate-fade-in transition-all">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-gray-950 truncate leading-snug">{item.name}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] text-[#2563EB] font-bold">₹{item.price}/{item.unitType}</span>
                      
                      {/* CART ITEM DISCOUNT SWITCHER */}
                      <div className="flex items-center gap-1 border border-red-100 bg-red-50/30 px-1 rounded">
                        <span className="text-[8px] text-red-650 font-bold">Disc:</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          max={item.price}
                          value={item.discount || ""}
                          onChange={(e) => onUpdateDiscount(item.productId, Number(e.target.value))}
                          className="w-10 text-center font-mono text-[9px] bg-white rounded px-0.5 text-red-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* QUANTITY INCREMENTER */}
                    <div className="flex items-center border border-gray-300 bg-white rounded-lg p-0.5">
                      <button
                        onClick={() => {
                          const steps = item.unitType === "kg" ? 0.25 : 1;
                          onUpdateQuantity(item.productId, Math.max(0, item.quantity - steps));
                        }}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs text-gray-900 w-8 text-center bg-gray-50/50 py-0.5 rounded mx-0.5">
                        {item.unitType === "kg" ? item.quantity.toFixed(2) : item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          const steps = item.unitType === "kg" ? 0.25 : 1;
                          onUpdateQuantity(item.productId, item.quantity + steps);
                        }}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.productId)}
                      className="text-gray-400 hover:text-red-650 p-1 cursor-pointer transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CART SUM BILL BOX */}
        <div className="bg-[#FAF9F5] border border-gray-200 p-3.5 rounded-2xl space-y-1.5 text-xs text-gray-600 mb-3">
          <div className="flex justify-between">
            <span className="font-medium">Total registered count:</span>
            <span className="font-mono font-bold text-gray-900">{cart.length} item(s)</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Gross counter sum:</span>
            <span className="font-mono font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
          </div>
          {totalItemDiscounts > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span className="flex items-center gap-0.5">
                <Sparkles className="h-3.5 w-3.5" /> Items Discounts:
              </span>
              <span className="font-mono font-bold">-₹{totalItemDiscounts.toFixed(2)}</span>
            </div>
          )}
          {activeStore.gstEnabled && (
            <div className="flex justify-between font-medium">
              <span>GST Tax (inclusive):</span>
              <span className="font-mono text-gray-800">₹{taxSum.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-end border-t border-gray-200 mt-2.5 pt-2.5 text-gray-900">
            <span className="font-black text-xs tracking-wider uppercase text-gray-550">GRAND TOTAL</span>
            <span className="font-mono font-black text-2xl text-[#2563EB]">
              ₹{finalDiscountedTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* PAYOUT BUTTON */}
        <button
          onClick={() => {
            if (cart.length === 0) return;
            setBillError("");
            setReceivedCash("");
            setIsPaymentOpen(true);
          }}
          disabled={cart.length === 0}
          className="w-full py-3.5 bg-[#22C55E] hover:bg-green-600 disabled:bg-gray-200 text-white font-bold rounded-xl text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
        >
          <CreditCard className="h-4.5 w-4.5" />
          <span>PAY OUT (₹{finalDiscountedTotal.toFixed(2)})</span>
        </button>
      </div>

      {/* WEIGHING MODAL DIALOG (ESSAE DS-252 INTEGRATION TYPE) */}
      {weighingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF9F5]/30 backdrop-blur-md fixed inset-0" onClick={() => setWeighingProduct(null)} />
          <div className="bg-white rounded-[28px] p-6 max-w-md w-full border border-gray-150 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto">
            
            {/* Header Area with Green Badge */}
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
              <div className="w-11 h-11 rounded-2xl bg-[#EBFDF5] text-[#10B981] flex items-center justify-center border border-[#A7F3D0]">
                <Scale className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-display font-extrabold text-[#111827] text-lg tracking-tight">Weigh item</h3>
                <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563] font-semibold mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block absolute" />
                  <span>Live reading from Essae DS-252</span>
                </div>
              </div>
            </div>

            {/* LARGE BLACK DIGITAL NET WEIGHT DISPLAY */}
            <div className="bg-[#1C1917] rounded-[24px] p-6 text-center text-white mb-5 shadow-inner border border-neutral-800">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#A8A29E] block mb-1.5">
                NET WEIGHT
              </span>
              <div className="text-5xl font-mono font-black text-white tracking-wider my-0.5 animate-pulse">
                {scaleWeight.toFixed(3)}
              </div>
              <span className="text-xs text-[#A8A29E] font-semibold block mt-1.5">
                kg
              </span>
            </div>

            {/* ASSIGN TO PRODUCT CONTAINER */}
            <div className="text-left mb-6">
              <h4 className="text-xs font-extrabold text-[#374151] uppercase tracking-wider mb-2.5">
                Assign to product
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {products
                  .filter((p) => p.unitType === "kg")
                  .map((p) => {
                    const isSelected = weighingProduct._id === p._id;
                    const computedPrice = p.price * scaleWeight;
                    return (
                      <div
                        key={p._id}
                        onClick={() => setWeighingProduct(p)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border transition-all ${
                          isSelected
                            ? "bg-[#F0FDF4] border-[#22C55E] text-[#166534] shadow-sm font-semibold"
                            : "bg-white hover:bg-slate-50 border-[#E5E7EB] text-[#374151] hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl transition ${
                              isSelected
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : "bg-slate-100 text-[#9CA3AF] border border-[#E5E7EB]"
                            }`}
                          >
                            <ShoppingBag className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold">{p.name}</p>
                            <span className="text-[10px] text-[#6B7280] font-medium">
                              ₹{p.price}/kg
                            </span>
                          </div>
                        </div>
                        <div className={`font-mono text-xs font-extrabold ${isSelected ? 'text-[#15803D] text-sm' : 'text-[#374151]'}`}>
                          ₹{Math.round(computedPrice)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* COMPOSITE SLIDER HELP FOR CASHER */}
            <p className="text-[10px] bg-amber-50 text-amber-800 px-3.5 py-2 rounded-xl border border-amber-200 leading-normal text-left mb-5">
              💡 <strong>Counter Tip:</strong> You can slide or tweak live product loads directly in the <strong>Kirana Counter Hardware Panel</strong> at bottom-right of your desk.
            </p>

            {/* ACTION FOOTER BUTTONS */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWeighingProduct(null)}
                className="flex-1 py-3 border border-[#D1D5DB] hover:bg-slate-50 rounded-xl text-xs font-bold text-[#374151] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWeighedAdd}
                className="flex-1 py-3 bg-[#115E59] hover:bg-[#134e4a] text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Add to bill</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MOBILE BARCODE CAMERA SCANNER MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-between p-6">
          
          {/* HEADER CONTROL */}
          <div className="flex justify-between items-center text-white pb-3 border-b border-white/10 max-w-md mx-auto w-full">
            <div className="text-left">
              <h3 className="font-display font-extrabold text-base tracking-tight text-white uppercase">Mobile Camera Lens</h3>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">● Seeking Barcode / QR Label</p>
            </div>
            <button
              onClick={() => setIsScannerOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm select-none cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* VIEWFINDER CAMERA CONTAINER */}
          <div className="flex-1 my-6 flex flex-col justify-center items-center relative">
            <div className="max-w-md w-full relative aspect-square rounded-[32px] overflow-hidden bg-black border-2 border-dashed border-[#A7F3D0] shadow-2xl flex items-center justify-center">
              
              {/* Actual Camera Mount Node */}
              <div id="mobile-camera-reader" className="w-full h-full object-cover" />
              
              {/* Highlighting viewfinder overlay lines */}
              <div className="absolute inset-8 pointer-events-none border-2 border-[#10B981] rounded-2xl opacity-60">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400" />
                
                {/* Horizontal scanner light animation */}
                <div className="w-full h-[2px] bg-[#10B981] absolute top-1/2 left-0 shadow-[0_0_15px_#10B981] animate-pulse" />
              </div>

              {/* Status / Instructions overlay */}
              <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none px-4">
                <span className="bg-black/70 backdrop-blur-sm text-white font-mono text-[10px] px-3 py-1 rounded-full uppercase tracking-widest leading-none">
                  Align Barcode Inside Box
                </span>
              </div>
            </div>

            {/* Error banner */}
            {scannerError && (
              <p className="mt-4 max-w-sm text-center text-xs font-bold text-rose-400 bg-rose-950/40 p-3 rounded-2xl border border-rose-900/50">
                {scannerError}
              </p>
            )}
          </div>

          {/* LOWER OPTION TIPS */}
          <div className="text-center text-gray-400 text-[11px] leading-relaxed max-w-md mx-auto">
            <p className="font-semibold text-gray-300">💡 Mobile Tip:</p>
            <p>Hold your phone steady 4 to 8 inches away from the product package barcode label. Ensure adequate lighting on the counter shelf.</p>
          </div>

        </div>
      )}

      {/* CUSTOMER SEARCH & CREATOR DRAWER MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-gray-900">Link Khata Account</h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 font-semibold"
              >
                ✕
              </button>
            </div>

            {/* SELECTION SEARCH INPUT */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search registered khata customers..."
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* SELECTABLE CUSTOMER RAIL */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 mb-5 border-b border-gray-100 pb-3">
              {selectedCustomersFiltered.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-3">No matching khata customer profile found.</p>
              ) : (
                selectedCustomersFiltered.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => {
                      onSetActiveCustomer(c);
                      setIsCustomerModalOpen(false);
                    }}
                    className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-gray-100 hover:bg-blue-50/50 cursor-pointer transition text-xs"
                  >
                    <div>
                      <div className="font-semibold text-gray-800">{c.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{c.phone}</div>
                    </div>
                    {c.creditBalance > 0 ? (
                      <span className="font-mono font-bold text-red-650 bg-red-100/55 px-2 py-0.5 rounded text-[10px]">
                        Khata: ₹{c.creditBalance}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                        Clear
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* NEW ACCOUNT REGISTRIES CREATOR FORM */}
            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3.5 bg-[#FAF9F5] p-4 rounded-2xl border border-gray-100">
              <h4 className="font-semibold text-xs text-gray-700">Create New Counter Khata Ledger</h4>
              
              {custError && (
                <p className="text-[10px] font-bold text-red-600">{custError}</p>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Singh"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-550 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Phone Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="Format: 98********"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-550 focus:outline-none transition font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                + Register New Customer Account
              </button>
            </form>
          </div>
        </div>
      )}
            {/* FINAL CHECKOUT & DYNAMIC QR POPUP MODAL */}
      {isPaymentOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border max-h-[85vh] overflow-y-auto text-center">
            
            {checkoutSuccessState ? (
              <div className="space-y-5">
                {/* BIG CELEBRATION */}
                <div className="text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 mb-2 border border-emerald-200 shadow-sm animate-bounce">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="font-display font-extrabold text-lg text-gray-950 uppercase tracking-tight">Transaction Recorded!</h3>
                  <p className="text-[11px] text-gray-500">Bill finalized and committed to secure counter database.</p>
                </div>

                {/* DETAILS SNAPSHOT */}
                <div className="bg-slate-50 rounded-2xl border border-gray-200 p-4 divide-y divide-gray-200 text-xs space-y-2 text-left">
                  <div className="pb-2 flex justify-between">
                    <span className="font-bold text-gray-500">Bill ID:</span>
                    <span className="font-mono font-bold text-gray-800">#{checkoutSuccessState.billId.replace(/^b_/, "").substring(0, 6).toUpperCase()}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="font-bold text-gray-500">Total Bill:</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">₹{checkoutSuccessState.total.toFixed(2)}</span>
                  </div>
                  {paymentMethod === "cash" && (
                    <div className="pt-2 flex justify-between items-center text-emerald-800 font-bold">
                      <span>Change to Return:</span>
                      <span className="font-mono text-base text-emerald-605 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200">₹{checkoutSuccessState.changeAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* WHATSAPP ACTION CARD */}
                {checkoutSuccessState.whatsappUrl ? (
                  <div className="border border-green-200 bg-emerald-50/20 rounded-2xl p-4 text-left space-y-3">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-[#22C55E]" />
                      <span className="font-bold text-[#15803d] text-[10px] uppercase tracking-wider">WhatsApp Link Generated</span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase">Edit Phone Number</label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          maxLength={10}
                          defaultValue={checkoutSuccessState.phone}
                          onBlur={(e) => handleRegenerateWhatsAppLink(e.target.value)}
                          placeholder="Correct phone..."
                          className="flex-1 bg-white border border-gray-300 px-3 py-1 rounded-xl text-xs font-mono focus:ring-1 focus:ring-[#22C55E] focus:outline-none"
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleRegenerateWhatsAppLink(input.value);
                          }}
                          className="px-3 bg-white hover:bg-slate-50 text-[10px] font-bold border border-gray-300 uppercase cursor-pointer rounded-xl h-8 text-slate-700 transition"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>

                    {/* REDIRECT TRIGGER BUTTON */}
                    <a
                      href={checkoutSuccessState.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-[#22C55E] hover:bg-green-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition uppercase tracking-wider text-center"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Send via WhatsApp</span>
                      <ExternalLink className="h-3 w-3 opacity-80" />
                    </a>

                    {/* CLIPBOARD TEXT PREVIEW WITH SCROLL */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Monospace Text Preview</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(checkoutSuccessState.whatsappText);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          }}
                          className="text-[9px] text-blue-600 font-bold flex items-center gap-0.5 hover:underline"
                        >
                          {isCopied ? <Check className="h-3 w-3 text-green-600 animate-pulse" /> : <Clipboard className="h-3 w-3" />}
                          <span>{isCopied ? "Copied!" : "Copy Text"}</span>
                        </button>
                      </div>
                      <pre className="text-[9px] font-mono bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-950 max-h-24 overflow-y-auto overflow-x-hidden text-left leading-relaxed whitespace-pre-wrap">
                        {checkoutSuccessState.whatsappText}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="border border-red-200 bg-red-50/10 rounded-2xl p-3 text-left">
                    <p className="text-[10px] text-red-600 font-bold uppercase mb-1">WhatsApp Receipt Disabled</p>
                    <p className="text-[9px] text-gray-500">Enable the checkbox on Checkout to automatically send receipt links during checkout.</p>
                  </div>
                )}

                {/* BOTTOM PRIMARY CONTROL ACTION BAR */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCompleteTransactionReset}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-bold transition-all shadow hover:shadow-md uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Thermal copy</span>
                  </button>
                  <button
                    onClick={handleCompleteTransactionReset}
                    className="flex-1 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-all shadow hover:shadow-lg uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Done (Next Bill)</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              // Normal Checkout Form
              <>
                <div className="flex justify-between items-center border-b border-gray-55 pb-3 mb-4">
                  <h3 className="font-display font-bold text-base text-gray-950">Receive Counter Payment</h3>
                  <button
                    onClick={() => setIsPaymentOpen(false)}
                    className="text-gray-400 hover:text-gray-700 font-semibold"
                  >
                    ✕
                  </button>
                </div>

                {billError && (
                  <p className="mb-4 text-xs font-bold text-red-650 bg-red-50 p-2.5 rounded-lg border border-red-100">{billError}</p>
                )}

                {/* TOTAL PAYABLE RECTANGLE */}
                <div className="bg-[#FAF9F5] border border-gray-100 rounded-2xl p-4 mb-4">
                  <span className="text-[10px] font-semibold-wider text-gray-400 uppercase tracking-widest block">GRAND BILL OUT</span>
                  <span className="font-mono font-bold text-2xl text-emerald-700">₹{finalDiscountedTotal.toFixed(2)}</span>
                </div>

                {/* THREE LARGE PAYMENT CHOICES */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-3.5 px-2 border rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition ${
                      paymentMethod === "cash"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-inner"
                        : "border-gray-200 hover:bg-slate-50 text-gray-600"
                    }`}
                  >
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    <span>Cash Pool</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`py-3.5 px-2 border rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition ${
                      paymentMethod === "upi"
                        ? "bg-[#EFF6FF] border-blue-500 text-blue-800 shadow-inner"
                        : "border-gray-200 hover:bg-slate-50 text-gray-600"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <span>UPI QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("credit")}
                    className={`py-3.5 px-2 border rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition ${
                      paymentMethod === "credit"
                        ? "bg-red-50 border-red-500 text-red-800 shadow-inner"
                        : "border-gray-200 hover:bg-slate-50 text-gray-600"
                    }`}
                    title="Save as debt inside customer khata ledger"
                  >
                    <Scale className="h-5 w-5 text-red-600" />
                    <span>Credit (Khata)</span>
                  </button>
                </div>

                {/* DYNAMIC FORMS ACCORDING TO PAYMENT CHOSEN */}
                {paymentMethod === "cash" && (
                  <div className="space-y-3.5 mb-5 text-left bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100">
                    <label className="block text-[10px] font-semibold text-emerald-800 uppercase">Cash Amount Received</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2 font-bold text-gray-500 text-sm">₹</span>
                      <input
                        type="number"
                        placeholder="Enter cash given by buyer..."
                        value={receivedCash}
                        onChange={(e) => setReceivedCash(e.target.value)}
                        className="w-full font-mono text-sm pl-7 pr-3 py-1.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    {receivedCash && parseFloat(receivedCash) >= finalDiscountedTotal && (
                      <div className="text-xs bg-emerald-500 text-white p-2 rounded-xl text-center font-bold">
                        Balance Change to Return: ₹{(parseFloat(receivedCash) - finalDiscountedTotal).toFixed(0)}
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "upi" && (
                  <div className="mb-5 bg-blue-50/20 border border-blue-105 rounded-2xl p-4">
                    <span className="text-[9px] font-bold text-blue-700 uppercase tracking-widest block mb-2">Live Dynamic QR Scanner</span>
                    
                    {/* Dynamically generates accurate India UPI pay links */}
                    <div className="bg-white inline-block p-1.5 rounded-lg border border-gray-100 shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          `upi://pay?pa=${activeStore.upiId || "rameshstore@okaxis"}&pn=${encodeURIComponent(
                            activeStore.name
                          )}&am=${finalDiscountedTotal}&cu=INR`
                        )}`}
                        style={{ width: "120px", height: "120px", margin: "0 auto" }}
                        alt="Scan UPI Bill"
                      />
                    </div>

                    <p className="font-mono text-[9px] text-gray-500 mt-2.5">
                      pa: <strong className="text-gray-800">{activeStore.upiId}</strong> <br/>
                      invoice total: <strong className="text-gray-800">₹{finalDiscountedTotal}</strong>
                    </p>
                    <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded mt-3 inline-block">
                      Aura Safe Merchant Payment
                    </span>
                  </div>
                )}

                {paymentMethod === "credit" && (
                  <div className="mb-5 bg-red-50/20 border border-red-105 rounded-2xl p-4 text-left space-y-2.5">
                    <span className="text-[9px] font-bold text-red-700 uppercase tracking-widest block">Khata Debitor Profile linked</span>
                    {activeCustomer ? (
                      <div className="text-xs">
                        <p className="font-bold text-gray-800">{activeCustomer.name}</p>
                        <p className="font-mono text-gray-500">{activeCustomer.phone}</p>
                        <p className="mt-1 text-gray-600">
                          New Khata Balance: <strong className="text-red-650 font-bold">₹{(activeCustomer.creditBalance + finalDiscountedTotal).toLocaleString()}</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-red-600 font-semibold bg-white p-2.5 rounded-xl border border-red-200">
                        Warning: Link customer ledger first using the "+ Customer button" before saving on credit!
                      </div>
                    )}
                  </div>
                )}

                {/* WHATSAPP DIGITAL RECEIPT CONFIGURATION */}
                <div className="mt-4 pt-4 border-t border-gray-100 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                      <span>WhatsApp Receipt Option</span>
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWhatsappEnabled}
                        onChange={(e) => setIsWhatsappEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#22C55E]"></div>
                    </label>
                  </div>

                  {isWhatsappEnabled && (
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-gray-200">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">Customer WhatsApp Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-gray-400 h-3 w-3" />
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="10-digit WhatsApp number"
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ""))}
                          className="w-full bg-white border border-gray-300 pl-8 pr-3 py-1.5 rounded-xl font-mono text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none focus:border-blue-650"
                        />
                      </div>
                      <p className="text-[9px] text-[#2563EB] font-bold leading-normal">
                        {activeCustomer ? "✓ Autofilled from linked customer profile" : "Type manual customer phone to automatically share monospace receipt link."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 mt-5">
                  <button
                    onClick={() => setIsPaymentOpen(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 hover:bg-gray-50 rounded-2xl text-xs font-semibold text-gray-600 transition"
                  >
                    Back to Cart
                  </button>
                  <button
                    onClick={handleFinalCheckoutSubmit}
                    disabled={isSubmitting || (paymentMethod === "credit" && !activeCustomer)}
                    className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg disabled:bg-gray-200 disabled:text-gray-400 transition"
                  >
                    {isSubmitting ? "Generating Receipt..." : "CONFIRM COUNTER TRANSACTION"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
