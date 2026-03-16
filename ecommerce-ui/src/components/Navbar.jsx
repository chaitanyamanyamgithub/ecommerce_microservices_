import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Package, LogOut } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export default function Navbar() {
  const { cart, DEMO_USER_ID } = useShop();
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">LUMIÈRE</Link>
        <div className="nav-links">
          <Link to="/products" className={location.pathname === '/products' ? 'active' : ''}>Categories</Link>
          <Link to="/orders" className={location.pathname === '/orders' ? 'active' : ''}>Orders</Link>
        </div>
        <div className="nav-actions">
          <Link to="/cart" className="cart-icon-btn">
            <ShoppingBag size={20} />
            {cart.itemCount > 0 && <span className="badge">{cart.itemCount}</span>}
          </Link>
          <span className="user-id">ID: {DEMO_USER_ID.slice(-4)}</span>
        </div>
      </div>
    </nav>
  );
}
