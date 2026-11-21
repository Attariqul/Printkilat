import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import type { PaymentSettings, ServiceTariff } from './shared/printLogic';
import {
  DEFAULT_PAYMENT_SETTINGS,
  fetchPaymentSettings,
  fetchTariffs,
  operatorLoginWithGoogle,
  operatorLogout,
  resolveOperatorFromFirebaseUser,
  type OperatorUser,
} from './utils/api';
import { EntryPortalView } from './components/EntryPortalView';
import { CustomerShell, type CustomerTab } from './components/CustomerShell';
import { CustomerHomeView } from './components/CustomerHomeView';
import { CreateOrderView } from './components/CreateOrderView';
import { CustomerTrackView } from './components/CustomerTrackView';
import { CustomerPriceListView } from './components/CustomerPriceAndHistoryView';
import { OperatorPortal } from './components/OperatorPortal';

type AppMode = 'gate' | 'customer' | 'operator';

export default function App() {
  const [mode, setMode] = useState<AppMode>('gate');
  const [customerTab, setCustomerTab] = useState<CustomerTab>('home');
  const [focusOperatorLogin, setFocusOperatorLogin] = useState(false);

  const [operator, setOperator] = useState<OperatorUser | null>(null);
  const [tariffs, setTariffs] = useState<ServiceTariff[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [trackCodeParam, setTrackCodeParam] = useState<string>('');
  const [initializing, setInitializing] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const syncRouteFromLocation = useCallback((currentOp: OperatorUser | null) => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (params.get('autostart') === '1') {
      setMode('customer');
      setCustomerTab('home');
      return;
    }

    if (path.startsWith('/operator')) {
      if (currentOp) {
        setMode('operator');
      } else {
        setFocusOperatorLogin(true);
        setMode('gate');
      }
      return;
    }

    if (path === '/tamu/pesan') {
      setMode('customer');
      setCustomerTab('order');
    } else if (path === '/tamu/lacak') {
      const codeFromQr = params.get('code')?.trim().toUpperCase() ?? '';
      setTrackCodeParam(codeFromQr);
      setMode('customer');
      setCustomerTab('track');
    } else if (path === '/tamu/tarif') {
      setMode('customer');
      setCustomerTab('tariffs');
    } else if (path.startsWith('/tamu')) {
      setMode('customer');
      setCustomerTab('home');
    } else {
      setMode('gate');
    }
  }, []);

  useEffect(() => {
    let active = true;
    let initialAuthResolved = false;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        const resolvedOp = await resolveOperatorFromFirebaseUser(fbUser);
        if (!active) return;
        setOperator(resolvedOp);

        if (!initialAuthResolved) {
          initialAuthResolved = true;
          try {
            const [activeTariffs, loadedPayment] = await Promise.all([
              fetchTariffs(false),
              fetchPaymentSettings().catch(() => DEFAULT_PAYMENT_SETTINGS),
            ]);
            if (!active) return;
            setTariffs(activeTariffs);
            setPaymentSettings(loadedPayment);
          } catch (err) {
            if (active) {
              setBootstrapError(err instanceof Error ? err.message : 'Gagal memuat tarif layanan.');
            }
          }
          syncRouteFromLocation(resolvedOp);
          setInitializing(false);
        }
      } catch {
        if (active && !initialAuthResolved) {
          initialAuthResolved = true;
          syncRouteFromLocation(null);
          setInitializing(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [syncRouteFromLocation]);

  useEffect(() => {
    const onPopState = () => {
      syncRouteFromLocation(operator);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [operator, syncRouteFromLocation]);

  function navigateCustomer(tab: CustomerTab, push = true, initialTrackCode = '') {
    setTrackCodeParam(tab === 'track' ? initialTrackCode : '');
    setMode('customer');
    setCustomerTab(tab);
    const map: Record<CustomerTab, string> = {
      home: '/tamu',
      order: '/tamu/pesan',
      track: initialTrackCode
        ? `/tamu/lacak?code=${encodeURIComponent(initialTrackCode)}`
        : '/tamu/lacak',
      tariffs: '/tamu/tarif',
    };
    const nextUrl = map[tab];
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (push && currentUrl !== nextUrl) {
      window.history.pushState(null, '', nextUrl);
    }
  }

  function navigateGate() {
    setMode('gate');
    setFocusOperatorLogin(false);
    setTrackCodeParam('');
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  }

  async function handleOperatorGoogleLogin() {
    const user = await operatorLoginWithGoogle();
    setOperator(user);
    setMode('operator');
    window.history.pushState(null, '', '/operator/antrean');
  }

  async function handleOperatorLogout() {
    await operatorLogout();
    setOperator(null);
    navigateGate();
  }

  const handleOperatorSessionExpired = useCallback(() => {
    setOperator(null);
    setMode('gate');
    setFocusOperatorLogin(true);
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  function handleOpenTrackOrder(code: string) {
    navigateCustomer('track', true, code);
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center text-sm font-semibold text-slate-500">
        Memuat PrintKilat...
      </div>
    );
  }

  if (bootstrapError && tariffs.length === 0 && mode === 'customer') {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-6 text-center space-y-4">
          <p className="text-sm font-semibold text-red-700">{bootstrapError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#EA580C] text-white text-sm font-semibold cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'operator' && operator) {
    return (
      <OperatorPortal
        operator={operator}
        paymentSettings={paymentSettings}
        onLogout={handleOperatorLogout}
        onSessionExpired={handleOperatorSessionExpired}
        onTariffsChanged={(updatedActive) => setTariffs(updatedActive)}
        onPaymentSettingsChanged={(updatedPayment) => setPaymentSettings(updatedPayment)}
      />
    );
  }

  if (mode === 'customer') {
    return (
      <CustomerShell
        activeTab={customerTab}
        onNavigate={(tab) => navigateCustomer(tab)}
        onExitToGate={navigateGate}
        hideBottomNav={customerTab === 'order'}
      >
        {customerTab === 'home' && (
          <CustomerHomeView onNavigate={(tab) => navigateCustomer(tab)} />
        )}
        {customerTab === 'order' && (
          <CreateOrderView
            tariffs={tariffs}
            paymentSettings={paymentSettings}
            onBack={() => navigateCustomer('home')}
            onTrackOrder={handleOpenTrackOrder}
          />
        )}
        {customerTab === 'track' && (
          <CustomerTrackView
            initialCode={trackCodeParam}
            onBack={() => navigateCustomer('home')}
          />
        )}
        {customerTab === 'tariffs' && (
          <CustomerPriceListView
            tariffs={tariffs}
            onBack={() => navigateCustomer('home')}
            onStartOrder={() => navigateCustomer('order')}
          />
        )}
      </CustomerShell>
    );
  }

  return (
    <EntryPortalView
      initialFocusOperator={focusOperatorLogin}
      onContinueAsGuest={() => navigateCustomer('home')}
      onOperatorGoogleLogin={handleOperatorGoogleLogin}
    />
  );
}
