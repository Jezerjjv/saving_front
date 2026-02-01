import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Calendar from './pages/Calendar';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import RapidosYFijos from './pages/RapidosYFijos';
import Transfers from './pages/Transfers';
import Cryptos from './pages/Cryptos';
import Acciones from './pages/Acciones';
import Intereses from './pages/Intereses';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import LockScreen from './pages/LockScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MovimientosSidebarProvider } from './context/MovimientosSidebarContext';
import { LayoutHeaderProvider } from './context/LayoutHeaderContext';

function ProtectedRoute({ children }) {
  const { token, unlocked } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!unlocked) return <LockScreen />;
  return children;
}

function GuestRoute({ children }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/movimientos" replace />;
  return children;
}

function AppRoutes() {
  return (
    <MovimientosSidebarProvider>
      <LayoutHeaderProvider>
        <Routes>
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/registro" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/movimientos" replace />} />
            <Route path="calendario" element={<Calendar />} />
            <Route path="cuentas" element={<Accounts />} />
            <Route path="movimientos" element={<Transactions />} />
            <Route path="rapidos-y-fijos" element={<RapidosYFijos />} />
            <Route path="transferencias" element={<Transfers />} />
            <Route path="criptomonedas" element={<Cryptos />} />
            <Route path="acciones" element={<Acciones />} />
            <Route path="intereses" element={<Intereses />} />
            <Route path="configuracion" element={<Settings />} />
          </Route>
        </Routes>
      </LayoutHeaderProvider>
    </MovimientosSidebarProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
