import React, { useState } from "react";
import { Scale, Printer, Barcode, HelpCircle, ChevronRight, Minimize2, Maximize2, ShieldAlert } from "lucide-react";
import { LocalProduct } from "../db";

interface HardwareSimulatorProps {
  products: LocalProduct[];
  onBarcodeScan: (barcode: string) => void;
  scaleWeight: number;
  onWeightChange: (weight: number) => void;
  printedReceiptHtml: string | null;
  onClearReceipt: () => void;
  isOfflineMode: boolean;
  onToggleOffline: () => void;
}

export default function HardwareSimulator({
  products,
  onBarcodeScan,
  scaleWeight,
  onWeightChange,
  printedReceiptHtml,
  onClearReceipt,
  isOfflineMode,
  onToggleOffline,
}: HardwareSimulatorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedBarcode, setSelectedBarcode] = useState("");

  const handleShootBarcode = () => {
    if (selectedBarcode) {
      onBarcodeScan(selectedBarcode);
    }
  };

  const looseProducts = products.filter((p) => p.unitType === "kg");
  const packedProducts = products.filter((p) => p.unitType === "piece");

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col rounded-[24px] border-2 border-[#1A1A1A] bg-white shadow-2xl transition-all duration-300 ${
        isOpen ? "w-80 md:w-96 max-h-[85vh]" : "w-14 h-14 items-center justify-center cursor-pointer"
      }`}
      id="hardware-simulator-root"
    >
      {/* HEADER */}
      <div
        className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-[#FAF9F5] rounded-t-[22px] cursor-pointer"
        onClick={() => !isOpen && setIsOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-[#2563EB] animate-pulse" />
          {isOpen && (
            <div>
              <h3 className="font-sans font-bold text-xs text-gray-950 uppercase tracking-wide">Kirana Counter Hardware</h3>
              <p className="font-mono text-[9px] text-[#2563EB] font-bold">Live Device Simulation Console</p>
            </div>
          )}
        </div>
        {isOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-750"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* MINIMIZED VIEW BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1A1A] text-white shadow-xl hover:bg-neutral-800 transition-all duration-200"
          title="Open Hardware Simulator"
        >
          <Scale className="h-6 w-6 text-[#22C55E] animate-pulse" />
        </button>
      )}

      {/* SIMULATOR BODY */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-gray-800">
          
          {/* NETWORKING TOGGLE: OFFLINE SIMULATION */}
          <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-medium text-xs text-amber-950">Internet & Cloud Sync</span>
                  <button
                    onClick={onToggleOffline}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isOfflineMode ? "bg-[#EF4444]" : "bg-[#22C55E]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isOfflineMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="font-mono text-[10px] text-amber-700 mt-1 leading-relaxed">
                  {isOfflineMode
                    ? "OFFLINE ACTIVE (Sync-queue holds bills, registers locally in Dexie IndexedDB)"
                    : "ONLINE ACTIVE (Sync pushes sales automatically to server db_store.json)"}
                </p>
              </div>
            </div>
          </div>

          {/* 1. MOCK BARCODE SCANNER GUN */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <Barcode className="h-4 w-4 text-emerald-600" />
              <span>1. Barcode Pistol Scanner</span>
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                value={selectedBarcode}
                onChange={(e) => setSelectedBarcode(e.target.value)}
              >
                <option value="">-- Choose item to scan --</option>
                <optgroup label="Packaged Products (Piece)">
                  {packedProducts.map((p) => (
                    <option key={p._id} value={p.barcode}>
                      {p.name} ({p.barcode.slice(0, 5)}...) - ₹{p.price}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Loose Goods (By Weight)">
                  {looseProducts.map((p) => (
                    <option key={p._id} value={p.barcode}>
                      {p.name} ({p.barcode}) - ₹{p.price}/kg
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                onClick={handleShootBarcode}
                disabled={!selectedBarcode}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 transition"
                title="Shoot laser light to register item barcode"
              >
                Scan!
              </button>
            </div>
          </div>

          {/* 2. MOCK ELECTRONIC WEIGHING SCALE */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
              <div className="flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-purple-600" />
                <span>2. Electronic weighing Scale</span>
              </div>
              <span className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                {scaleWeight.toFixed(3)} Kg
              </span>
            </div>
            <p className="text-[10px] text-gray-500 leading-snug">
              Simulate loose bags on the scale dial. Active weight automatically affects loose items added to cart.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.100"
                max="5.000"
                step="0.050"
                value={scaleWeight}
                onChange={(e) => onWeightChange(parseFloat(e.target.value))}
                className="flex-1 accent-purple-600 h-1 bg-gray-200 rounded-lg cursor-pointer"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => onWeightChange(0.25)}
                  className="bg-gray-100 hover:bg-gray-200 text-[10px] font-mono px-1.5 py-0.5 rounded text-gray-700 border"
                >
                  250g
                </button>
                <button
                  onClick={() => onWeightChange(1.0)}
                  className="bg-gray-100 hover:bg-gray-200 text-[10px] font-mono px-1.5 py-0.5 rounded text-gray-700 border"
                >
                  1kg
                </button>
                <button
                  onClick={() => onWeightChange(2.5)}
                  className="bg-gray-100 hover:bg-gray-200 text-[10px] font-mono px-1.5 py-0.5 rounded text-gray-700 border"
                >
                  2.5kg
                </button>
              </div>
            </div>
          </div>

          {/* 3. SIMULATED 58mm BLUETOOTH THERMAL PRINTER ROLL */}
          {printedReceiptHtml && (
            <div className="space-y-2 border-t border-gray-100 pt-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-1.5">
                  <Printer className="h-4 w-4 text-blue-600" />
                  <span>3. Thermal Receipt Out (58mm Roll)</span>
                </div>
                <button
                  onClick={onClearReceipt}
                  className="text-[10px] text-red-600 hover:underline"
                >
                  Discard Roll
                </button>
              </div>
              
              {/* Receipt roll styling */}
              <div className="bg-[#FAF9F5] border border-dashed border-gray-300 p-4 rounded-lg shadow-inner max-h-72 overflow-y-auto font-mono text-[11px] leading-[14px] text-gray-900 border-t-8 border-t-gray-400">
                <div dangerouslySetInnerHTML={{ __html: printedReceiptHtml }} />
                <div className="border-t border-dashed border-gray-300 my-3 pt-2 text-center text-[10px] text-gray-400 uppercase">
                  ----------- Tear Here -----------
                </div>
              </div>
            </div>
          )}

          {!printedReceiptHtml && (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
              <Printer className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p>No receipt rolling out right now.</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Finish a bill at checkout to see thermal print preview here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
