import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { FaTimes, FaDoorClosed, FaBars, FaPhoneAlt, FaPhoneSlash } from 'react-icons/fa'
import apiClient from '../../apiClient'
import { getSocket, disconnectSocket } from '../socket/Socket'
import Peer from "simple-peer";

function Dashboard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  
  // Redirect admin users to admin page
  useEffect(() => {
    if (user?.isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalUser, setModalUser] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const hasJoined = useRef(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const connectionRef = useRef();
  const myVideo = useRef();
  const [stream, setStream] = useState(null);
  const receiverVideo = useRef();
  const [showReceiverDetailsPopUp, setShowReceiverDetailsPopUp] = useState(false);
  const [showReceiverDetails, setShowReceiverDetails] = useState(null);

  // Call-related states
  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [rejectorData, setRejectorData] = useState(null);
  const [receiveCall, setReceiveCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);


  // Call functions
  const startCall = async () => {
    // TODO: Implement call functionality
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;

        myVideo.current.muted = true;
        myVideo.current.volume = 0;
      }
      setIsSidebarOpen(false);

      const socketInstance = getSocket();
      const peerInstance = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream
      });

      peerInstance.on('signal', (data) => {
        socketInstance.emit('callUser', {
          userToCall: showReceiverDetails?._id,
          signal: data,
          from: user._id,
          name: user.username,
          profilePicture: user.profilePicture,
          email: user.email,
        });
      });
      peerInstance.on('stream', (remoteStream) => {
        if (receiverVideo.current) {
          receiverVideo.current.srcObject = remoteStream;
          receiverVideo.current.muted = false;
          receiverVideo.current.volume = 1.0;
        }
      });

      socketInstance.once("callAccepted", (data) => {
        setCallAccepted(true);
        setCallRejectedPopUp(false);
        if (data.signal) {
          peerInstance.signal(data.signal);
        }
      });

      connectionRef.current = peerInstance;
      setShowReceiverDetailsPopUp(false);
    }

    catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const endCallCleanup = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCallRejectedPopUp(false);
    setShowReceiverDetailsPopUp(false);
    setSelectedUser(null);
    setModalUser(null);
    setCallAccepted(false);
    setReceiveCall(false);
    setCaller(null);
    setCallerName('');
    setCallerSignal(null);
    setIsSidebarOpen(true);
  };

  const handleAcceptCall = async () => {
    setCallAccepted(true);
    setReceiveCall(false);
    setIsSidebarOpen(false);

    try {
      const socketInstance = getSocket();
      let currentStream = stream;

      // Check all possible sources for an existing stream
      if (!currentStream) {
        // Check myVideo element
        if (myVideo.current?.srcObject instanceof MediaStream) {
          const existingStream = myVideo.current.srcObject;
          const hasActiveTracks = existingStream.getTracks().some(track => track.readyState === 'live');
          if (hasActiveTracks) {
            currentStream = existingStream;
          }
        }
        // Check receiverVideo element
        if (!currentStream && receiverVideo.current?.srcObject instanceof MediaStream) {
          const existingStream = receiverVideo.current.srcObject;
          const hasActiveTracks = existingStream.getTracks().some(track => track.readyState === 'live');
          if (hasActiveTracks) {
            currentStream = existingStream;
          }
        }
      }

      // Only request new media if we don't have an active stream
      if (!currentStream) {
        try {
          currentStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          setStream(currentStream);
        } catch (mediaError) {
          // If device is in use, try to get audio only
          if (mediaError.name === 'NotReadableError' || mediaError.name === 'NotAllowedError') {
            try {
              currentStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
              });
              setStream(currentStream);
            } catch (audioError) {
              console.error('Could not access media devices:', audioError);
              // Continue without stream - peer connection will still work for receiving
              currentStream = null;
            }
          } else {
            throw mediaError;
          }
        }
      }

      if (currentStream) {
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
          myVideo.current.muted = true;
          myVideo.current.volume = 0;
        }
        currentStream.getTracks().forEach(track => (track.enabled = true));
      }

      const peerInstance = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream || undefined
      });

      peerInstance.on('signal', (data) => {
        socketInstance.emit('AnswerCall', {
          signal: data,
          from: user._id,
          name: user.username,
          profilePicture: user.profilePicture,
          email: user.email,
          to: caller?._id,
        });
      });

      peerInstance.on('stream', (remoteStream) => {
        if (receiverVideo.current) {
          receiverVideo.current.srcObject = remoteStream;
          receiverVideo.current.muted = false;
          receiverVideo.current.volume = 1.0;
        }
      });

      if (callerSignal) {
        peerInstance.signal(callerSignal);
      }

      connectionRef.current = peerInstance;
    } catch (error) {
      console.error('Error accepting call:', error);
      // Reset states on error
      setCallAccepted(false);
      setReceiveCall(true);
    }
  };

  const handleEndCall = () => {
    const socketInstance = getSocket();
    
    // Notify the other party that the call is ending
    if (socketInstance) {
      if (selectedUser) {
        // Caller ending the call - notify receiver
        socketInstance.emit('endCall', {
          to: selectedUser,
          from: user._id,
          name: user.username
        });
      } else if (caller) {
        // Receiver ending the call - notify caller
        socketInstance.emit('endCall', {
          to: caller._id,
          from: user._id,
          name: user.username
        });
      }
    }
    
    // Clean up locally
    endCallCleanup();
  };

  const handleRejectCall = () => {
    const socketInstance = getSocket();
    if (socketInstance && caller) {
      socketInstance.emit('rejectCall', {
        to: caller._id,
        from: user._id,
        name: user.username,
        profilePicture: user.profilePicture,
        email: user.email
      });
    }
    setReceiveCall(false);
    setCallAccepted(false);
    setCaller(null);
    setCallerName('');
    setCallerSignal(null);
  };
  // Initialize socket connection
  useEffect(() => {
    const socketInstance = getSocket();

    // Wait for socket to connect before joining
    const handleConnect = () => {
      if (user && socketInstance && !hasJoined.current) {
        socketInstance.emit('join', { id: user._id, name: user.username });
        hasJoined.current = true;
      }
    };

    // If already connected, join immediately
    if (socketInstance?.connected && user && !hasJoined.current) {
      socketInstance.emit('join', { id: user._id, name: user.username });
      hasJoined.current = true;
    } else if (socketInstance) {
      // Wait for connection
      socketInstance.on('connect', handleConnect);
    }

    socketInstance.on("me", (id) => {
      setSocketId(id);
    });

    socketInstance.on("getOnlineUsers", (users) => {
      // Exclude current user from online users list
      const filteredOnlineUsers = users.filter(u => u.id !== user?._id);
      setOnlineUsers(filteredOnlineUsers);
    });

    socketInstance.on("callUser", (data) => {
      const { signal, from, name, profilePicture, email } = data;
      setCaller({
        _id: from,
        username: name,
        profilePicture: profilePicture,
        email: email
      });
      setCallerName(name);
      setCallerSignal(signal);
      setReceiveCall(true);
    });

    socketInstance.on("callRejected", (data) => {
      setCallRejectedPopUp(true);
      setRejectorData({
        _id: data.from,
        username: data.name,
        name: data.name,
        profilePicture: data.profilePicture,
        email: data.email
      });
    });

    socketInstance.on("endCall", (data) => {
      // Other party ended the call - clean up
      endCallCleanup();
    });

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("me");
      socketInstance.off("getOnlineUsers");
      socketInstance.off("callUser");
      socketInstance.off("callRejected");
      socketInstance.off("endCall");
    };
  }, [user]);

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
    return onlineUsers.some(u => u.id === userId);
  };

  // Handle user selection
  const handelSelectedUser = (user) => {
    // Toggle selection - if same user is clicked, deselect
    if (selectedUser === user._id) {
      setSelectedUser(null);
      setModalUser(null);
      setShowReceiverDetailsPopUp(false);
      setShowReceiverDetails(null);
    } else {
      setSelectedUser(user._id);
      setModalUser(user);
      setShowReceiverDetailsPopUp(true);
      setShowReceiverDetails(user);
    }
  };


  // Handle logout
  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
      // Disconnect socket
      const socketInstance = getSocket();
      if (socketInstance) {
        socketInstance.disconnect();
        disconnectSocket();
      }
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      {/* Toggle Sidebar Button - Fixed on Left Side */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 p-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl transition-all duration-300 shadow-2xl border-2 border-white/40 backdrop-blur-md transform hover:scale-110 active:scale-95"
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <FaBars className="w-6 h-6 text-blue-400 drop-shadow-lg" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white w-64 h-screen p-5 space-y-4 fixed top-0 left-0 z-20 transition-all duration-300 ease-in-out shadow-2xl ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/20">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-300 to-purple-300 text-transparent bg-clip-text">Users</h1>
          <button
            type="button"
            className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 p-2.5 rounded-xl transition-all duration-300 flex-shrink-0 shadow-xl border-2 border-white/40 backdrop-blur-md transform hover:scale-110 active:scale-95"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <FaTimes className="w-5 h-5 text-blue-400 drop-shadow-lg" />
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md text-white placeholder-white/60 border-2 border-white/20 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-300 shadow-lg"
        />

        {/* User List */}
        <ul className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-2 custom-scrollbar">
          {filteredUsers.map((user) => (
            <li
              key={user._id}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${selectedUser === user._id
                ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-xl shadow-green-500/50 border-2 border-white/50"
                : "bg-white/10 backdrop-blur-md hover:bg-white/20 border-2 border-white/20 hover:border-white/40"
                }`}
              onClick={() => handelSelectedUser(user)}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={user.profilePicture?.startsWith('/public/')
                    ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${user.profilePicture}`
                    : (user.profilePicture || "/default-avatar.png")}
                  alt={`${user.username}'s profile`}
                  className="w-12 h-12 rounded-full border-2 border-white/50 shadow-lg object-cover"
                />
                {isOnlineUser(user._id) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-indigo-900 rounded-full shadow-lg animate-pulse"></span>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-sm truncate">{user.username}</span>
                <span className="text-xs text-white/70 truncate">
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
            className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-3 cursor-pointer rounded-xl transition-all duration-300 shadow-xl border-2 border-white/30 backdrop-blur-md transform hover:scale-105 active:scale-95"
          >
            <FaDoorClosed className="text-lg" />
            <span className="font-semibold">Logout</span>
          </div>
        )}
      </aside>

      {/* Main Content Area */}

      <main className={`flex-1 p-6 transition-all duration-300 w-full ${!isSidebarOpen ? 'ml-0' : 'md:ml-64'}`}>
        {/* Welcome */}



        {selectedUser || receiveCall || callAccepted ? (
          <div className='relative w-full h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center -m-6'>
            <video
              ref={receiverVideo}
              className="top-0 left-0 w-full h-full object-contain rounded-2xl border-4 border-white/20 shadow-2xl z-10"
              autoPlay
              playsInline
              muted
            ></video>
            <div className="relative w-full h-screen bg-transparent flex items-center justify-center">
              <video
                ref={myVideo}
                className="fixed bottom-[75px] md:bottom-6 right-6 w-32 h-40 md:w-64 md:h-56 object-cover rounded-2xl border-4 border-white/40 shadow-2xl z-10 backdrop-blur-sm"
                autoPlay
                playsInline
                muted
              ></video>
            </div>
            <div className="absolute bottom-6 w-full flex justify-center gap-4 z-50">
              <button
                type="button"
                className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 p-5 rounded-full shadow-2xl cursor-pointer z-50 relative border-4 border-white/40 backdrop-blur-md transform hover:scale-110 active:scale-95 transition-all duration-300"
                onClick={handleEndCall}
              >
                <FaPhoneSlash size={28} className="text-blue-400 drop-shadow-lg" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-6 mb-8 bg-gradient-to-br from-white to-blue-50/50 p-8 rounded-2xl shadow-2xl border-2 border-blue-100/50 backdrop-blur-sm transform hover:scale-[1.01] transition-all duration-300">
              <div className="w-24 h-24 text-6xl animate-bounce">
                👋
              </div>
              <div className="flex-1">
                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-transparent bg-clip-text mb-3">
                  Hey {user?.username || "Guest"}! 👋
                </h1>
                <p className="text-xl text-gray-700 mt-2 leading-relaxed">
                  Ready to <strong className="text-blue-600">connect with friends instantly?</strong>
                  <br />
                  Just <strong className="text-purple-600">select a user</strong> and start your video call! 🎥✨
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl shadow-xl border-2 border-indigo-100/50 backdrop-blur-sm mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <span className="text-3xl">💡</span> How to Start a Video Call?
              </h2>
              <ul className="list-none space-y-3 text-gray-700">
                <li className="flex items-center gap-3 p-3 bg-white/60 rounded-xl backdrop-blur-sm">
                  <span className="text-2xl">📌</span>
                  <span className="font-semibold">Open the sidebar to see online users.</span>
                </li>
                <li className="flex items-center gap-3 p-3 bg-white/60 rounded-xl backdrop-blur-sm">
                  <span className="text-2xl">🔍</span>
                  <span className="font-semibold">Use the search bar to find a specific person.</span>
                </li>
                <li className="flex items-center gap-3 p-3 bg-white/60 rounded-xl backdrop-blur-sm">
                  <span className="text-2xl">🎥</span>
                  <span className="font-semibold">Click on a user to start a video call instantly!</span>
                </li>
              </ul>
            </div>
          </div>
        )}


        {showReceiverDetailsPopUp && showReceiverDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-white to-blue-50/80 rounded-2xl shadow-2xl max-w-md w-full p-8 border-4 border-white/50 backdrop-blur-xl transform animate-scaleIn">
              <div className="flex flex-col items-center">
                <p className='font-black text-2xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text'>User Details</p>
                <div className="relative mb-4">
                  <img
                    src={showReceiverDetails?.profilePicture?.startsWith('/public/')
                      ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${showReceiverDetails.profilePicture}`
                      : (showReceiverDetails?.profilePicture || "/default-avatar.png")}
                    alt="User"
                    className="w-24 h-24 rounded-full border-4 border-gradient-to-r from-blue-500 to-purple-500 shadow-2xl object-cover"
                  />
                  {isOnlineUser(showReceiverDetails?._id) && (
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 border-4 border-white rounded-full shadow-lg animate-pulse"></span>
                  )}
                </div>
                <h3 className="text-xl font-bold mt-2 text-gray-800">{showReceiverDetails?.username}</h3>
                <p className="text-sm text-gray-600 mt-1">{showReceiverDetails?.email}</p>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => {
                      setSelectedUser(showReceiverDetails?._id);
                      startCall();
                      setShowReceiverDetailsPopUp(false);
                    }}
                    className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-6 py-3 rounded-xl w-32 flex items-center gap-2 justify-center transition-all duration-300 font-bold shadow-2xl border-2 border-white/40 backdrop-blur-sm transform hover:scale-105 active:scale-95"
                  >
                    <span className="text-white">Call</span> <FaPhoneAlt className="text-blue-400 drop-shadow-lg" />
                  </button>
                  <button
                    onClick={() => {
                      setShowReceiverDetailsPopUp(false);
                      setShowReceiverDetails(null);
                      setSelectedUser(null);
                      setModalUser(null);
                    }}
                    className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-6 py-3 rounded-xl w-32 flex items-center gap-2 justify-center transition-all duration-300 font-bold shadow-2xl border-2 border-white/40 backdrop-blur-sm transform hover:scale-105 active:scale-95"
                  >
                    <span className="text-white font-bold drop-shadow-lg">Cancel</span> <FaTimes className="text-blue-400 drop-shadow-lg" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Call rejection PopUp */}
        {callRejectedPopUp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-white to-red-50/80 rounded-2xl shadow-2xl max-w-md w-full p-8 border-4 border-white/50 backdrop-blur-xl transform animate-scaleIn">
              <div className="flex flex-col items-center">
                <p className="font-black text-2xl mb-4 bg-gradient-to-r from-red-600 to-orange-600 text-transparent bg-clip-text">Call Rejected From...</p>
                <div className="relative mb-4">
                  <img
                    src={rejectorData?.profilePicture?.startsWith('/public/')
                      ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${rejectorData.profilePicture}`
                      : (rejectorData?.profilePicture || "/default-avatar.png")}
                    alt="Caller"
                    className="w-24 h-24 rounded-full border-4 border-red-500 shadow-2xl object-cover"
                  />
                </div>
                <h3 className="text-xl font-bold mt-2 text-gray-800">{rejectorData?.name || rejectorData?.username}</h3>
                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      startCall();
                    }}
                    className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-6 py-3 rounded-xl w-36 flex gap-2 justify-center items-center transition-all duration-300 font-bold shadow-2xl border-2 border-white/40 backdrop-blur-sm transform hover:scale-105 active:scale-95"
                  >
                    <span className="text-white">Call Again</span> <FaPhoneAlt className="text-blue-400 drop-shadow-lg" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      endCallCleanup();
                      setCallRejectedPopUp(false);
                    }}
                    className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-6 py-3 rounded-xl w-32 flex gap-2 justify-center items-center transition-all duration-300 font-bold shadow-2xl border-2 border-white/40 backdrop-blur-sm transform hover:scale-105 active:scale-95"
                  >
                    <span className="text-white">Back</span> <FaPhoneSlash className="text-blue-400 drop-shadow-lg" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Incoming Call Modal */}
        {receiveCall && !callAccepted && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-white to-green-50/80 rounded-2xl shadow-2xl max-w-md w-full p-8 border-4 border-white/50 backdrop-blur-xl transform animate-scaleIn animate-pulse-border">
              <div className="flex flex-col items-center">
                <p className="font-black text-2xl mb-4 bg-gradient-to-r from-green-600 to-emerald-600 text-transparent bg-clip-text animate-pulse">Incoming Call...</p>
                <div className="relative mb-4">
                  <img
                    src={caller?.profilePicture?.startsWith('/public/')
                      ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${caller.profilePicture}`
                      : (caller?.profilePicture || "/default-avatar.png")}
                    alt="Caller"
                    className="w-24 h-24 rounded-full border-4 border-green-500 shadow-2xl object-cover animate-pulse"
                  />
                </div>
                <h3 className="text-xl font-bold mt-2 text-gray-800">{callerName || caller?.username}</h3>
                <p className="text-sm text-gray-600 mt-1">{caller?.email}</p>
                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={handleAcceptCall}
                    className="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 py-3 rounded-xl w-32 flex gap-2 justify-center items-center transition-all duration-300 font-bold shadow-2xl border-2 border-white/40 backdrop-blur-sm transform hover:scale-110 active:scale-95"
                  >
                    <span className="text-white">Accept</span> <FaPhoneAlt className="text-blue-400 drop-shadow-lg" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectCall}
                    className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-6 py-3 rounded-xl w-32 flex gap-2 justify-center items-center transition-all duration-300 font-bold shadow-2xl border-2 border-white/40 backdrop-blur-sm transform hover:scale-110 active:scale-95"
                  >
                    <span className="text-white">Reject</span> <FaPhoneSlash className="text-blue-400 drop-shadow-lg" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>

  );
}
export default Dashboard;