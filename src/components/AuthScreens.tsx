import React, { useState } from "react";
import { Phone, Lock, Store, User, ArrowRight, ShieldCheck, KeyRound, WifiOff } from "lucide-react";
import { AppStore, AppUser } from "../types";

interface AuthScreensProps {
  onAuthSuccess: (user: AppUser, store: AppStore, token: string) => void;
  isOfflineMode: boolean;
}

export default function AuthScreens({ onAuthSuccess, isOfflineMode }: AuthScreensProps) {
  const [activeTab, setActiveTab] = useState<"owner" | "cashier">("owner");
  
  // Owner Login State
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "onboarding">("phone");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Cashier Login State
  const [storeCode, setStoreCode] = useState("s1");
  const [cashierPin, setCashierPin] = useState("");

  // Onboarding State
  const [tempUserId, setTempUserId] = useState("");
  const [onboardStoreId, setOnboardStoreId] = useState("");
  const [onboardStoreName, setOnboardStoreName] = useState("");
  const [onboardUpiId, setOnboardUpiId] = useState("");
  const [onboardGstEnabled, setOnboardGstEnabled] = useState(false);
  const [onboardGstin, setOnboardGstin] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setAuthError("Enter a valid 10-digit mobile number.");
      return;
    }

    setAuthError("");
    setIsLoading(true);

    try {
      if (isOfflineMode) {
        // Offline auth bypass
        const offlineOtp = "123456";
        setDevOtpHint(offlineOtp);
        setStep("otp");
      } else {
        const res = await fetch("/api/auth/owner/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (res.ok) {
          setDevOtpHint(data.otp);
          setStep("otp");
        } else {
          setAuthError(data.error || "Failed to trigger OTP.");
        }
      }
    } catch (err) {
      // Network failure triggers offline developer bypass
      console.warn("OTP Network failed, using offline developer fallback code '123456'");
      setDevOtpHint("123456");
      setStep("otp");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setAuthError("Enter the 6-digit OTP code.");
      return;
    }

    setAuthError("");
    setIsLoading(true);

    try {
      if (isOfflineMode) {
        // Offline success mock
        const sampleUser: AppUser = {
          _id: "u_offline",
          storeId: "s_offline",
          name: ownerName || "Offline Proprietor",
          phone: phone,
          role: "owner",
          createdAt: new Date().toISOString(),
        };
        const sampleStore: AppStore = {
          _id: "s_offline",
          name: "", // Goes to onboarding
          ownerUserId: "u_offline",
          gstEnabled: false,
          upiId: "",
          createdAt: new Date().toISOString(),
        };
        setOnboardStoreId("s_offline");
        setTempUserId("u_offline");
        setStep("onboarding");
      } else {
        const res = await fetch("/api/auth/owner/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, otp, name: ownerName }),
        });
        const data = await res.json();
        if (res.ok) {
          if (!data.store.name) {
            // New store needs onboarding
            setOnboardStoreId(data.store._id);
            setTempUserId(data.user._id);
            setStep("onboarding");
          } else {
            onAuthSuccess(data.user, data.store, data.token);
          }
        } else {
          setAuthError(data.error || "Incorrect OTP code. Try again.");
        }
      }
    } catch (err) {
      setAuthError("Failed to connect to authentication servers.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardStoreName.trim()) {
      setAuthError("Store name is required.");
      return;
    }

    setAuthError("");
    setIsLoading(true);

    const payload = {
      storeId: onboardStoreId,
      storeName: onboardStoreName,
      ownerName: ownerName || "Shop Owner",
      upiId: onboardUpiId,
      gstEnabled: onboardGstEnabled,
      gstin: onboardGstEnabled ? onboardGstin : undefined,
    };

    try {
      if (isOfflineMode) {
        const finishedStore: AppStore = {
          _id: onboardStoreId,
          name: onboardStoreName,
          ownerUserId: tempUserId,
          gstEnabled: onboardGstEnabled,
          gstin: onboardGstEnabled ? onboardGstin : undefined,
          upiId: onboardUpiId,
          createdAt: new Date().toISOString(),
        };
        const finishedUser: AppUser = {
          _id: tempUserId,
          storeId: onboardStoreId,
          name: ownerName || "Offline Proprietor",
          phone: phone,
          role: "owner",
          createdAt: new Date().toISOString(),
        };
        onAuthSuccess(finishedUser, finishedStore, `offline-token-${tempUserId}`);
      } else {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          const finishedUser: AppUser = {
            _id: tempUserId,
            storeId: onboardStoreId,
            name: ownerName || "Shop Owner",
            phone: phone,
            role: "owner",
            createdAt: new Date().toISOString(),
          };
          onAuthSuccess(finishedUser, data.store, `jwt-owner-${tempUserId}-${onboardStoreId}`);
        } else {
          setAuthError(data.error || "Failed to finalize onboarding parameters.");
        }
      }
    } catch (err) {
      setAuthError("Onboarding server error. Check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeCode.trim() || !cashierPin) {
      setAuthError("Store Code and 4-digit PIN are required.");
      return;
    }

    setAuthError("");
    setIsLoading(true);

    try {
      if (isOfflineMode) {
        // Offline cashier bypass
        if (cashierPin === "1234") {
          const mockStore: AppStore = {
            _id: "s1",
            name: "Ramesh Kirana & General Store",
            ownerUserId: "u1",
            gstEnabled: true,
            upiId: "rameshstore@okaxis",
            createdAt: new Date().toISOString(),
          };
          const mockUser: AppUser = {
            _id: "u2",
            storeId: "s1",
            name: "Sunil Kumar",
            phone: "8888888888",
            role: "cashier",
            createdAt: new Date().toISOString(),
          };
          onAuthSuccess(mockUser, mockStore, "offline-cashier-token");
        } else {
          setAuthError("Invalid offline cashier PIN. Try '1234'.");
        }
      } else {
        const res = await fetch("/api/auth/cashier/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeCode, pin: cashierPin }),
        });
        const data = await res.json();
        if (res.ok) {
          onAuthSuccess(data.user, data.store, data.token);
        } else {
          setAuthError(data.error || "Invalid Store Code or Cashier PIN.");
        }
      }
    } catch (err) {
      setAuthError("Unable to connect to cashier login server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F6] p-4 font-sans text-gray-800 selection:bg-emerald-100">
      
      {/* CARD BOARD BOX */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        
        {/* TOP INTRO BANNER */}
        <div className="px-8 pt-8 pb-6 bg-[#FAF9F5] border-b border-gray-50 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-display font-bold text-lg shadow-sm">
              K
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-gray-900">Khata<span className="text-emerald-600">POS</span></span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed max-w-[280px] mx-auto">
            Billing, stock, and customer credit — all from one counter app.
          </p>
        </div>

        <div className="p-8">
          {/* TAB CHOOOSER */}
          {step === "phone" && (
            <div className="flex bg-[#F3F4F1] p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("owner");
                  setAuthError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "owner" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Owner Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("cashier");
                  setAuthError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "cashier" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Cashier Counter
              </button>
            </div>
          )}

          {authError && (
            <div className="mb-4 rounded-xl bg-red-50 text-red-600 border border-red-100 p-3 text-xs font-medium">
              {authError}
            </div>
          )}

          {step === "phone" && activeTab === "owner" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Proprietor Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter owner full name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition font-mono tracking-wider"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 font-semibold text-sm transition shadow-md flex items-center justify-center gap-1 hover:shadow-lg disabled:bg-gray-200"
              >
                <span>{isLoading ? "Generating..." : "Get OTP Code"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === "phone" && activeTab === "cashier" && (
            <form onSubmit={handleCashierLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Store Code</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Store ID / Code (e.g. s1)"
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Default test store code is: <strong className="font-mono text-gray-500">s1</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Cashier PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="Enter 4-Digit PIN"
                    value={cashierPin}
                    onChange={(e) => setCashierPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono tracking-widest text-lg"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Default test cashier PIN is: <strong className="font-mono text-gray-500">1234</strong></p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 font-semibold text-sm transition shadow-md flex items-center justify-center gap-1 hover:shadow-lg disabled:bg-gray-200"
              >
                <span>{isLoading ? "Unlocking Counter..." : "Counter PIN Login"}</span>
                <KeyRound className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-xs text-gray-500">
                  Verification OTP code sent to <strong className="font-mono text-gray-700">{phone}</strong>.
                </p>
              </div>

              {devOtpHint && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-xs text-blue-800 font-semibold mb-1">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span>Auto OTP Code</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-blue-900 tracking-widest">
                    {devOtpHint}
                  </p>
                  <p className="text-[9px] text-blue-600">Simulating active SMS line. Type this code in the input below.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">One-Time PIN (OTP)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Enter 6-Digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-base font-bold font-mono tracking-widest focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="flex-1 py-3 px-4 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-600 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 font-semibold text-sm transition shadow-md hover:shadow-lg disabled:bg-gray-200"
                >
                  {isLoading ? "Verifying..." : "Verify & Log In"}
                </button>
              </div>
            </form>
          )}

          {step === "onboarding" && (
            <form onSubmit={handleCompleteOnboarding} className="space-y-4 animate-fade-in">
              <div className="text-center pb-2 border-b border-gray-100 mb-2">
                <h4 className="font-display font-semibold text-base text-gray-800">Complete Store Setup</h4>
                <p className="text-[11px] text-gray-500 mt-1">Configure your kirana billing environment</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Store name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kirana & General Store"
                  value={onboardStoreName}
                  onChange={(e) => setOnboardStoreName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">UPI ID (For Scan Payments)</label>
                <input
                  type="text"
                  placeholder="e.g. storename@okaxis"
                  value={onboardUpiId}
                  onChange={(e) => setOnboardUpiId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">Generates unique dynamic pay-stick QR on receipts</p>
              </div>

              {/* GST TOGGLE */}
              <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Calculate GST Taxes</span>
                  <input
                    type="checkbox"
                    checked={onboardGstEnabled}
                    onChange={(e) => setOnboardGstEnabled(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                </div>
                {onboardGstEnabled && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">GSTIN Number</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="GSTIN - e.g. 27AAAAA1111A1Z1"
                      value={onboardGstin}
                      onChange={(e) => setOnboardGstin(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition font-mono uppercase"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 font-semibold text-sm transition shadow-md flex items-center justify-center gap-1.5 hover:shadow-lg disabled:bg-gray-200"
              >
                <span>Launch Counter Desk</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
