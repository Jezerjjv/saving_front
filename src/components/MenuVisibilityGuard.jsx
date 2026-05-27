import { Navigate, useLocation } from 'react-router-dom';
import { useAppSettings } from '../context/AppSettingsContext';
import { useAuth } from '../context/AuthContext';
import { PATH_TO_MENU_KEY, getFirstVisiblePath } from '../config/sidebarNav';

export default function MenuVisibilityGuard({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const { menuVisibility, settingsLoaded, interestEligible } = useAppSettings();

  if (!settingsLoaded) return children;

  const menuKey = PATH_TO_MENU_KEY[location.pathname];
  if (!menuKey) return children;

  if (menuKey === 'pastillas' && !user?.is_admin) {
    return <Navigate to={getFirstVisiblePath(menuVisibility, { isAdmin: false, interestEligible })} replace />;
  }
  if (menuKey === 'intereses' && !interestEligible) {
    return <Navigate to={getFirstVisiblePath(menuVisibility, { isAdmin: user?.is_admin, interestEligible: false })} replace />;
  }
  if (menuVisibility[menuKey] === false) {
    return (
      <Navigate
        to={getFirstVisiblePath(menuVisibility, { isAdmin: user?.is_admin, interestEligible })}
        replace
      />
    );
  }

  return children;
}
