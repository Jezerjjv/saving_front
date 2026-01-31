import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Calendar from './pages/Calendar';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import RapidosYFijos from './pages/RapidosYFijos';
import Transfers from './pages/Transfers';
import Settings from './pages/Settings';
import { MovimientosSidebarProvider } from './context/MovimientosSidebarContext';
import { LayoutHeaderProvider } from './context/LayoutHeaderContext';

export default function App() {
  return (
    <MovimientosSidebarProvider>
      <LayoutHeaderProvider>
      <Layout>
        <Routes>
        <Route path="/" element={<Navigate to="/movimientos" replace />} />
        <Route path="/calendario" element={<Calendar />} />
        <Route path="/cuentas" element={<Accounts />} />
        <Route path="/movimientos" element={<Transactions />} />
        <Route path="/rapidos-y-fijos" element={<RapidosYFijos />} />
        <Route path="/transferencias" element={<Transfers />} />
        <Route path="/configuracion" element={<Settings />} />
        </Routes>
      </Layout>
      </LayoutHeaderProvider>
    </MovimientosSidebarProvider>
  );
}
