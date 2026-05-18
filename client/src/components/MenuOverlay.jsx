import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const MenuOverlay = ({ isOpen, onClose }) => {
  const menuItems = [
    { title: 'ABOUT US', path: '/about' },
    { title: 'SERVICES', path: '/services' },
    { title: 'OUR WORK', path: '/work' },
    { title: 'CAREERS', path: '/careers' },
    { title: 'BLOGS', path: '/blogs' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-brand-dark/95 backdrop-blur-md flex flex-col p-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-16">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-8 h-8 text-white" />
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-brand-red text-2xl font-display font-bold">M</span>
              <span className="text-white text-xl font-display font-extrabold tracking-widest italic">MOBAUDIT</span>
            </div>

            <button className="text-white text-sm font-medium underline underline-offset-4 decoration-brand-red">
              Get an Estimate
            </button>
          </div>

          {/* Links */}
          <div className="flex-1 flex flex-col justify-center items-center space-y-8">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                className="w-full max-w-md"
              >
                <Link
                  to={item.path}
                  onClick={onClose}
                  className="block text-4xl md:text-5xl font-display font-bold text-center text-white hover:text-brand-red transition-colors py-4 border-b border-white/10 hover:border-brand-red/50"
                >
                  {item.title}
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="mt-auto pt-8 border-t border-white/5 flex flex-col items-center">
            <p className="text-gray-500 text-sm">© 2026 MOBAUDIT. All Rights Reserved.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MenuOverlay;
