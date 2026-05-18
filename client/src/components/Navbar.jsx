import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import MenuOverlay from "./MenuOverlay";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
          {/* Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="group flex flex-col space-y-1.5 p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <div className="w-8 h-0.5 bg-white group-hover:bg-brand-red transition-colors"></div>
            <div className="w-6 h-0.5 bg-white group-hover:bg-brand-red transition-colors"></div>
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-brand-red text-2xl font-display font-bold">M</span>
            <span className="text-white text-lg font-display font-extrabold tracking-widest italic hidden sm:block">MOBAUDIT</span>
          </Link>

          {/* Right Section */}
          <div className="flex items-center space-x-6">
            <Link to="/beta" className="text-white text-sm font-bold tracking-widest hover:text-brand-red transition-colors border-b-2 border-brand-red pb-0.5">
              BETA ACCESS
            </Link>
          </div>
        </div>
      </nav>
      
      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-[72px]"></div>
    </>
  );
}

export default Navbar;
