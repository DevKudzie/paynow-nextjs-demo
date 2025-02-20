import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import ProductCard from '@/components/ProductCard';
import Cart from '@/components/Cart';
import ThemeToggle from '@/components/ThemeToggle';
import { useCartStore } from '@/utils/cart';
import productsData from '@/data/products.json';

export default function Home() {
  const { toggleCart, items } = useCartStore();

  return (
    <>
      <header className="bg-dark-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">PayNow Store</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={toggleCart}
                className="relative p-2 text-dark-400 hover:text-white"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {productsData.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>

      <Cart />
    </>
  );
} 