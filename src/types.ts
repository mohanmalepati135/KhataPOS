export interface AppStore {
  _id: string;
  name: string;
  ownerUserId: string;
  gstEnabled: boolean;
  gstin?: string;
  upiId: string;
  createdAt: string;
}

export interface AppUser {
  _id: string;
  storeId: string;
  name: string;
  phone: string;
  role: "owner" | "cashier";
  pinHash?: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  unitType: "piece" | "kg";
  price: number; // selling price per unit
  costPrice: number;
  discount: number; // discount amount on item (in Rupees)
  taxRate: number; // percentage
  category: string;
}

export interface PrinterState {
  isPaired: boolean;
  deviceName: string;
}

export interface ScaleState {
  isConnected: boolean;
  currentWeight: number; // in kg
}
