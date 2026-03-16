import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useShop, PRODUCT_IMAGES } from '../context/ShopContext';

export default function Home() {
  const { products, loadingProducts } = useShop();

  const featured = products.slice(0, 3);

  return (
    <div className="page-wrapper">
      <header className="hero">
        <img 
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
          alt="Fashion Background" 
          className="hero-bg" 
        />
        <div className="hero-content">
          <h1>Curated Elegance</h1>
          <p>Unveil the latest in fashion and tech. Experience pure luxury.</p>
          <Link to="/products" className="btn-primary hero-btn">
            Shop Collection <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hero-overlay"></div>
      </header>

      <section className="featured-section">
        <div className="section-header">
          <h2>Featured Essentials</h2>
          <Link to="/products" className="link-arrow">View all <ArrowRight size={16}/></Link>
        </div>

        {loadingProducts ? (
          <div className="loading-state">Loading latest arrivals...</div>
        ) : (
          <div className="products-grid featured-grid">
            {featured.map((product) => (
              <Link to="/products" key={product._id} className="product-card">
                <div className="product-image-container">
                  <img 
                    src={PRODUCT_IMAGES[product.name] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'} 
                    alt={product.name} 
                  />
                  <div className="product-tags">
                     <span className="brand-tag">{product.brand || 'Premium'}</span>
                  </div>
                </div>
                <div className="product-info-compact">
                  <h3>{product.name}</h3>
                  <p className="category-label">{product.category}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
