import Image from 'next/image';
import { CartItem as CartItemType } from '@/types/types';
import { useCartStore } from '@/utils/cart';
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex gap-4 py-4 border-b border-dark-700">
      <div className="relative h-20 w-20 flex-shrink-0">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover rounded-md"
        />
      </div>
      <div className="flex-1">
        <h3 className="text-white font-medium">{item.name}</h3>
        <p className="text-dark-400 text-sm">${item.price}</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
            className="p-1 rounded-md hover:bg-dark-700"
          >
            <MinusIcon className="h-4 w-4 text-dark-400" />
          </button>
          <span className="text-white">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="p-1 rounded-md hover:bg-dark-700"
          >
            <PlusIcon className="h-4 w-4 text-dark-400" />
          </button>
          <button
            onClick={() => removeItem(item.id)}
            className="p-1 rounded-md hover:bg-dark-700 ml-auto"
          >
            <TrashIcon className="h-4 w-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
