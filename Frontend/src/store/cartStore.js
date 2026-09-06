import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
    persist(
        (set, get) => ({
            items: [],
            total: 0,
            subtotal: 0,
            deliveryFee: 0,
            discount: 0,

            setCart: (cartData) => {
                set({
                    items: cartData.items || [],
                    subtotal: cartData.subtotal || 0,
                    deliveryFee: cartData.deliveryFee || 0,
                    discount: cartData.discount || 0,
                    total: cartData.total || 0,
                });
            },

            addItem: (item) => {
                const items = get().items;
                const existingItem = items.find((i) => i.productId === item.productId);

                if (existingItem) {
                    set({
                        items: items.map((i) =>
                            i.productId === item.productId
                                ? { ...i, quantity: i.quantity + item.quantity }
                                : i
                        ),
                    });
                } else {
                    set({ items: [...items, item] });
                }

                get().calculateTotals();
            },

            updateItemQuantity: (productId, quantity) => {
                const items = get().items;

                if (quantity <= 0) {
                    set({ items: items.filter((i) => i.productId !== productId) });
                } else {
                    set({
                        items: items.map((i) =>
                            i.productId === productId ? { ...i, quantity } : i
                        ),
                    });
                }

                get().calculateTotals();
            },

            removeItem: (productId) => {
                set({ items: get().items.filter((i) => i.productId !== productId) });
                get().calculateTotals();
            },

            clearCart: () => {
                set({
                    items: [],
                    total: 0,
                    subtotal: 0,
                    deliveryFee: 0,
                    discount: 0
                });
            },

            calculateTotals: () => {
                const items = get().items;
                const subtotal = items.reduce(
                    (sum, item) => sum + (item.price * item.quantity),
                    0
                );
                const deliveryFee = subtotal > 0 ? (subtotal >= 500 ? 0 : 49) : 0;
                const discount = 0;
                const total = subtotal + deliveryFee - discount;

                set({ subtotal, deliveryFee, discount, total });
            },

            getItemCount: () => {
                return get().items.reduce((sum, item) => sum + item.quantity, 0);
            },
        }),
        {
            name: 'cart-storage',
        }
    )
);

export default useCartStore;
