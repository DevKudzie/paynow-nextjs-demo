import Link from 'next/link';
import { useCartStore } from '@/utils/cart';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

export default function Header() {
  const { items } = useCartStore();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="bg-dark-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-white">
            Store
          </Link>

          <Link 
            href="/checkout" 
            className="relative inline-flex items-center p-2 text-white hover:text-gray-300"
          >
            <ShoppingCartIcon className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
} 