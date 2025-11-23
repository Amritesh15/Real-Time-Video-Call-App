import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { FaTimes, FaDoorClosed, FaBars } from 'react-icons/fa'
import apiClient from '../../apiClient'

function Dashboard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOnline, setUserOnline] = useState([]);
  const [modalUser, setModalUser] = useState(null);

  //get all users
  const allusers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user/getAllUsers');
      if (response.data.success !== false) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    allusers();
  }, []);
  // Filter users based on search query
  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if user is online
  const isOnlineUser = (userId) => {
    return userOnline.includes(userId);
  };

  // Handle user selection
  const handelSelectedUser = (userId) => {
    setSelectedUser(userId);
    const selected = filteredUsers.find(user => user._id === userId);
    setModalUser(selected);
  };


  // Handle logout
  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user data from localStorage
      localStorage.removeItem('userData');
      // Clear cookies
      document.cookie = 'jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      // Update context
      updateUser(null);
      // Navigate to login
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      {/* Toggle Sidebar Button - Fixed on Left Side */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <FaBars className="w-6 h-6" />
        </button>
      )}
      
      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-br from-blue-900 to-purple-800 text-white w-64 h-screen p-4 space-y-4 fixed top-0 left-0 z-20 transition-transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Users</h1>
          <button
            type="button"
            className="text-white hover:text-gray-300 p-2 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 mb-2"
        />

        {/* User List */}
        <ul className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedUser === user._id
                ? "bg-green-600"
                : "bg-gradient-to-r from-purple-600 to-blue-400"
                }`}
              onClick={() => handelSelectedUser(user._id)}
            >
              <div className="relative">
                <img
                  src={user.profilePicture || "/default-avatar.png"}
                  alt={`${user.username}'s profile`}
                  className="w-10 h-10 rounded-full border border-white"
                />
                {isOnlineUser(user._id) && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full shadow-lg animate-bounce"></span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{user.username}</span>
                <span className="text-xs text-gray-400 truncate w-32">
                  {user.email}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Logout */}
        {user && (
          <div
            onClick={handleLogout}
            className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 cursor-pointer rounded-lg transition-colors"
          >
            <FaDoorClosed />
            <span>Logout</span>
          </div>
        )}
      </aside>
      
      {/* Main Content Area */}
      <main className={`flex-1 p-4 transition-all duration-300 w-full ${!isSidebarOpen ? 'ml-0' : 'md:ml-64'}`}>
        {/* Welcome */}
        <div className="flex items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
          <div className="w-20 h-20">
            👋
          </div>
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
              Hey {user?.username || "Guest"}! 👋
            </h1>
            <p className="text-lg text-gray-300 mt-2">
              Ready to <strong>connect with friends instantly?</strong>
              Just <strong>select a user</strong> and start your video call! 🎥✨
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-sm mb-6">
          <h2 className="text-lg font-semibold mb-2">💡 How to Start a Video Call?</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-400">
            <li>📌 Open the sidebar to see online users.</li>
            <li>🔍 Use the search bar to find a specific person.</li>
            <li>🎥 Click on a user to start a video call instantly!</li>
          </ul>
        </div>

        {/* Selected User Info */}
        {modalUser && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-2">Selected User: {modalUser.username}</h3>
            <p className="text-gray-600">{modalUser.email}</p>
          </div>
        )}
      </main>
    </div>
  );
}
export default Dashboard;