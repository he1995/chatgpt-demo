import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getServerURL } from "../client/api";

export interface Product {
    id: number;
    name: string;
    picture: string;
    realPrice: string;
    originPrice: string;
    delivery: string;
    createTime: string;
}
export interface ProductState {
  currentProduct: Product;
  allProducts: Product[];
  selectProduct: (product: Product) => void;
  fetchAllProducts: () => void;
}

export const useProductStore = create<ProductState>()(
  persist((set, get) => ({
    currentProduct: {
      id: 0,
      name: "",
      picture: "",
      realPrice: "",
      originPrice: "",
      delivery: "",
      createTime: "",
    },
    allProducts: [],
    selectProduct: (product: Product) => {
      set({ currentProduct: product });
    },
    fetchAllProducts: async () => {
      const response = await fetch(getServerURL() + '/goods/all');
      const data = await response.json();
      set({ allProducts: data.data });
    },
  }),
    { name: "product" }
  )
)
