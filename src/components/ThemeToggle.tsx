import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '@/utils/theme';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-dark-700 text-dark-400 hover:text-white"
    >
      {isDarkMode ? (
        <SunIcon className="h-6 w-6" />
      ) : (
        <MoonIcon className="h-6 w-6" />
      )}
    </button>
  );
} 