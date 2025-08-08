
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchWithAuth } from "../utils/fetch";

export interface Order {
  id: string;
  name: string;
  createTime: string;
  delivery: string;
  status: number;
  price: string;
  payMethod: string;
  email: string;
  username: string;
}
export interface OrderState {
  currentOrder: Order;
  createOrder: (order: Order) => void;
}

function getOrderURL() {
  return process.env.NEXT_PUBLIC_API_URL;
}

export const useOrderStore = create<OrderState>()(
  persist((set, get) => ({
    currentOrder: {
      id: '',
      name: '',
      createTime: '',
      delivery: '',
      status: 0,
      price: '',
      payMethod: '',
      email: '',
      username: ''
    },
    createOrder: async (order: Order) => {
      const response = await fetchWithAuth(getOrderURL() + '/order/create', {
        method: 'post',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });
      const data = await response.json();
      set({ currentOrder: data.data });
    },
  }),
    { name: "order" }
  )
)



    
