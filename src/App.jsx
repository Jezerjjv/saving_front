import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Calendar from './pages/Calendar';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Transfers from './pages/Transfers';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/movimientos" replace />} />
        <Route path="/calendario" element={<Calendar />} />
        <Route path="/cuentas" element={<Accounts />} />
        <Route path="/movimientos" element={<Transactions />} />
        <Route path="/transferencias" element={<Transfers />} />
        <Route path="/configuracion" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
