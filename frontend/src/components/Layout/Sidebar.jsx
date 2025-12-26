import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome,
  FiTv,
  FiFileText,
  FiUsers,
  FiActivity,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard', adminOnly: false },
    { path: '/channels', icon: FiTv, label: 'Channels', adminOnly: false },
    { path: '/epg-files', icon: FiFileText, label: 'EPG Files', adminOnly: false },
    { path: '/monitoring', icon: FiActivity, label: 'Monitoring', adminOnly: false },
    { path: '/users', icon: FiUsers, label: 'Users', adminOnly: true },
    { path: '/system', icon: FiSettings, label: 'System Info', adminOnly: false },
  ];

  const filteredMenuItems = menuItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-primary-400">Stream Manager</h1>
        <p className="text-sm text-gray-400 mt-1">Dashboard</p>
      </div>

      <nav className="flex-1 p-4">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive(item.path)
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="px-4 py-2 mb-2">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-gray-400">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-1 text-xs rounded bg-primary-600 text-white">
            {user?.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <FiLogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

