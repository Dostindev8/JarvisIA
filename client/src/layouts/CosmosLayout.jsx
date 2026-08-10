import { useLocation } from 'react-router-dom';
import CosmosBackground from '../components/cosmos/CosmosBackground';
import { CosmosToastContainer } from '../components/cosmos/CosmosToast';
import CosmosNavbar from './CosmosNavbar';

export default function CosmosLayout({ children }) {
  const { pathname } = useLocation();
  const hideNav = pathname === '/login';

  return (
    <div className="cosmos-root min-h-screen bg-jarvis-void font-body text-white">
      <CosmosBackground intensity={hideNav ? 'subtle' : 'full'} />
      {!hideNav && <CosmosNavbar />}
      <main className={`relative z-[20] ${hideNav ? '' : 'pt-16'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {children}
      </main>
      <CosmosToastContainer />
    </div>
  );
}
