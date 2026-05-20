import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="MobAudit" style={{ height: '38px', objectFit: 'contain' }} />
          </Link>

          {/* Right Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
            >
              DASHBOARD
            </button>
            <button 
              onClick={() => { 
                localStorage.removeItem('mobaudit_token'); 
                localStorage.removeItem('mobaudit_user'); 
                localStorage.removeItem('token');
                navigate('/login'); 
              }}
              style={{ background: '#E11D48', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
            >
              LOGOUT
            </button>
          </div>
          
        </div>
      </nav>
      
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-[72px]"></div>
    </>
  );
}

export default Navbar;
