// (marcador cambios - borrar si quieres)
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import RapidosYFijos from './pages/RapidosYFijos';
import TablaRapida from './pages/TablaRapida';
import Transfers from './pages/Transfers';
import Cryptos from './pages/Cryptos';
import Acciones from './pages/Acciones';
import Intereses from './pages/Intereses';
import Calculadora from './pages/Calculadora';
import Pastillas from './pages/Pastillas';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import LockScreen from './pages/LockScreen';
import { AuthProvider, useAuth } from './context/AuthContext'; 
import { MovimientosSidebarProvider } from './context/MovimientosSidebarContext';
import { SelectedAccountProvider } from './context/SelectedAccountContext';
import { LayoutHeaderProvider } from './context/LayoutHeaderContext';

function ProtectedRoute({ children }) {
  const { token, unlocked } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!unlocked) return <LockScreen />;
  return children;
}

function GuestRoute({ children }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <MovimientosSidebarProvider>
      <SelectedAccountProvider>
        <LayoutHeaderProvider>
          <Routes>
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/registro" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<TablaRapida />} />
              <Route path="inicio" element={<Dashboard />} />
              <Route path="calendario" element={<Calendar />} />
              <Route path="cuentas" element={<Accounts />} />
              <Route path="movimientos" element={<Transactions />} />
              <Route path="rapidos-y-fijos" element={<RapidosYFijos />} />
              <Route path="tabla-rapida" element={<TablaRapida />} />
              <Route path="transferencias" element={<Transfers />} />
              <Route path="criptomonedas" element={<Cryptos />} />
              <Route path="acciones" element={<Acciones />} />
              <Route path="intereses" element={<Intereses />} />
              <Route path="calculadora" element={<Calculadora />} />
              <Route path="pastillas" element={<Pastillas />} />
              <Route path="configuracion" element={<Settings />} />
            </Route>
          </Routes>
        </LayoutHeaderProvider>
      </SelectedAccountProvider>
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
