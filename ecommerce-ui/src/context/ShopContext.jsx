import { createContext, useContext, useState, useEffect, startTransition } from 'react';

const DEMO_USER_ID = '507f1f77bcf86cd799439011';
const ShopContext = createContext(null);

export function useShop() {
  return useContext(ShopContext);
}

const defaultShippingAddress = {
  street: '123 Fashion Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  zipCode: '400001',
  country: 'India'
};

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || `Request failed with status ${response.status}`);
    error.details = payload.errors;
    throw error;
  }
  return payload.data;
}

// Map real Unsplash images to the demo products to look very professional
export const PRODUCT_IMAGES = {
  'AstraBook Pro 14': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  'Pulse X Phone': 'https://images.unsplash.com/photo-1598327105666-5b89351cb315?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  'Orbit Smart Watch': 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  'Nimbus Noise Cancelling Headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  'Summit Trail Backpack': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  'Halo Desk Lamp': 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
};

export function ShopProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], totalAmount: 0, itemCount: 0 });
  const [orders, setOrders] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [busyProductId, setBusyProductId] = useState('');
  const [checkoutPending, setCheckoutPending] = useState(false);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  async function refreshProducts() {
    setLoadingProducts(true);
    setErrorMessage('');
    try {
      const data = await apiRequest('/api/products');
      startTransition(() => {
        setProducts(data.products || []);
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function refreshCart() {
    try {
      const data = await apiRequest(`/api/cart/${DEMO_USER_ID}`);
      startTransition(() => {
        setCart({ ...data, items: data.items || [], itemCount: data.itemCount || 0 });
      });
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function refreshOrders() {
    try {
      const data = await apiRequest(`/api/orders/${DEMO_USER_ID}`);
      startTransition(() => {
        setOrders(data.orders || []);
      });
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  useEffect(() => {
    Promise.all([refreshProducts(), refreshCart(), refreshOrders()]).catch(() => {});
  }, []);

  async function handleAddToCart(product) {
    setBusyProductId(product._id);
    setErrorMessage('');
    try {
      await apiRequest('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          productId: product._id,
          productName: product.name,
          price: product.price,
          quantity: 1
        })
      });
      await refreshCart();
      showToast(`${product.name} added to cart`);
    } catch (error) {
      setErrorMessage(error.message);
      showToast(`Error: ${error.message}`);
    } finally {
      setBusyProductId('');
    }
  }

  async function handleRemoveFromCart(productId) {
    try {
      await apiRequest('/api/cart/remove', {
        method: 'DELETE',
        body: JSON.stringify({ userId: DEMO_USER_ID, productId })
      });
      await refreshCart();
      showToast('Item removed from cart');
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handlePlaceOrder(shippingAddress) {
    if (!cart.items.length) {
      setErrorMessage('Add at least one product before placing an order.');
      return false;
    }
    setCheckoutPending(true);
    setErrorMessage('');
    try {
      await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          items: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity
          })),
          shippingAddress,
          paymentMethod: 'credit_card',
          notes: 'Premium checkout'
        })
      });
      await Promise.all([refreshCart(), refreshOrders(), refreshProducts()]);
      showToast('Order placed successfully!');
      return true;
    } catch (error) {
      setErrorMessage(error.message);
      return false;
    } finally {
      setCheckoutPending(false);
    }
  }

  return (
    <ShopContext.Provider value={{
      products, cart, orders, errorMessage, setErrorMessage, toastMessage,
      loadingProducts, busyProductId, checkoutPending, formatCurrency,
      handleAddToCart, handleRemoveFromCart, handlePlaceOrder, DEMO_USER_ID,
      defaultShippingAddress
    }}>
      {children}
      {/* Global Toast */}
      {toastMessage && <div className="toast success-toast">{toastMessage}</div>}
      {errorMessage && (
        <div className="toast error-toast">
           <span>{errorMessage}</span>
           <button onClick={() => setErrorMessage('')}>&times;</button>
        </div>
      )}
    </ShopContext.Provider>
  );
}
