import { Store } from '../types/data';

const today = new Date();
const oneYearAgo = new Date(new Date().setFullYear(today.getFullYear() - 1)).toISOString().split('T')[0];
const twoYearsAgo = new Date(new Date().setFullYear(today.getFullYear() - 2)).toISOString().split('T')[0];

export const defaultStores: Store[] = [
  // 1. Toko Kelontong
  {
    id: 'toko-kelontong-berkah',
    name: 'Toko Kelontong Berkah',
    address: 'Jl. Pahlawan No. 123, Surabaya',
    itemCategories: [
      { id: 'ic-tkb-1', name: 'Makanan Ringan', prefix: 'MR' },
      { id: 'ic-tkb-2', name: 'Minuman', prefix: 'MNM' },
      { id: 'ic-tkb-3', name: 'Sembako', prefix: 'SMK' },
      { id: 'ic-tkb-4', name: 'Kebutuhan Dapur', prefix: 'KBD' },
    ],
    units: [
      { id: 'u-tkb-1', name: 'Pcs' },
      { id: 'u-tkb-2', name: 'Botol' },
      { id: 'u-tkb-3', name: 'Kg' },
      { id: 'u-tkb-4', name: 'Liter' },
      { id: 'u-tkb-5', name: 'Bungkus' },
      { id: 'u-tkb-6', name: 'Dus' },
    ],
    assetCategories: [
      { id: 'ac-tkb-1', name: 'Elektronik', prefix: 'ELK' },
      { id: 'ac-tkb-2', name: 'Furnitur', prefix: 'FNR' },
    ],
    items: [
      { id: 'item-tkb-1', name: 'Indomie Goreng', sku: 'MR-001', categoryId: 'ic-tkb-1', sellingUnitId: 'u-tkb-5', purchaseUnitId: 'u-tkb-6', conversionRate: 40, purchasePrice: 2400, sellingPrice: 3000, description: 'Harga beli per dus Rp 96.000' },
      { id: 'item-tkb-2', name: 'Teh Botol Sosro', sku: 'MNM-001', categoryId: 'ic-tkb-2', sellingUnitId: 'u-tkb-2', purchaseUnitId: 'u-tkb-2', conversionRate: 1, purchasePrice: 3000, sellingPrice: 3500, description: 'Kemasan 250ml' },
      { id: 'item-tkb-3', name: 'Beras Raja Lele', sku: 'SMK-001', categoryId: 'ic-tkb-3', sellingUnitId: 'u-tkb-3', purchaseUnitId: 'u-tkb-3', conversionRate: 1, purchasePrice: 12000, sellingPrice: 13000, description: 'Harga per Kg. Dijual dalam karung 5kg' },
      { id: 'item-tkb-4', name: 'Minyak Goreng Sania', sku: 'SMK-002', categoryId: 'ic-tkb-3', sellingUnitId: 'u-tkb-4', purchaseUnitId: 'u-tkb-4', conversionRate: 1, purchasePrice: 15000, sellingPrice: 17000, description: 'Harga per Liter. Pouch 2 liter' },
      { id: 'item-tkb-5', name: 'Gula Pasir Gulaku', sku: 'KBD-001', categoryId: 'ic-tkb-4', sellingUnitId: 'u-tkb-3', purchaseUnitId: 'u-tkb-3', conversionRate: 1, purchasePrice: 14000, sellingPrice: 16000, description: 'Kemasan 1kg' },
    ],
    inventory: [
      { itemId: 'item-tkb-1', recordedStock: 40 },
      { itemId: 'item-tkb-2', recordedStock: 24 },
      { itemId: 'item-tkb-3', recordedStock: 50 }, // 10 karung * 5kg
      { itemId: 'item-tkb-4', recordedStock: 30 }, // 15 pouch * 2 liter
      { itemId: 'item-tkb-5', recordedStock: 20 },
    ],
    assets: [
      { id: 'asset-tkb-1', code: 'ELK-001', name: 'Kulkas Sharp', categoryId: 'ac-tkb-1', purchaseDate: twoYearsAgo, value: 3000000, condition: 'Bagus', description: '2 pintu, untuk minuman dingin' },
      { id: 'asset-tkb-2', code: 'FNR-001', name: 'Rak Gondola Besi', categoryId: 'ac-tkb-2', purchaseDate: twoYearsAgo, value: 1500000, condition: 'Normal', description: '5 tingkat, panjang 2 meter' },
    ],
    costs: [
      { id: 'cost-tkb-1', name: 'Listrik', amount: 500000, frequency: 'bulanan', description: 'Tagihan PLN bulanan' },
      { id: 'cost-tkb-2', name: 'Sewa Toko', amount: 12000000, frequency: 'tahunan', description: 'Sewa ruko per tahun' },
    ],
    investors: [],
    cashFlow: [],
    capitalRecouped: 0,
    netProfit: 0,
  },
  // 2. Kedai Kopi
  {
    id: 'kedai-kopi-senja',
    name: 'Kopi Senja',
    address: 'Jl. Pemuda No. 45, Semarang',
    itemCategories: [
      { id: 'ic-kks-1', name: 'Espresso Based', prefix: 'EB' },
      { id: 'ic-kks-2', name: 'Manual Brew', prefix: 'MB' },
      { id: 'ic-kks-3', name: 'Non-Kopi', prefix: 'NK' },
      { id: 'ic-kks-4', name: 'Pastry', prefix: 'PT' },
    ],
    units: [
      { id: 'u-kks-1', name: 'Gelas' },
      { id: 'u-kks-2', name: 'Pcs' },
    ],
    assetCategories: [
      { id: 'ac-kks-1', name: 'Mesin Kopi', prefix: 'MKP' },
      { id: 'ac-kks-2', name: 'Peralatan Bar', prefix: 'PBR' },
      { id: 'ac-kks-3', name: 'Furnitur', prefix: 'FNR' },
    ],
    items: [
      { id: 'item-kks-1', name: 'Caffe Latte', sku: 'EB-001', categoryId: 'ic-kks-1', sellingUnitId: 'u-kks-1', purchaseUnitId: 'u-kks-1', conversionRate: 1, purchasePrice: 12000, sellingPrice: 25000, description: 'Hot/Ice' },
      { id: 'item-kks-2', name: 'V60', sku: 'MB-001', categoryId: 'ic-kks-2', sellingUnitId: 'u-kks-1', purchaseUnitId: 'u-kks-1', conversionRate: 1, purchasePrice: 10000, sellingPrice: 22000, description: 'Beans: Gayo / Kintamani' },
      { id: 'item-kks-3', name: 'Red Velvet Latte', sku: 'NK-001', categoryId: 'ic-kks-3', sellingUnitId: 'u-kks-1', purchaseUnitId: 'u-kks-1', conversionRate: 1, purchasePrice: 13000, sellingPrice: 26000, description: 'Non-coffee' },
      { id: 'item-kks-4', name: 'Croissant Butter', sku: 'PT-001', categoryId: 'ic-kks-4', sellingUnitId: 'u-kks-2', purchaseUnitId: 'u-kks-2', conversionRate: 1, purchasePrice: 8000, sellingPrice: 18000, description: 'Original butter' },
    ],
    inventory: [
      { itemId: 'item-kks-1', recordedStock: 0 },
      { itemId: 'item-kks-2', recordedStock: 0 },
      { itemId: 'item-kks-3', recordedStock: 0 },
      { itemId: 'item-kks-4', recordedStock: 15 },
    ],
    assets: [
      { id: 'asset-kks-1', code: 'MKP-001', name: 'Mesin Espresso La Marzocco', categoryId: 'ac-kks-1', purchaseDate: oneYearAgo, value: 80000000, condition: 'Bagus', description: 'Linea Mini, 2 group' },
      { id: 'asset-kks-2', code: 'PBR-001', name: 'Grinder Mahlkönig', categoryId: 'ac-kks-2', purchaseDate: oneYearAgo, value: 25000000, condition: 'Bagus', description: 'EK43' },
      { id: 'asset-kks-3', code: 'FNR-001', name: 'Set Meja & Kursi Kayu', categoryId: 'ac-kks-3', purchaseDate: oneYearAgo, value: 15000000, condition: 'Normal', description: 'Kapasitas 20 orang' },
    ],
    costs: [
      { id: 'cost-kks-1', name: 'Biji Kopi Arabica', amount: 2000000, frequency: 'mingguan', description: 'Supplier: Gayo Mountain Coffee' },
      { id: 'cost-kks-2', name: 'Susu UHT Full Cream', amount: 500000, frequency: 'mingguan', description: 'Brand: Greenfields' },
      { id: 'cost-kks-3', name: 'Gaji Barista', amount: 3500000, frequency: 'bulanan', description: 'Per orang' },
      { id: 'cost-kks-4', name: 'Internet & Wifi', amount: 400000, frequency: 'bulanan', description: 'Provider: IndiHome' },
    ],
    investors: [],
    cashFlow: [],
    capitalRecouped: 0,
    netProfit: 0,
  },
  // 3. Warung Makan
  {
    id: 'warung-makan-sederhana',
    name: 'Warung Makan Sederhana',
    address: 'Jl. Kaliurang KM 5, Yogyakarta',
    itemCategories: [
      { id: 'ic-wms-1', name: 'Makanan Utama', prefix: 'MU' },
      { id: 'ic-wms-2', name: 'Lauk Pauk', prefix: 'LP' },
      { id: 'ic-wms-3', name: 'Minuman', prefix: 'MNM' },
    ],
    units: [
      { id: 'u-wms-1', name: 'Porsi' },
      { id: 'u-wms-2', name: 'Pcs' },
      { id: 'u-wms-3', name: 'Gelas' },
    ],
    assetCategories: [
      { id: 'ac-wms-1', name: 'Peralatan Masak', prefix: 'PM' },
      { id: 'ac-wms-2', name: 'Furnitur', prefix: 'FNR' },
    ],
    items: [
      { id: 'item-wms-1', name: 'Nasi Rames', sku: 'MU-001', categoryId: 'ic-wms-1', sellingUnitId: 'u-wms-1', purchaseUnitId: 'u-wms-1', conversionRate: 1, purchasePrice: 7000, sellingPrice: 12000, description: 'Nasi + 3 macam sayur' },
      { id: 'item-wms-2', name: 'Ayam Goreng', sku: 'LP-001', categoryId: 'ic-wms-2', sellingUnitId: 'u-wms-2', purchaseUnitId: 'u-wms-2', conversionRate: 1, purchasePrice: 5000, sellingPrice: 8000, description: 'Ayam ungkep bumbu kuning' },
      { id: 'item-wms-3', name: 'Lele Goreng', sku: 'LP-002', categoryId: 'ic-wms-2', sellingUnitId: 'u-wms-2', purchaseUnitId: 'u-wms-2', conversionRate: 1, purchasePrice: 4000, sellingPrice: 7000, description: 'Ukuran sedang' },
      { id: 'item-wms-4', name: 'Es Teh Manis', sku: 'MNM-001', categoryId: 'ic-wms-3', sellingUnitId: 'u-wms-3', purchaseUnitId: 'u-wms-3', conversionRate: 1, purchasePrice: 1000, sellingPrice: 3000, description: 'Teh tubruk gula asli' },
    ],
    inventory: [
      { itemId: 'item-wms-1', recordedStock: 0 },
      { itemId: 'item-wms-2', recordedStock: 30 },
      { itemId: 'item-wms-3', recordedStock: 25 },
      { itemId: 'item-wms-4', recordedStock: 0 },
    ],
    assets: [
      { id: 'asset-wms-1', code: 'PM-001', name: 'Kompor Gas Rinnai', categoryId: 'ac-wms-1', purchaseDate: twoYearsAgo, value: 700000, condition: 'Normal', description: '2 tungku' },
      { id: 'asset-wms-2', code: 'PM-002', name: 'Kulkas Polytron', categoryId: 'ac-wms-1', purchaseDate: oneYearAgo, value: 2500000, condition: 'Bagus', description: '1 pintu' },
      { id: 'asset-wms-3', code: 'FNR-001', name: 'Etalase Kaca', categoryId: 'ac-wms-2', purchaseDate: twoYearsAgo, value: 1200000, condition: 'Normal', description: 'Untuk display lauk' },
    ],
    costs: [
      { id: 'cost-wms-1', name: 'Belanja Bahan Baku', amount: 300000, frequency: 'harian', description: 'Belanja di pasar pagi' },
      { id: 'cost-wms-2', name: 'Gas LPG 3kg', amount: 25000, frequency: 'harian', description: 'Rata-rata pemakaian per hari' },
    ],
    investors: [],
    cashFlow: [],
    capitalRecouped: 0,
    netProfit: 0,
  },
];