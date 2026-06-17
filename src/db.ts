import Dexie, { Table } from "dexie";

export interface LocalProduct {
  _id: string;
  storeId: string;
  name: string;
  barcode: string;
  category: string;
  unitType: "piece" | "kg";
  price: number;
  costPrice: number;
  hsnCode?: string;
  taxRate: number;
  stockQty: number;
  lowStockThreshold: number;
  imageUrl?: string;
  createdAt: string;
}

export interface LocalCustomer {
  _id: string;
  storeId: string;
  name: string;
  phone: string;
  creditBalance: number;
  createdAt: string;
}

export interface LocalBillItem {
  productId: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface LocalBill {
  _id: string;
  storeId: string;
  customerId: string | null;
  staffUserId: string;
  items: LocalBillItem[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  total: number;
  paymentMethod: "cash" | "upi" | "credit";
  status: "completed" | "voided";
  createdAt: string;
  isSynced?: number; // 0 for offline created but unsynced, 1 for synced
}

export interface LocalCreditLedger {
  _id: string;
  storeId: string;
  customerId: string;
  billId: string | null;
  amount: number;
  note: string;
  createdAt: string;
  isSynced?: number;
}

class KhataPOSDatabase extends Dexie {
  products!: Table<LocalProduct>;
  customers!: Table<LocalCustomer>;
  bills!: Table<LocalBill>;
  creditLedger!: Table<LocalCreditLedger>;

  constructor() {
    super("KhataPOS_DB");
    this.version(1).stores({
      products: "_id, storeId, barcode, category, name",
      customers: "_id, storeId, phone, name",
      bills: "_id, storeId, customerId, paymentMethod, status, isSynced",
      creditLedger: "_id, storeId, customerId, billId, isSynced",
    });
  }
}

export const localDb = new KhataPOSDatabase();

// Sync state helpers
export async function syncOfflineData(storeId: string): Promise<any> {
  try {
    const offlineBills = await localDb.bills.filter((b) => b.isSynced === 0).toArray();
    const offlineCustomers = await localDb.customers.toArray(); // Sync all customers as master list
    const offlineProducts = await localDb.products.toArray(); // Sync master list

    if (offlineBills.length === 0) {
      console.log("No pending offline bills to sync.");
    }

    const payload = {
      storeId,
      bills: offlineBills,
      customers: offlineCustomers,
      products: offlineProducts,
    };

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const result = await res.json();
    console.log("Sync Response:", result);

    if (result.success) {
      // Mark bills as synced
      const offlineBillIds = offlineBills.map((b) => b._id);
      await localDb.bills.where("_id").anyOf(offlineBillIds).modify({ isSynced: 1 });
      
      // Seed local DB with any updated data from backend
      if (result.updatedDbState) {
        const { products, customers, bills } = result.updatedDbState;
        
        if (products && products.length > 0) {
          await localDb.products.bulkPut(products);
        }
        if (customers && customers.length > 0) {
          await localDb.customers.bulkPut(customers);
        }
        // Save synced historical bills
        if (bills && bills.length > 0) {
          const processedBills = bills.map((b: any) => ({ ...b, isSynced: 1 }));
          await localDb.bills.bulkPut(processedBills);
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to sync offline data to server:", error);
    throw error;
  }
}
