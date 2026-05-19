import { create } from 'zustand';

// A basket line is a single chosen item with its modifier selections.
// The Square catalog object id is the *variation* id (size is modeled as a
// variation in Square, not a modifier), plus a flat list of modifier ids.
export type BasketModifier = {
  catalogObjectId: string;
  name: string;
  priceDeltaCents: number;
};

export type BasketLine = {
  // Stable per-line id (uuid v4) so the same item with different modifiers
  // can appear twice in a basket without conflicting.
  lineId: string;
  catalogItemId: string;
  squareCatalogObjectId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
  modifiers: BasketModifier[];
  note?: string;
};

type BasketState = {
  cafeId: string | null;
  lines: BasketLine[];
  tipCents: number;
  redeemBeans: boolean;
  setCafe: (cafeId: string) => void;
  addLine: (line: BasketLine) => void;
  removeLine: (lineId: string) => void;
  updateQty: (lineId: string, qty: number) => void;
  setTip: (tipCents: number) => void;
  setRedeemBeans: (redeem: boolean) => void;
  clear: () => void;
  subtotalCents: () => number;
};

export const useBasket = create<BasketState>((set, get) => ({
  cafeId: null,
  lines: [],
  tipCents: 0,
  redeemBeans: false,
  setCafe: (cafeId) => {
    // Switching cafes wipes the basket — items don't cross cafes.
    if (get().cafeId !== cafeId) {
      set({ cafeId, lines: [], tipCents: 0, redeemBeans: false });
    }
  },
  addLine: (line) => set({ lines: [...get().lines, line] }),
  removeLine: (lineId) =>
    set({ lines: get().lines.filter((l) => l.lineId !== lineId) }),
  updateQty: (lineId, qty) =>
    set({
      lines: get()
        .lines.map((l) => (l.lineId === lineId ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    }),
  setTip: (tipCents) => set({ tipCents }),
  setRedeemBeans: (redeemBeans) => set({ redeemBeans }),
  clear: () => set({ cafeId: null, lines: [], tipCents: 0, redeemBeans: false }),
  subtotalCents: () =>
    get().lines.reduce((sum, l) => {
      const lineUnit =
        l.unitPriceCents + l.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0);
      return sum + lineUnit * l.qty;
    }, 0),
}));
