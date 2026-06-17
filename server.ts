import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface Store {
  _id: string;
  name: string;
  ownerUserId: string;
  gstEnabled: boolean;
  gstin?: string;
  upiId: string;
  createdAt: string;
}

interface User {
  _id: string;
  storeId: string;
  name: string;
  phone: string;
  role: "owner" | "cashier";
  pinHash?: string; // 4-digit PIN
  createdAt: string;
}

interface Product {
  _id: string;
  storeId: string;
  name: string;
  barcode: string;
  category: string;
  unitType: "piece" | "kg";
  price: number;
  costPrice: number;
  hsnCode?: string;
  taxRate: number; // percentage
  stockQty: number;
  lowStockThreshold: number;
  imageUrl?: string;
  createdAt: string;
}

interface Customer {
  _id: string;
  storeId: string;
  name: string;
  phone: string;
  creditBalance: number;
  createdAt: string;
}

interface BillItem {
  productId: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage or fixed
  lineTotal: number;
}

interface Bill {
  _id: string;
  storeId: string;
  customerId: string | null;
  staffUserId: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  total: number;
  paymentMethod: "cash" | "upi" | "credit";
  status: "completed" | "voided";
  createdAt: string;
}

interface CreditLedgerEntry {
  _id: string;
  storeId: string;
  customerId: string;
  billId: string | null;
  amount: number; // negative for payment, positive for credit
  note: string;
  createdAt: string;
}

const DB_FILE_PATH = path.join(process.cwd(), "db_store.json");

