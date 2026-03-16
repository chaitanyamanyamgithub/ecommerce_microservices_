import { useShop } from '../context/ShopContext';
import { Package } from 'lucide-react';

export default function Orders() {
  const { orders, formatCurrency } = useShop();

  if (!orders.length) {
    return (
      <div className="empty-state-page">
        <Package size={48} className="empty-icon" />
        <h2>No Orders Yet</h2>
        <p>You haven't placed any orders. Start exploring our collection.</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper pb-12">
      <h1 className="page-title mb-8 text-3xl font-light">Order History</h1>
      <div className="orders-grid gap-6 flex flex-col">
        {orders.map(order => (
          <div key={order._id} className="order-detailed-card glass-panel p-6 border border-white-10 rounded-xl hover:border-white-20 transition">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white-5">
              <div>
                <span className="text-gray-400 text-sm block mb-1">Order Number</span>
                <span className="font-mono text-lg tracking-wider">#{String(order._id || order.orderNumber || 'N/A').substring(0, 8).toUpperCase()}</span>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-2 inline-block ${
                  order.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                  order.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-white/10 text-white'
                }`}>
                  {order.status || 'Confirmed'}
                </span>
                <div className="text-gray-400 text-sm">{new Date(order.createdAt || Date.now()).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="order-items-summary space-y-4">
              {(order.items || []).map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-white-5 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-gray-500">x{item.quantity}</div>
                  </div>
                  <div className="text-gray-300 font-medium">{formatCurrency(item.price)}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white-5">
              <span className="text-gray-400">Total Charged</span>
              <span className="text-xl font-semibold text-white">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
