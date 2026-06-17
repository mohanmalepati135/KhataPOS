import React, { useState } from "react";
import { Search, Plus, Filter, Edit, Package, AlertTriangle, Sparkles, CheckCircle, Barcode, Scale } from "lucide-react";
import { LocalProduct } from "../db";
import { AppStore } from "../types";

interface InventoryManagerProps {
  products: LocalProduct[];
  activeStore: AppStore;
  onAddNewProduct: (prod: any) => Promise<any>;
  onUpdateProduct: (id: string, prod: any) => Promise<any>;
}

export default function InventoryManager({
  products,
  activeStore,
  onAddNewProduct,
  onUpdateProduct,
}: InventoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [prodName, setProdName] = useState("");
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodCategory, setProdCategory] = useState("Grocery");
  const [prodUnitType, setProdUnitType] = useState<"piece" | "kg">("piece");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCost, setProdCost] = useState("");
  const [prodHsnCode, setProdHsnCode] = useState("");
  const [prodTaxRate, setProdTaxRate] = useState("0");
  const [prodStock, setProdStock] = useState("");
  const [prodLowThreshold, setProdLowThreshold] = useState("5");
  
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive active category list
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  // Filtering products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
    const matchesLowStock = !showLowStockOnly || p.stockQty <= p.lowStockThreshold;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleOpenAddModal = () => {
    setEditingId(null);
    setProdName("");
    setProdBarcode("");
    setProdCategory("Grocery");
    setProdUnitType("piece");
    setProdPrice("");
    setProdCost("");
    setProdHsnCode("");
    setProdTaxRate("0");
    setProdStock("");
    setProdLowThreshold("5");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: LocalProduct) => {
    setEditingId(p._id);
    setProdName(p.name);
    setProdBarcode(p.barcode);
    setProdCategory(p.category);
    setProdUnitType(p.unitType);
    setProdPrice(p.price.toString());
    setProdCost(p.costPrice.toString());
    setProdHsnCode(p.hsnCode || "");
    setProdTaxRate(p.taxRate.toString());
    setProdStock(p.stockQty.toString());
    setProdLowThreshold(p.lowStockThreshold.toString());
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice || !prodStock) {
      setFormError("Product Title, Price, and Stock level are required.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    const productPayload = {
      storeId: activeStore._id,
      name: prodName,
      barcode: prodBarcode || "BC_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      category: prodCategory || "General",
      unitType: prodUnitType,
      price: Number(prodPrice),
      costPrice: Number(prodCost || Number(prodPrice) * 0.8),
      hsnCode: prodHsnCode,
      taxRate: Number(prodTaxRate),
      stockQty: Number(prodStock),
      lowStockThreshold: Number(prodLowThreshold),
    };

    try {
      if (editingId) {
        await onUpdateProduct(editingId, productPayload);
      } else {
        await onAddNewProduct(productPayload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit product profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-gray-200 p-6 shadow-sm min-h-[calc(100vh-140px)] flex flex-col justify-between">
      
      <div>
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5 mb-5 font-sans">
          <div>
            <h2 className="font-display font-black text-lg text-gray-950 uppercase tracking-tight">Shelf Barcode stock</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage products, shelf barcodes, tax rates, and check stock-outs.</p>
          </div>
          
          <button
            onClick={handleOpenAddModal}
            className="self-start rounded-xl bg-[#2563EB] hover:bg-blue-700 font-bold px-4.5 py-2.5 text-xs text-white transition flex items-center gap-1.5 shadow-md uppercase tracking-wider cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add counter product</span>
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, category, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white focus:outline-none transition"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
              showLowStockOnly
                ? "bg-amber-100 border-amber-300 text-amber-900"
                : "border-gray-300 hover:bg-slate-50 text-gray-600 bg-white"
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Filter Low Stock Warning</span>
          </button>
        </div>

        {/* CATEGORY CHIPS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 max-w-[80vw]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 text-xs font-semibold rounded-full shrink-0 border transition-all ${
                categoryFilter === cat
                  ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm font-bold"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-gray-200 shadow-sm"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* PRODUCTS DIRECT ROWS LIST */}
        <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-gray-100 text-gray-500 font-semibold">
                <th className="p-3.5">Product Title</th>
                <th className="p-3.5">Barcode ID</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Unit Selling Price</th>
                <th className="p-3.5">Purchase Cost</th>
                <th className="p-3.5">Tax Band</th>
                <th className="p-3.5">Stock Level</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-400">
                    <Package className="h-10 w-12 text-gray-200 mx-auto mb-2" />
                    <p className="font-semibold text-gray-700 text-sm">No items matching parameters</p>
                    <p className="text-gray-400 mt-1">Configure fresh products via "+ Add Counter Product" above.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stockQty <= p.lowStockThreshold;
                  return (
                    <tr
                      key={p._id}
                      className={`border-b border-gray-50 hover:bg-slate-50/40 text-gray-800 ${
                        isLow ? "bg-amber-50/15" : ""
                      }`}
                    >
                      <td className="p-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${p.unitType === "kg" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {p.unitType === "kg" ? <Scale className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <span className="font-sans block font-semibold text-gray-900">{p.name}</span>
                            <span className="text-[10px] text-gray-400 uppercase">Unit: {p.unitType}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-gray-500">{p.barcode}</td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] uppercase font-semibold">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-gray-900">₹{p.price.toFixed(2)}</td>
                      <td className="p-3.5 font-mono text-gray-500">₹{p.costPrice.toFixed(2)}</td>
                      <td className="p-3.5 font-mono text-gray-500">
                        {p.taxRate > 0 ? `${p.taxRate}% GST` : "Tax-exempt"}
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              isLow ? "text-amber-600 font-bold" : p.stockQty === 0 ? "text-red-600 font-bold" : "text-emerald-700"
                            }`}
                          >
                            {p.stockQty} {p.unitType}
                          </span>
                          {isLow && (
                            <span className="text-[9px] bg-amber-150 text-amber-800 px-1.5 py-0.2 rounded font-bold whitespace-nowrap uppercase">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-100 hover:text-blue-600 transition"
                          title="Edit Stock Details"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h3 className="font-display font-bold text-base text-gray-950">
                {editingId ? "Update Stock Specifications" : "Register Fresh Product Line"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 font-semibold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <p className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-150">{formError}</p>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ashirvaad Multigrain Atta 5kg"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition whitespace-nowrap"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Storage Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:ring-1"
                  >
                    <option value="Grocery">Grocery / Grains</option>
                    <option value="Snacks">Snacks & Beverages</option>
                    <option value="Vegetables">Vegetables / Fruits</option>
                    <option value="Hygiene">Hygiene & Cosmetics</option>
                    <option value="Medicines">Medicines</option>
                    <option value="Stationery">Stationery</option>
                    <option value="General">General Counter Items</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Measure Unit</label>
                  <select
                    value={prodUnitType}
                    onChange={(e) => setProdUnitType(e.target.value as "piece" | "kg")}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:ring-1"
                  >
                    <option value="piece">Per Piece / Packet (Packed)</option>
                    <option value="kg">Per Kilogram (Loose Goods)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Selling Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 260"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full font-mono rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 210"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    className="w-full font-mono rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Product Barcode SKU</label>
                  <div className="relative">
                    <Barcode className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Laser Scan or autogenerate..."
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 font-mono rounded-xl border border-gray-200 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">HSN Code (GST)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1101"
                    value={prodHsnCode}
                    onChange={(e) => setProdHsnCode(e.target.value)}
                    className="w-full font-mono rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">GST Tax Rate (%)</label>
                  <select
                    value={prodTaxRate}
                    onChange={(e) => setProdTaxRate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:ring-1"
                  >
                    <option value="0">0% (GST Exempt / Basic Food)</option>
                    <option value="5">5% SGST + CGST (Oils, Spices)</option>
                    <option value="12">12% (Medicines, butter)</option>
                    <option value="18">18% (Soaps, Biscuits, Packaged snacks)</option>
                    <option value="28">28% (Luxury items)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Initial Stock Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 50"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full font-mono rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Low Stock Notification Warning Limit</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={prodLowThreshold}
                    onChange={(e) => setProdLowThreshold(e.target.value)}
                    className="w-full font-mono rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-650 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition disabled:bg-gray-200"
                >
                  {isSubmitting ? "Saving..." : editingId ? "Update Item" : "Publish Stock Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
