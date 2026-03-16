import { useState } from 'react';
import { useShop, PRODUCT_IMAGES } from '../context/ShopContext';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Cart() {
  const { cart, formatCurrency, handleRemoveFromCart, handlePlaceOrder, checkoutPending, defaultShippingAddress } = useShop();
  const navigate = useNavigate();
  const [shippingAddress, setShippingAddress] = useState(defaultShippingAddress);

  function handleAddressChange(e) {
    const { name, value } = e.target;
    setShippingAddress(curr => ({ ...curr, [name]: value }));
  }

  async function checkout() {
    const success = await handlePlaceOrder(shippingAddress);
    if (success) {
      navigate('/orders');
    }
  }

  if (!cart.items?.length) {
    return (
      <div className="empty-state-page">
        <ShoppingBag size={48} className="empty-icon" />
        <h2>Your Bag is Empty</h2>
        <p>Explore our categories and add items to your cart.</p>
        <Link to="/products" className="btn-primary mt-4">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="page-wrapper cart-page flex-row gap-8">
      <div className="cart-content flex-2">
        <h1 className="page-title">Shopping Bag ({cart.itemCount})</h1>
        
        <div className="cart-items-list mt-8">
          {cart.items.map(item => (
            <div key={item.productId} className="cart-item flex items-center justify-between py-6 border-b border-white-10">
              <div className="flex items-center gap-6">
                <div className="item-img w-24 h-24 bg-gray-900 rounded-lg overflow-hidden shrink-0">
                  <img src={PRODUCT_IMAGES[item.productName] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'} alt={item.productName} className="object-cover w-full h-full" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-1">{item.productName}</h3>
                  <div className="text-gray-400 text-sm mb-2">Qty: {item.quantity}</div>
                  <div className="font-semibold text-white">{formatCurrency(item.price)}</div>
                </div>
              </div>
              <button className="btn-remove-cart text-gray-500 hover:text-red-400 transition" onClick={() => handleRemoveFromCart(item.productId)}>
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="checkout-sidebar flex-1 sticky top-24">
        <div className="glass-panel p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
          <div className="flex justify-between mb-4 text-gray-400">
            <span>Subtotal</span>
            <span className="text-white">{formatCurrency(cart.totalAmount)}</span>
          </div>
          <div className="flex justify-between mb-6 text-gray-400">
            <span>Shipping</span>
            <span className="text-white text-sm uppercase tracking-wider">Complimentary</span>
          </div>
          <div className="flex justify-between font-bold text-xl pt-4 border-t border-white-10 mb-8">
            <span>Total</span>
            <span>{formatCurrency(cart.totalAmount)}</span>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-widest mb-4">Shipping Details</h3>
          <div className="form-grid gap-3 mb-6">
            <input className="input-field" name="street" placeholder="Street" value={shippingAddress.street} onChange={handleAddressChange} />
            <input className="input-field" name="city" placeholder="City" value={shippingAddress.city} onChange={handleAddressChange} />
            <input className="input-field" name="state" placeholder="State" value={shippingAddress.state} onChange={handleAddressChange} />
            <input className="input-field" name="zipCode" placeholder="ZIP Code" value={shippingAddress.zipCode} onChange={handleAddressChange} />
            <input className="input-field full-width" name="country" placeholder="Country" value={shippingAddress.country} onChange={handleAddressChange} />
          </div>

          <button 
            className="btn-checkout w-full flex justify-center items-center gap-2" 
            disabled={checkoutPending} 
            onClick={checkout}
          >
            {checkoutPending ? 'Processing Payment...' : <>Proceed to Checkout <ArrowRight size={18}/></>}
          </button>
        </div>
      </div>
    </div>
  );
}
