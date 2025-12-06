import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import apiClient from '../../apiClient';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaUserShield, FaTrash, FaSearch, FaArrowLeft } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

const getAllUsers = async () => {
    try {
        const response = await apiClient.get('/admin/getAllUsers');
        return response.data.users;
    } catch (error) {
        console.error("Failed to fetch users", error);
        throw error;
    }
}

const deleteUser = async (username) => {
    try {
        const response = await apiClient.delete(`/admin/deleteUser/${username}`);
        return response.data.message;
    } catch (error) {
        console.error("Failed to delete user", error);
        throw error;
    }
}

const makeAdmin = async (username) => {
    try {
        const response = await apiClient.patch(`/admin/makeAdmin/${username}`);
        return response.data.message;
    } catch (error) {
        console.error("Failed to make admin", error);
        throw error;
    }
}

function Admin() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const fetchedUsers = await getAllUsers();
                
                setUsers(fetchedUsers || []);
            } catch (error) {
                console.error('Error fetching users:', error);
                toast.error(error.response?.data?.message || 'Failed to fetch users');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleDeleteUser = async (username) => {
        if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
            return;
        }
        try {
            await deleteUser(username);
            toast.success('User deleted successfully');
            // Refresh users list
            const fetchedUsers = await getAllUsers();
            setUsers(fetchedUsers || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleMakeAdmin = async (username) => {
        if (!window.confirm(`Are you sure you want to make "${username}" an admin?`)) {
            return;
        }
        try {
            await makeAdmin(username);
            toast.success('User promoted to admin successfully');
            // Refresh users list
            const fetchedUsers = await getAllUsers();
            setUsers(fetchedUsers || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to make admin');
        }
    };

    // Filter users based on search query
    const filteredUsers = users.filter((u) =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-white transition-all duration-300 shadow-lg transform hover:scale-110"
                        >
                            <FaArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-transparent bg-clip-text">
                                Admin Panel
                            </h1>
                            <p className="text-gray-600 mt-1">Manage all users</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Logged in as</p>
                        <p className="font-bold text-gray-800">{user?.username || 'Admin'}</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="🔍 Search users by name, username, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-lg"
                        />
                    </div>
                </div>

                {/* Users Count */}
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-gray-600 font-semibold">
                        Total Users: <span className="text-blue-600">{filteredUsers.length}</span>
                    </p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
                    </div>
                )}

                {/* Users Grid */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredUsers.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <FaUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">
                                    {searchQuery ? 'No users found matching your search' : 'No users found'}
                                </p>
                            </div>
                        ) : (
                            filteredUsers.map((userItem) => (
                                <div
                                    key={userItem._id || userItem.username}
                                    className="bg-gradient-to-br from-white to-blue-50/50 rounded-2xl p-6 shadow-xl border-2 border-gray-100/50 backdrop-blur-sm hover:shadow-2xl hover:scale-105 transition-all duration-300"
                                >
                                    {/* User Profile Picture */}
                                    <div className="flex flex-col items-center mb-4">
                                        <div className="relative">
                                            <img
                                                src={userItem.profilePicture?.startsWith('/public/')
                                                    ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${userItem.profilePicture}`
                                                    : (userItem.profilePicture || "/default-avatar.png")}
                                                alt={`${userItem.username}'s profile`}
                                                className="w-20 h-20 rounded-full border-4 border-gradient-to-r from-blue-500 to-purple-500 object-cover shadow-lg"
                                            />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 mt-3">{userItem.fullName || userItem.username}</h3>
                                        <p className="text-sm text-gray-600">@{userItem.username}</p>
                                    </div>

                                    {/* User Details */}
                                    <div className="mb-4 space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <FaUser className="text-blue-500 w-4 h-4" />
                                            <span className="text-gray-700 truncate">{userItem.email}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => handleMakeAdmin(userItem.username)}
                                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <FaUserShield className="w-4 h-4" />
                                            <span>Make Admin</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(userItem.username)}
                                            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <FaTrash className="w-4 h-4" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            <Toaster position="top-right" />
        </div>
    );
}

export default Admin;