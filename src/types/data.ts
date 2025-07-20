export interface ItemCategory { id: string; name: string; prefix: string; }
export interface Unit { id: string; name: string; }
export interface AssetCategory { id: string; name: string; prefix: string; }

export interface Item {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  sellingUnitId: string; // The primary unit for stock and selling price
  purchaseUnitId: string; // The unit for bulk purchases
  conversionRate: number; // How many selling units per purchase unit
  purchasePrice: number; // Price per SELLING unit (calculated)
  sellingPrice: number; // Price per SELLING unit
  description: string;
}

export interface StoreInventory {
  itemId: string;
  recordedStock: number;
}

export interface Asset {
    id: string;
    code: string;
    name: string;
    purchaseDate: string;
    value: number;
    categoryId: string;
    description: string;
    condition: 'Bagus' | 'Normal' | 'Rusak';
}

export interface OperationalCost {
    id: string;
    name: string;
    amount: number;
    frequency: 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'sekali';
    description: string;
}

export interface Investor {
  id: string;
  name: string;
  sharePercentage: number;
}

export interface CashFlowEntry {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  itemCategories: ItemCategory[];
  units: Unit[];
  assetCategories: AssetCategory[];
  items: Item[];
  inventory: StoreInventory[];
  assets: Asset[];
  costs: OperationalCost[];
  investors: Investor[];
  cashFlow: CashFlowEntry[];
  capitalRecouped: number;
  netProfit: number;
}

export interface OpnameSession {
  id: string;
  storeId: string;
  date: string;
  status: 'completed';
  items: {
    itemId: string;
    itemName: string;
    unit: string;
    initialStock: number;
    physicalCount: number;
    discrepancy: number;
  }[];
  assetChanges: {
    assetId: string;
    assetName: string;
    oldCondition: Asset['condition'];
    newCondition: Asset['condition'];
  }[];
}