import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const existingProduct = newCart.find(product => product.id === productId);

      const responseStock = await api.get<Stock>(`stock/${productId}`);

      const stockAmount = responseStock.data.amount;
      const amount = (existingProduct?.amount || 0) + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      if (existingProduct) {
        existingProduct.amount += 1;

        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

        return;
      }

      const { data: newProduct } = await api.get<Product>(`products/${productId}`);

      const updatedCart = [...newCart, { ...newProduct, amount: 1 }]

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];
      const productIndex = newCart.findIndex(product => product.id === productId);

      if (productIndex < 0) {
        throw new Error();
      };

      newCart.splice(productIndex, 0);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const responseStock = await api.get<Stock>(`stock/${productId}`);
      const stockAmount = responseStock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const newCart = [...cart];
      const existingProduct = newCart.find(product => product.id === productId);

      if (!existingProduct) {
        throw new Error();
      }

      existingProduct.amount = amount;

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
