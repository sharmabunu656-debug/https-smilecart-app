import * as React from "react";

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockAt: number;
  createdAt: string;
};

export type Purchase = {
  id: string;
  date: string;
  supplier: string;
  productId: string;
  qty: number;
  totalCost: number;
};

export type PaymentMethod = "cash" | "card" | "mobile";

export type Sale = {
  id: string;
  date: string;
  productId: string;
  qty: number;
  unitPrice: number;
  total: number;
  payment: PaymentMethod;
};

type State = {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
};

type Ctx = State & {
  addProduct: (p: Omit<Product, "id" | "createdAt">) => Product;
  recordPurchase: (p: Omit<Purchase, "id" | "date"> & { date?: string }) => Purchase | null;
  recordSale: (s: Omit<Sale, "id" | "date" | "total" | "unitPrice"> & {
    unitPrice?: number;
    date?: string;
  }) => Sale | { error: string };
  getProduct: (id: string) => Product | undefined;
  findBySku: (sku: string) => Product | undefined;
};

const STORAGE_KEY = "grocer-os.v1";

const seed: State = {
  products: [
    {
      id: "p_milk",
      sku: "MLK-001",
      name: "Toned Milk 1L",
      category: "dairy",
      costPrice: 52,
      sellingPrice: 62,
      stock: 24,
      lowStockAt: 10,
      createdAt: new Date().toISOString(),
    },
    {
      id: "p_rice",
      sku: "RCE-005",
      name: "Basmati Rice 5kg",
      category: "staples",
      costPrice: 480,
      sellingPrice: 560,
      stock: 6,
      lowStockAt: 8,
      createdAt: new Date().toISOString(),
    },
    {
      id: "p_oil",
      sku: "OIL-010",
      name: "Sunflower Oil 1L",
      category: "staples",
      costPrice: 140,
      sellingPrice: 165,
      stock: 18,
      lowStockAt: 10,
      createdAt: new Date().toISOString(),
    },
  ],
  purchases: [],
  sales: [],
};

const ShopContext = React.createContext<Ctx | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function load(): State {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    return JSON.parse(raw) as State;
  } catch {
    return seed;
  }
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(seed);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state, hydrated]);

  const value = React.useMemo<Ctx>(() => {
    const getProduct = (id: string) => state.products.find((p) => p.id === id);
    const findBySku = (sku: string) =>
      state.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());

    return {
      ...state,
      getProduct,
      findBySku,
      addProduct: (p) => {
        const product: Product = {
          ...p,
          id: uid("p"),
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, products: [product, ...s.products] }));
        return product;
      },
      recordPurchase: (p) => {
        const product = getProduct(p.productId);
        if (!product) return null;
        const purchase: Purchase = {
          id: uid("pu"),
          date: p.date ?? new Date().toISOString(),
          supplier: p.supplier,
          productId: p.productId,
          qty: p.qty,
          totalCost: p.totalCost,
        };
        setState((s) => ({
          ...s,
          purchases: [purchase, ...s.purchases],
          products: s.products.map((pr) =>
            pr.id === p.productId ? { ...pr, stock: pr.stock + p.qty } : pr,
          ),
        }));
        return purchase;
      },
      recordSale: (s) => {
        const product = getProduct(s.productId);
        if (!product) return { error: "Product not found" };
        if (product.stock < s.qty) return { error: "Insufficient stock" };
        const unitPrice = s.unitPrice ?? product.sellingPrice;
        const sale: Sale = {
          id: uid("sa"),
          date: s.date ?? new Date().toISOString(),
          productId: s.productId,
          qty: s.qty,
          unitPrice,
          total: unitPrice * s.qty,
          payment: s.payment,
        };
        setState((st) => ({
          ...st,
          sales: [sale, ...st.sales],
          products: st.products.map((pr) =>
            pr.id === s.productId ? { ...pr, stock: pr.stock - s.qty } : pr,
          ),
        }));
        return sale;
      },
    };
  }, [state]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = React.useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function useTodayStats() {
  const { sales, purchases, products } = useShop();
  return React.useMemo(() => {
    const today = new Date();
    const salesToday = sales.filter((s) => isSameDay(new Date(s.date), today));
    const purchasesToday = purchases.filter((p) =>
      isSameDay(new Date(p.date), today),
    );
    const revenue = salesToday.reduce((acc, s) => acc + s.total, 0);
    const expenses = purchasesToday.reduce((acc, p) => acc + p.totalCost, 0);
    const cogs = salesToday.reduce((acc, s) => {
      const pr = products.find((p) => p.id === s.productId);
      return acc + (pr ? pr.costPrice * s.qty : 0);
    }, 0);
    const profit = revenue - cogs;
    const lowStock = products.filter((p) => p.stock <= p.lowStockAt);
    return { revenue, expenses, profit, lowStock, salesToday, purchasesToday };
  }, [sales, purchases, products]);
}