function loadDb() {
  if (!fs.existsSync(DB_FILE_PATH)) {
    const defaultData = {
      stores: [] as Store[],
      users: [] as User[],
      products: [
        {
          _id: "p1",
          storeId: "s1",
          name: "Fortune Mustard Oil 1L",
          barcode: "8906007281014",
          category: "Grocery",
          unitType: "piece",
          price: 175,
          costPrice: 155,
          hsnCode: "1507",
          taxRate: 5,
          stockQty: 45,
          lowStockThreshold: 10,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "p2",
          storeId: "s1",
          name: "Ashirvaad Shudh Chakki Atta 5kg",
          barcode: "8901725181223",
          category: "Grocery",
          unitType: "piece",
          price: 260,
          costPrice: 230,
          hsnCode: "1101",
          taxRate: 0,
          stockQty: 8,
          lowStockThreshold: 10, // low stock!
          createdAt: new Date().toISOString(),
        },
        {
          _id: "p3",
          storeId: "s1",
          name: "Tata Salt 1kg",
          barcode: "8901058002313",
          category: "Grocery",
          unitType: "piece",
          price: 28,
          costPrice: 24,
          hsnCode: "2501",
          taxRate: 0,
          stockQty: 120,
          lowStockThreshold: 20,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "p4",
          storeId: "s1",
          name: "Maggi 2-Min Noodles 70g",
          barcode: "8901058895694",
          category: "Snacks",
          unitType: "piece",
          price: 14,
          costPrice: 12,
          hsnCode: "1902",
          taxRate: 18,
          stockQty: 250,
          lowStockThreshold: 30,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "p5",
          storeId: "s1",
          name: "Loose Basmati Rice (Premium)",
          barcode: "rice_loose",
          category: "Grocery",
          unitType: "kg",
          price: 90,
          costPrice: 75,
          hsnCode: "1006",
          taxRate: 0,
          stockQty: 150.5,
          lowStockThreshold: 50,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "p6",
          storeId: "s1",
          name: "Loose Potatoes (Agra)",
          barcode: "potato_loose",
          category: "Vegetables",
          unitType: "kg",
          price: 30,
          costPrice: 20,
          hsnCode: "0701",
          taxRate: 0,
          stockQty: 80,
          lowStockThreshold: 20,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "p7",
          storeId: "s1",
          name: "Dettol Liquid Handwash 200ml Refill",
          barcode: "8901396323214",
          category: "Hygiene",
          unitType: "piece",
          price: 99,
          costPrice: 85,
          hsnCode: "3401",
          taxRate: 18,
          stockQty: 4,
          lowStockThreshold: 8, // low stock!
          createdAt: new Date().toISOString(),
        },
      ] as Product[],
      customers: [
        {
          _id: "c1",
          storeId: "s1",
          name: "Rajesh Kumar",
          phone: "9876543210",
          creditBalance: 3200,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "c2",
          storeId: "s1",
          name: "Meena Sharma",
          phone: "9812345678",
          creditBalance: 850,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "c3",
          storeId: "s1",
          name: "Amit Patel",
          phone: "9425012345",
          creditBalance: 0,
          createdAt: new Date().toISOString(),
        },
      ] as Customer[],
      bills: [] as Bill[],
      creditLedger: [
        {
          _id: "l1",
          storeId: "s1",
          customerId: "c1",
          billId: null,
          amount: 3200,
          note: "Opening Balance / Previous purchases",
          createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        },
        {
          _id: "l2",
          storeId: "s1",
          customerId: "c2",
          billId: null,
          amount: 850,
          note: "Purchased weekly grocery on credit",
          createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        },
      ] as CreditLedgerEntry[],
      otps: {} as Record<string, string>, // phone -> otp
    };

    // Default owner user
    const defaultOwner: User = {
      _id: "u1",
      storeId: "s1",
      name: "Ramesh Kirana Owner",
      phone: "9999999999",
      role: "owner",
      createdAt: new Date().toISOString(),
    };

    // Default cashier user
    const defaultCashier: User = {
      _id: "u2",
      storeId: "s1",
      name: "Sunil Kumar",
      phone: "8888888888",
      role: "cashier",
      pinHash: "1234", // store code is 's1' or store pin is '1234'
      createdAt: new Date().toISOString(),
    };

    const defaultStore: Store = {
      _id: "s1",
      name: "Ramesh Kirana & General Store",
      ownerUserId: "u1",
      gstEnabled: true,
      gstin: "27AAAAA1111A1Z1",
      upiId: "rameshstore@okaxis",
      createdAt: new Date().toISOString(),
    };

    defaultData.stores.push(defaultStore);
    defaultData.users.push(defaultOwner);
    defaultData.users.push(defaultCashier);

    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE_PATH, "utf-8"));
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Load database state
  const db = loadDb();

  // AUTH ENDPOINTS
  // 1. Owner requests OTP
  app.post("/api/auth/owner/otp", (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: "Phone number is required." });
      return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits OTP
    const data = loadDb();
    if (!data.otps) data.otps = {};
    data.otps[phone] = otp;
    saveDb(data);

    console.log(`[AUTH] Custom OTP generated for phone ${phone}: ${otp}`);

    res.json({
      success: true,
      message: `OTP sent successfully. (DEVELOPMENT ONLY: Use OTP code ${otp})`,
      otp, // we send the OTP code in response also so browser has active fallback if needed
    });
  });

  // 2. Owner verifies OTP
  app.post("/api/auth/owner/verify", (req, res) => {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: "Phone and OTP are required." });
      return;
    }

    const data = loadDb();
    if (data.otps && data.otps[phone] === otp) {
      // Find or create user
      let user = data.users.find((u: any) => u.phone === phone && u.role === "owner");
      let store = null;

      if (!user) {
        // First-time signup
        const userId = "u_" + Math.random().toString(36).substr(2, 9);
        const storeId = "s_" + Math.random().toString(36).substr(2, 9);
        user = {
          _id: userId,
          storeId: storeId,
          name: name || "Shop Owner",
          phone: phone,
          role: "owner" as const,
          createdAt: new Date().toISOString(),
        };
        data.users.push(user);

        store = {
          _id: storeId,
          name: "", // empty so onboarding triggers setup
          ownerUserId: userId,
          gstEnabled: false,
          upiId: "",
          createdAt: new Date().toISOString(),
        };
        data.stores.push(store);
      } else {
        store = data.stores.find((s: any) => s._id === user.storeId);
      }

      // Delete spent OTP
      delete data.otps[phone];
      saveDb(data);

      res.json({
        success: true,
        user: { _id: user._id, name: user.name, phone: user.phone, role: user.role, storeId: user.storeId },
        store: store,
        token: `mock-jwt-owner-${user._id}-${user.storeId}`,
      });
    } else {
      res.status(400).json({ error: "Incorrect 6-digit OTP code." });
    }
  });

  // 3. Cashier PIN Login
  app.post("/api/auth/cashier/login", (req, res) => {
    const { storeCode, pin } = req.body;
    if (!storeCode || !pin) {
      res.status(400).json({ error: "Store Code and 4-digit PIN are required." });
      return;
    }

    const data = loadDb();
    // In our simplified logic, storeCode holds the storeId (e.g., s1)
    const store = data.stores.find((s: any) => s._id.toLowerCase() === storeCode.toLowerCase() || s.name.toLowerCase().includes(storeCode.toLowerCase()));
    
    if (!store) {
      res.status(404).json({ error: "Store not found for this code." });
      return;
    }

    // Find cashier in that store
    const cashier = data.users.find(
      (u: any) => u.storeId === store._id && u.role === "cashier" && u.pinHash === pin
    );

    if (cashier) {
      res.json({
        success: true,
        user: { _id: cashier._id, name: cashier.name, phone: cashier.phone, role: cashier.role, storeId: cashier.storeId },
        store: store,
        token: `mock-jwt-cashier-${cashier._id}-${cashier.storeId}`,
      });
    } else {
      res.status(401).json({ error: "Invalid PIN for this store cashier." });
    }
  });

  // 4. Onboarding Complete
  app.post("/api/onboarding", (req, res) => {
    const { storeId, storeName, ownerName, upiId, gstEnabled, gstin } = req.body;
    if (!storeId || !storeName) {
      res.status(400).json({ error: "Store ID and Store Name are required" });
      return;
    }

    const data = loadDb();
    const storeIndex = data.stores.findIndex((s: any) => s._id === storeId);
    if (storeIndex > -1) {
      data.stores[storeIndex].name = storeName;
      data.stores[storeIndex].upiId = upiId || "";
      data.stores[storeIndex].gstEnabled = gstEnabled || false;
      if (gstEnabled && gstin) {
        data.stores[storeIndex].gstin = gstin;
      }
      
      // Update owner user name if provided
      const ownerUser = data.users.find((u: any) => u.storeId === storeId && u.role === "owner");
      if (ownerUser && ownerName) {
        ownerUser.name = ownerName;
      }

      // Automatically check/create a default Cashier PIN "1234" for this store so cashier login is immediately usable!
      const existingCashier = data.users.find((u: any) => u.storeId === storeId && u.role === "cashier");
      if (!existingCashier) {
        data.users.push({
          _id: "u_c_" + Math.random().toString(36).substr(2, 9),
          storeId: storeId,
          name: "Standard Cashier",
          phone: ownerUser ? ownerUser.phone : "",
          role: "cashier",
          pinHash: "1234",
          createdAt: new Date().toISOString(),
        });
      }

      saveDb(data);
      res.json({ success: true, store: data.stores[storeIndex] });
    } else {
      res.status(404).json({ error: "Store setup not found. Please log in first." });
    }
  });

  // PRODUCTS CRUD
  app.get("/api/products", (req, res) => {
    const storeId = (req.query.storeId as string) || "s1";
    const data = loadDb();
    const list = data.products.filter((p: any) => p.storeId === storeId);
    res.json(list);
  });

  app.get("/api/products/barcode/:code", (req, res) => {
    const storeId = (req.query.storeId as string) || "s1";
    const { code } = req.params;
    const data = loadDb();
    const product = data.products.find((p: any) => p.storeId === storeId && p.barcode === code);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: "Product not found with this barcode." });
    }
  });

  app.post("/api/products", (req, res) => {
    const { storeId, name, barcode, category, unitType, price, costPrice, hsnCode, taxRate, stockQty, lowStockThreshold, imageUrl } = req.body;
    if (!storeId || !name || !price) {
      res.status(400).json({ error: "StoreId, Name and Selling Price are required." });
      return;
    }

    const data = loadDb();
    const newProduct: Product = {
      _id: "p_" + Math.random().toString(36).substr(2, 9),
      storeId,
      name,
      barcode: barcode || "bar_" + Math.random().toString(36).substr(2, 9),
      category: category || "General",
      unitType: unitType || "piece",
      price: Number(price),
      costPrice: Number(costPrice || price * 0.8),
      hsnCode: hsnCode || "",
      taxRate: Number(taxRate || 0),
      stockQty: Number(stockQty || 0),
      lowStockThreshold: Number(lowStockThreshold || 5),
      imageUrl: imageUrl || "",
      createdAt: new Date().toISOString(),
    };

    data.products.push(newProduct);
    saveDb(data);
    res.json(newProduct);
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, barcode, category, unitType, price, costPrice, hsnCode, taxRate, stockQty, lowStockThreshold, imageUrl } = req.body;

    const data = loadDb();
    const idx = data.products.findIndex((p: any) => p._id === id);
    if (idx > -1) {
      data.products[idx] = {
        ...data.products[idx],
        name: name !== undefined ? name : data.products[idx].name,
        barcode: barcode !== undefined ? barcode : data.products[idx].barcode,
        category: category !== undefined ? category : data.products[idx].category,
        unitType: unitType !== undefined ? unitType : data.products[idx].unitType,
        price: price !== undefined ? Number(price) : data.products[idx].price,
        costPrice: costPrice !== undefined ? Number(costPrice) : data.products[idx].costPrice,
        hsnCode: hsnCode !== undefined ? hsnCode : data.products[idx].hsnCode,
        taxRate: taxRate !== undefined ? Number(taxRate) : data.products[idx].taxRate,
        stockQty: stockQty !== undefined ? Number(stockQty) : data.products[idx].stockQty,
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : data.products[idx].lowStockThreshold,
        imageUrl: imageUrl !== undefined ? imageUrl : data.products[idx].imageUrl,
      };
      saveDb(data);
      res.json(data.products[idx]);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  });

  // CUSTOMERS & LEDGER CRUD
  app.get("/api/customers", (req, res) => {
    const storeId = (req.query.storeId as string) || "s1";
    const data = loadDb();
    const list = data.customers.filter((c: any) => c.storeId === storeId);
    res.json(list);
  });

  app.post("/api/customers", (req, res) => {
    const { storeId, name, phone, creditBalance } = req.body;
    if (!storeId || !name || !phone) {
      res.status(400).json({ error: "StoreId, customer Name and Phone are required." });
      return;
    }
    const data = loadDb();
    // Check if phone already registered in this store
    const existing = data.customers.find((c: any) => c.storeId === storeId && c.phone === phone);
    if (existing) {
      res.status(400).json({ error: "Customer with this phone already exists." });
      return;
    }

    const newCustomer: Customer = {
      _id: "c_" + Math.random().toString(36).substr(2, 9),
      storeId,
      name,
      phone,
      creditBalance: Number(creditBalance || 0),
      createdAt: new Date().toISOString(),
    };

    data.customers.push(newCustomer);

    if (newCustomer.creditBalance > 0) {
      data.creditLedger.push({
        _id: "cl_" + Math.random().toString(36).substr(2, 9),
        storeId,
        customerId: newCustomer._id,
        billId: null,
        amount: newCustomer.creditBalance,
        note: "Opening Credit Balance",
        createdAt: new Date().toISOString(),
      });
    }

    saveDb(data);
    res.json(newCustomer);
  });

  app.get("/api/customers/:id/ledger", (req, res) => {
    const { id } = req.params;
    const data = loadDb();
    const ledger = data.creditLedger.filter((l: any) => l.customerId === id);
    res.json(ledger);
  });

  // Customer settlement payment
  app.post("/api/customers/:id/payment", (req, res) => {
    const { id } = req.params;
    const { amount, note, storeId } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Valid positive payment amount is required." });
      return;
    }

    const data = loadDb();
    const custIdx = data.customers.findIndex((c: any) => c._id === id);
    if (custIdx > -1) {
      const activeStoreId = storeId || data.customers[custIdx].storeId;
      data.customers[custIdx].creditBalance = Math.max(0, data.customers[custIdx].creditBalance - Number(amount));

      const ledgerEntry: CreditLedgerEntry = {
        _id: "cl_" + Math.random().toString(36).substr(2, 9),
        storeId: activeStoreId,
        customerId: id,
        billId: null,
        amount: -Number(amount), // Negative signifies customer payment/received
        note: note || "Cash payment received at counter",
        createdAt: new Date().toISOString(),
      };

      data.creditLedger.push(ledgerEntry);
      saveDb(data);
      res.json({ customer: data.customers[custIdx], entry: ledgerEntry });
    } else {
      res.status(404).json({ error: "Customer not found" });
    }
  });

  // BILLS ENDPOINTS
  app.get("/api/bills", (req, res) => {
    const storeId = (req.query.storeId as string) || "s1";
    const data = loadDb();
    const filtered = data.bills.filter((b: any) => b.storeId === storeId);
    res.json(filtered);
  });

  app.post("/api/bills", (req, res) => {
    const { storeId, customerId, staffUserId, items, subtotal, discount, taxTotal, total, paymentMethod } = req.body;
    if (!storeId || !items || items.length === 0 || !total) {
      res.status(400).json({ error: "Store ID, billing items, and total amount are required." });
      return;
    }

    const data = loadDb();

    // Create unique bill ID
    const billId = "b_" + Math.random().toString(36).substr(2, 9);
    const newBill: Bill = {
      _id: billId,
      storeId,
      customerId: customerId || null,
      staffUserId: staffUserId || "u1",
      items,
      subtotal: Number(subtotal),
      discount: Number(discount),
      taxTotal: Number(taxTotal),
      total: Number(total),
      paymentMethod,
      status: "completed",
      createdAt: new Date().toISOString(),
    };

    // 1. Deduct Stock for each product
    newBill.items.forEach((item: any) => {
      const dbProduct = data.products.find((p: any) => p._id === item.productId && p.storeId === storeId);
      if (dbProduct) {
        dbProduct.stockQty = Math.max(0, dbProduct.stockQty - item.quantity);
      }
    });

    // 2. If credit (khata) payment method, adjust customer balance
    if (paymentMethod === "credit" && customerId) {
      const dbCustomer = data.customers.find((c: any) => c._id === customerId);
      if (dbCustomer) {
        dbCustomer.creditBalance += Number(total);

        // Record credit in ledger
        const ledgerEntry: CreditLedgerEntry = {
          _id: "cl_" + Math.random().toString(36).substr(2, 9),
          storeId,
          customerId,
          billId: billId,
          amount: Number(total), // Positive increases credit balance
          note: `Purchase on Credit (Bill #${billId.substring(2, 8).toUpperCase()})`,
          createdAt: new Date().toISOString(),
        };
        data.creditLedger.push(ledgerEntry);
      }
    }

    data.bills.push(newBill);
    saveDb(data);

    res.json(newBill);
  });

  // Format WhatsApp Text Receipt deep link
  app.post("/api/whatsapp/receipt", (req, res) => {
    const { phone, items, subtotal, discount, taxTotal, total, storeName, upiId, gstin, staffName, billId } = req.body;
    
    if (!phone) {
      res.status(400).json({ error: "Phone number is required." });
      return;
    }

    // Clean Phone Number: remove non-numeric
    let cleanedPhone = phone.replace(/\D/g, "");
    if (cleanedPhone.length === 10) {
      cleanedPhone = "91" + cleanedPhone; // assume India code by default
    }

    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const timeStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const displayBillId = billId ? billId.replace(/^b_/, "").substring(0, 6).toUpperCase() : `RET_${Math.floor(1000 + Math.random() * 9000)}`;

    // Build beautiful formatted WhatsApp text with monospace item alignment blocks
    let text = `🧾 *RECEIPT FROM ${storeName.toUpperCase()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*Date:* ${dateStr} ${timeStr}\n`;
    text += `*Bill ID:* #${displayBillId}\n`;
    text += `*Staff:* ${staffName}\n`;
    if (gstin) {
      text += `*GSTIN:* ${gstin}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `*ITEMS PURCHASED:*\n`;
    text += `\`\`\`\n`;
    
    // Add items list in monospaced format for perfect columnar alignment
    let itemsBlock = "";
    if (items && Array.isArray(items)) {
      items.forEach((item: any) => {
        const name = item.nameSnapshot || item.name || "Item";
        const displayItemName = name.length > 15 ? name.substring(0, 14) + "…" : name;
        const qtyStr = `${item.quantity}${item.unitType === "kg" ? "kg" : "pc"}`;
        const priceStr = `₹${Math.round(item.unitPrice || item.price)}`;
        const totalStr = `₹${Math.round(item.lineTotal || ((item.price - (item.discount || 0)) * item.quantity))}`;

        // Format aligned columns: Description (16 chars), Qty/Price (11 chars), Total (7 chars)
        const col1 = displayItemName.padEnd(16, " ");
        const col2 = `${qtyStr}x${priceStr}`.padStart(11, " ");
        const col3 = totalStr.padStart(7, " ");
        itemsBlock += `${col1} ${col2} ${col3}\n`;
      });
    }
    
    text += itemsBlock;
    text += `\`\`\`\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    
    // Summary
    text += `*Subtotal:*     ₹${Number(subtotal).toFixed(2)}\n`;
    if (Number(discount) > 0) {
      text += `*Discount:*    -₹${Number(discount).toFixed(2)}\n`;
    }
    if (Number(taxTotal) > 0) {
      text += `*GST Tax:*     ₹${Number(taxTotal).toFixed(2)}\n`;
    }
    text += `*GRAND TOTAL:*  *₹${Number(total).toFixed(2)}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (upiId && Number(total) > 0) {
      const upiPayUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${total}&cu=INR`;
      text += `📲 *Pay online using UPI:* ${upiPayUrl}\n\n`;
    }

    text += `✨ Thank you for shopping with us! ✨\n`;
    text += `_Powered by KhataPOS_`;

    // Construct WhatsApp Deep Link URL
    const url = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(text)}`;

    console.log(`[WHATSAPP RECEIPT] Formulated deep-link for ${cleanedPhone} total ₹${total}`);

    res.json({
      success: true,
      phone: cleanedPhone,
      text,
      url
    });
  });

  // Void a bill
  app.post("/api/bills/:id/void", (req, res) => {
    const { id } = req.params;
    const { staffRole } = req.body; // owner only rule check

    if (staffRole !== "owner") {
      res.status(403).json({ error: "Permission denied. Only owners can void bills." });
      return;
    }

    const data = loadDb();
    const billIdx = data.bills.findIndex((b: any) => b._id === id);
    if (billIdx > -1) {
      const bill = data.bills[billIdx];
      if (bill.status === "voided") {
        res.status(400).json({ error: "Bill is already voided." });
        return;
      }

      bill.status = "voided";

      // Revert product weights/stocks
      bill.items.forEach((item: any) => {
        const prod = data.products.find((p: any) => p._id === item.productId);
        if (prod) {
          prod.stockQty += item.quantity;
        }
      });

      // If credit, reduce credit balance and delete ledger entries associated with this bill
      if (bill.paymentMethod === "credit" && bill.customerId) {
        const cust = data.customers.find((c: any) => c._id === bill.customerId);
        if (cust) {
          cust.creditBalance = Math.max(0, cust.creditBalance - bill.total);

          // Add a compensatory ledger entry
          data.creditLedger.push({
            _id: "cl_" + Math.random().toString(36).substr(2, 9),
            storeId: bill.storeId,
            customerId: bill.customerId,
            billId: bill._id,
            amount: -Number(bill.total),
            note: `VOID Bill Compensation #${bill._id.substring(2, 8).toUpperCase()}`,
            createdAt: new Date().toISOString(),
          });
        }
      }

      saveDb(data);
      res.json({ success: true, bill });
    } else {
      res.status(404).json({ error: "Bill not found." });
    }
  });

  // DAILY REPORT API
  app.get("/api/reports/daily", (req, res) => {
    const storeId = (req.query.storeId as string) || "s1";
    const data = loadDb();
    const activeBills = data.bills.filter((b: any) => b.storeId === storeId);

    // Filter today's sales
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayBills = activeBills.filter((b: any) => {
      const billDate = new Date(b.createdAt);
      return b.status === "completed" && billDate >= startOfToday;
    });

    // Math summaries
    let cashSales = 0;
    let upiSales = 0;
    let creditSales = 0;
    let totalSales = 0;
    let mockProfit = 0;

    todayBills.forEach((b: any) => {
      totalSales += b.total;
      if (b.paymentMethod === "cash") cashSales += b.total;
      if (b.paymentMethod === "upi") upiSales += b.total;
      if (b.paymentMethod === "credit") creditSales += b.total;

      // Calculate simple margins for reports
      b.items.forEach((item: any) => {
        const prod = data.products.find((p: any) => p._id === item.productId);
        const costPrice = prod ? prod.costPrice : item.unitPrice * 0.8;
        mockProfit += (item.unitPrice - costPrice) * item.quantity;
      });
    });

    const lowStockCount = data.products.filter(
      (p: any) => p.storeId === storeId && p.stockQty <= p.lowStockThreshold
    ).length;

    // Best-selling categories
    const categoryQty: Record<string, number> = {};
    activeBills.forEach((b: any) => {
      if (b.status === "completed") {
        b.items.forEach((item: any) => {
          const prod = data.products.find((p: any) => p._id === item.productId);
          const cat = prod ? prod.category : "General";
          categoryQty[cat] = (categoryQty[cat] || 0) + item.quantity;
        });
      }
    });

    // Total outstanding credit for this store
    const storeCustomers = data.customers.filter((c: any) => c.storeId === storeId);
    const totalCreditOutstanding = storeCustomers.reduce((acc: number, c: any) => acc + c.creditBalance, 0);

    res.json({
      summary: {
        totalSales,
        cashSales,
        upiSales,
        creditSales,
        billCount: todayBills.length,
        profit: Math.round(mockProfit),
        lowStockCount,
        totalCreditOutstanding,
      },
      categoryPopularity: Object.entries(categoryQty).map(([name, value]) => ({ name, value })),
    });
  });

  // Settings Endpoints (to fetch and update upi/store details)
  app.post("/api/settings/store", (req, res) => {
    const { storeId, name, upiId, gstEnabled, gstin } = req.body;
    if (!storeId || !name) {
      res.status(400).json({ error: "Store ID and name are required." });
      return;
    }

    const data = loadDb();
    const idx = data.stores.findIndex((s: any) => s._id === storeId);
    if (idx > -1) {
      data.stores[idx].name = name;
      data.stores[idx].upiId = upiId || "";
      data.stores[idx].gstEnabled = gstEnabled || false;
      data.stores[idx].gstin = gstin || "";
      saveDb(data);
      res.json({ success: true, store: data.stores[idx] });
    } else {
      res.status(404).json({ error: "Store not found." });
    }
  });

  // SYNC ENDPOINT (batch upload offline transactions/customers/products from Dexie)
  app.post("/api/sync", (req, res) => {
    const { storeId, bills: offlineBills, customers: offlineCustomers, products: offlineProducts } = req.body;
    
    if (!storeId) {
      res.status(400).json({ error: "Store ID is required for sync operations." });
      return;
    }

    const data = loadDb();
    let syncedBillsCount = 0;
    let syncedCustCount = 0;
    let syncedProdCount = 0;

    // 1. Sync customers created offline
    if (offlineCustomers && Array.isArray(offlineCustomers)) {
      offlineCustomers.forEach((cust: any) => {
        const index = data.customers.findIndex((c: any) => c._id === cust._id);
        if (index === -1) {
          data.customers.push({
            ...cust,
            storeId,
          });
          syncedCustCount++;
        }
      });
    }

    // 2. Sync products created/updated offline
    if (offlineProducts && Array.isArray(offlineProducts)) {
      offlineProducts.forEach((prod: any) => {
        const index = data.products.findIndex((p: any) => p._id === prod._id);
        if (index === -1) {
          data.products.push({
            ...prod,
            storeId,
          });
          syncedProdCount++;
        } else {
          // Update local copy
          data.products[index] = {
            ...data.products[index],
            ...prod,
          };
          syncedProdCount++;
        }
      });
    }

    // 3. Sync bills created offline
    if (offlineBills && Array.isArray(offlineBills)) {
      offlineBills.forEach((bill: any) => {
        const index = data.bills.findIndex((b: any) => b._id === bill._id);
        if (index === -1) {
          data.bills.push({
            ...bill,
            storeId,
          });
          syncedBillsCount++;

          // Adjust backend stock for synced bills
          bill.items.forEach((item: any) => {
            const dbProduct = data.products.find((p: any) => p._id === item.productId && p.storeId === storeId);
            if (dbProduct) {
              dbProduct.stockQty = Math.max(0, dbProduct.stockQty - item.quantity);
            }
          });

          // Adjust customer credit balance on sync
          if (bill.paymentMethod === "credit" && bill.customerId) {
            const dbCustomer = data.customers.find((c: any) => c._id === bill.customerId);
            if (dbCustomer) {
              dbCustomer.creditBalance += Number(bill.total);

              // Ledger entry
              data.creditLedger.push({
                _id: "cl_" + Math.random().toString(36).substr(2, 9),
                storeId,
                customerId: bill.customerId,
                billId: bill._id,
                amount: Number(bill.total),
                note: `Credit sale sync (#${bill._id.substring(2, 8).toUpperCase()})`,
                createdAt: bill.createdAt || new Date().toISOString(),
              });
            }
          }
        }
      });
    }

    saveDb(data);

    res.json({
      success: true,
      message: "Sync completed.",
      syncedBillsCount,
      syncedCustCount,
      syncedProdCount,
      updatedDbState: {
        products: data.products.filter((p: any) => p.storeId === storeId),
        customers: data.customers.filter((c: any) => c.storeId === storeId),
        bills: data.bills.filter((b: any) => b.storeId === storeId),
      },
    });
  });

  // Integrate Vite for single-page applications fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
