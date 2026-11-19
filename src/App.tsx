import { useCallback, useEffect, useState } from 'react';
import type { OrderDetail, ServiceTariff } from './shared/printLogic';
import {
  fetchBatchOrderSummaries,
  fetchOperatorMe,
  fetchTariffs,
  getSavedGuestTrackingCodes,
  operatorLogin,
  operatorLogout,
  saveGuestTrackingCode,
  type OperatorUser,
} from './utils/api';
import { EntryPortalView } from './components/EntryPortalView';
import { CustomerShell, type CustomerTab } from './components/CustomerShell';
import { CustomerHomeView } from './components/CustomerHomeView';
import { CreateOrderView } from './components/CreateOrderView';
import { CustomerTrackView } from './components/CustomerTrackView';
import {
  CustomerHistoryView,
  CustomerPriceListView,
} from './components/CustomerPriceAndHistoryView';
import { OperatorPortal } from './components/OperatorPortal';

type AppMode = 'gate' | 'customer' | 'operator';

export default function App() {
  const [mode, setMode] = useState<AppMode>('gate');
  const [customerTab, setCustomerTab] = useState<CustomerTab>('home');
  const [focusOperatorLogin, setFocusOperatorLogin] = useState(false);

  const [operator, setOperator] = useState<OperatorUser | null>(null);
  const [tariffs, setTariffs] = useState<ServiceTariff[]>([]);
  const [savedCodes, setSavedCodes] = useState<string[]>(() => getSavedGuestTrackingCodes());
  const [guestOrders, setGuestOrders] = useState<OrderDetail[]>([]);
  const [loadingGuestOrders, setLoadingGuestOrders] = useState(false);
  const [trackCodeParam, setTrackCodeParam] = useState<string>('');
  const [initializing, setInitializing] = useState(true);

  const refreshGuestOrders = useCallback(async (codes: string[]) => {
    setLoadingGuestOrders(true);
    try {
      const orders = await fetchBatchOrderSummaries(codes);
      setGuestOrders(orders);
    } finally {
      setLoadingGuestOrders(false);
    }
  }, []);

  const syncRouteFromLocation = useCallback(
    (currentOp: OperatorUser | null) => {
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
        setMode('customer');
        setCustomerTab('track');
      } else if (path === '/tamu/tarif') {
        setMode('customer');
        setCustomerTab('tariffs');
      } else if (path === '/tamu/riwayat') {
        setMode('customer');
        setCustomerTab('history');
      } else if (path.startsWith('/tamu')) {
        setMode('customer');
        setCustomerTab('home');
      } else {
        setMode('gate');
      }
    },
    []
  );

  useEffect(() => {
    async function bootstrap() {
      try {
        const [me, activeTariffs] = await Promise.all([
          fetchOperatorMe(),
          fetchTariffs(false),
        ]);
        setOperator(me);
        setTariffs(activeTariffs);
        syncRouteFromLocation(me);
      } finally {
        setInitializing(false);
      }
    }
    void bootstrap();
  }, [syncRouteFromLocation]);

  useEffect(() => {
    const onPopState = () => {
      syncRouteFromLocation(operator);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [operator, syncRouteFromLocation]);

  useEffect(() => {
    if (mode === 'customer') {
      void refreshGuestOrders(savedCodes);
    }
  }, [mode, savedCodes, refreshGuestOrders]);

  function navigateCustomer(tab: CustomerTab, push = true) {
    setMode('customer');
    setCustomerTab(tab);
    const map: Record<CustomerTab, string> = {
      home: '/tamu',
      order: '/tamu/pesan',
      track: '/tamu/lacak',
      tariffs: '/tamu/tarif',
      history: '/tamu/riwayat',
    };
    if (push && window.location.pathname !== map[tab]) {
      window.history.pushState(null, '', map[tab]);
    }
  }

  function navigateGate() {
    setMode('gate');
    setFocusOperatorLogin(false);
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  }

  async function handleOperatorLogin(email: string, password: string) {
    const user = await operatorLogin(email, password);
    setOperator(user);
    setMode('operator');
    window.history.pushState(null, '', '/operator/antrean');
  }

  async function handleOperatorLogout() {
    await operatorLogout();
    setOperator(null);
    navigateGate();
  }

  function handleOrderCreated(order: OrderDetail) {
    const updatedCodes = saveGuestTrackingCode(order.trackingCode);
    setSavedCodes(updatedCodes);
    void refreshGuestOrders(updatedCodes);
  }

  function handleOpenTrackOrder(code: string) {
    const updatedCodes = saveGuestTrackingCode(code);
    setSavedCodes(updatedCodes);
    setTrackCodeParam(code);
    navigateCustomer('track');
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center text-sm font-semibold text-slate-500">
        Memuat PrintKilat...
      </div>
    );
  }

  if (mode === 'operator' && operator) {
    return (
      <OperatorPortal
        operator={operator}
        onLogout={handleOperatorLogout}
        onTariffsChanged={(updatedActive) => setTariffs(updatedActive)}
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
          <CustomerHomeView
            activeOrders={guestOrders}
            loadingOrders={loadingGuestOrders}
            onNavigate={(tab) => navigateCustomer(tab)}
            onOpenTrackOrder={handleOpenTrackOrder}
          />
        )}
        {customerTab === 'order' && (
          <CreateOrderView
            tariffs={tariffs}
            onBack={() => navigateCustomer('home')}
            onOrderCreated={handleOrderCreated}
            onTrackOrder={handleOpenTrackOrder}
          />
        )}
        {customerTab === 'track' && (
          <CustomerTrackView
            initialCode={trackCodeParam}
            savedCodes={savedCodes}
            onBack={() => navigateCustomer('home')}
            onCodeFound={(code) => {
              const next = saveGuestTrackingCode(code);
              setSavedCodes(next);
            }}
          />
        )}
        {customerTab === 'tariffs' && (
          <CustomerPriceListView
            tariffs={tariffs}
            onBack={() => navigateCustomer('home')}
            onStartOrder={() => navigateCustomer('order')}
          />
        )}
        {customerTab === 'history' && (
          <CustomerHistoryView
            orders={guestOrders}
            onBack={() => navigateCustomer('home')}
            onTrackOrder={handleOpenTrackOrder}
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
      onOperatorLogin={handleOperatorLogin}
    />
  );
}
