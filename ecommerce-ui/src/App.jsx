import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';

export default function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </main>
      <footer className="footer">
        <p>© 2026 LUMIÈRE. All rights reserved.</p>
        <p className="footer-links">
          <span>Privacy</span> · <span>Terms</span> · <span>Contact</span>
        </p>
      </footer>
    </div>
  );
}
