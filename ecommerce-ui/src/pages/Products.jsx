import { useShop, PRODUCT_IMAGES } from '../context/ShopContext';
import { ShoppingCart } from 'lucide-react';

export default function Products() {
  const { products, loadingProducts, handleAddToCart, busyProductId, formatCurrency } = useShop();

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>All Categories</h1>
        <p className="subtitle">Discover our curated collection of essential items.</p>
      </div>

      {loadingProducts ? (
        <div className="loading-state">Loading products...</div>
      ) : (
        <div className="products-grid full-grid">
          {products.map((product) => (
            <div key={product._id} className="product-card">
              <div className="product-image-container">
                <img 
                  src={PRODUCT_IMAGES[product.name] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'} 
                  alt={product.name} 
                />
                <div className="product-tags left-tags">
                   <span className="brand-tag">{product.brand || 'Premium'}</span>
                   <span className="stock-tag">{product.stock} left</span>
                </div>
              </div>
              <div className="product-info full-info">
                <h3>{product.name}</h3>
                <p className="desc">{product.description}</p>
                <div className="product-footer">
                  <span className="price">{formatCurrency(product.price)}</span>
                  <button 
                    className="btn-add btn-icon"
                    disabled={busyProductId === product._id || product.stock < 1}
                    onClick={() => handleAddToCart(product)}
                  >
                    {busyProductId === product._id ? '...' : <ShoppingCart size={18} />} Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
