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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalUser, setModalUser] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const hasJoined = useRef(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const connectionRef=useRef();
  const myVideo=useRef();
  const[stream,setStream] = useState(null);
  const receiverVideo=useRef();
  const[showReceiverDetailsPopUp,setShowReceiverDetailsPopUp] = useState(false);
  const[showReceiverDetails,setShowReceiverDetails] = useState(null);
  
  // Call-related states
  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [rejectorData, setRejectorData] = useState(null);
  const [receiveCall, setReceiveCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerName, setCallerName] = useState('');
  const[callerSignal, setCallerSignal] = useState(null);
  

  // Call functions
  const startCall = async () => {
    // TODO: Implement call functionality
    try{
      const currentStream= await navigator.mediaDevices.getUserMedia({video:true,audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      setStream(currentStream);
      if(myVideo.current){
        myVideo.current.srcObject=currentStream;

       myVideo.current.muted=true;
       myVideo.current.volume=0;
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
      peerInstance.on("stream",(receiverStream)=>{
        if(receiverVideo.current){
          receiverVideo.current.srcObject = receiverStream;
          receiverVideo.current.muted = false;
          receiverVideo.current.volume = 1.0;
        }
      });
      
      peerInstance.on('stream', (remoteStream) => {
        if(myVideo.current){
          myVideo.current.srcObject = remoteStream;
          myVideo.current.play();
        }
      });
      
      connectionRef.current = peerInstance;
    }
    catch(error){
      console.error('Error starting call:', error);
    }
  };
  
  const endCallCleanup = () => {
    if(connectionRef.current){
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    if(stream){
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCallRejectedPopUp(false);
    setShowReceiverDetailsPopUp(false);
    setSelectedUser(null);
    setModalUser(null);
    setIsSidebarOpen(true);
  };
  
  const handleAcceptCall = () => {
    setCallAccepted(true);
    setReceiveCall(false);
    // TODO: Implement accept call functionality
  };
  
  const handleRejectCall = () => {
    const socketInstance = getSocket();
    if(socketInstance && caller){
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
      if (user && socketInstance && !hasJoined.current){
        socketInstance.emit('join',{id:user._id,name:user.username});
        hasJoined.current=true;
      }
    };
    
    // If already connected, join immediately
    if (socketInstance?.connected && user && !hasJoined.current) {
      socketInstance.emit('join',{id:user._id,name:user.username});
      hasJoined.current=true;
    } else if (socketInstance) {
      // Wait for connection
      socketInstance.on('connect', handleConnect);
    }
    
    socketInstance.on("me",(id)=>{
      setSocketId(id);
    });

    socketInstance.on("getOnlineUsers",(users)=>{
      // Exclude current user from online users list
      const filteredOnlineUsers = users.filter(u => u.id !== user?._id);
      setOnlineUsers(filteredOnlineUsers);
    });
    
    socketInstance.on("callUser",(data)=>{
      const {signal,from,name,profilePicture,email}=data;
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

    socketInstance.on("callRejected",(data)=>{
      setCallRejectedPopUp(true);
      setRejectorData({
        _id: data.from,
        username: data.name,
        name: data.name,
        profilePicture: data.profilePicture,
        email: data.email
      });
    });

    
    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("me");
      socketInstance.off("getOnlineUsers");
      socketInstance.off("callUser");
      socketInstance.off("callRejected");
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
     if(selectedUser === user._id){
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
      if(socketInstance){
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
              
              onClick={() => handelSelectedUser(user)}
            >
              <div className="relative">
                <img
                  src={user.profilePicture?.startsWith('/public/') 
                    ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${user.profilePicture}` 
                    : (user.profilePicture || "/default-avatar.png")}
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
        
  
        
        {selectedUser ? (
          <div>
            <video
              ref={receiverVideo}
              className="top-0 left-0 w-full h-full object-contain rounded-lg border-2 border-white shadow-2xl z-10"
              autoPlay
              playsInline
              muted
            ></video>
            <div className="relative w-full h-screen bg-black flex items-center justify-center">
              <video
                ref={myVideo}
                className="fixed bottom-[75px] md:bottom-4 right-4 w-32 h-40 md:w-56 md:h-52 object-cover rounded-lg border-2 border-white shadow-2xl z-10"
                autoPlay
                playsInline
                muted
              ></video>
            </div>
          </div>
        ) : (
          <div>
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
          </div>
        )}

        {/* Selected User Info */}
        {modalUser && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-2">Selected User: {modalUser.username}</h3>
            <p className="text-gray-600">{modalUser.email}</p>
          </div>
        )}

        {showReceiverDetailsPopUp && showReceiverDetails && (
           <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
             <div className="flex flex-col items-center">
               <p className='font-black text-xl mb-2'>User Details</p>
               <img
                 src={showReceiverDetails?.profilePicture?.startsWith('/public/') 
                   ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${showReceiverDetails.profilePicture}` 
                   : (showReceiverDetails?.profilePicture || "/default-avatar.png")}
                 alt="User"
                 className="w-20 h-20 rounded-full border-4 border-blue-500"
               />
               <h3 className="text-lg font-bold mt-3">{showReceiverDetails?.username}</h3>
               <p className="text-sm text-gray-500">{showReceiverDetails?.email}</p>
 
               <div className="flex gap-4 mt-5">
                 <button
                   onClick={() => {
                     setSelectedUser(showReceiverDetails?._id);
                     startCall();
                     setShowReceiverDetailsPopUp(false);
                   }}
                   className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg w-28 flex items-center gap-2 justify-center transition-colors font-semibold"
                 >
                   Call <FaPhoneAlt />
                 </button>
                 <button
                   onClick={() => {
                     setShowReceiverDetailsPopUp(false);
                     setShowReceiverDetails(null);
                     setSelectedUser(null);
                     setModalUser(null);
                   }}
                   className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg w-28 transition-colors font-semibold"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
       {/* Call rejection PopUp */}
       {callRejectedPopUp && (
         <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
             <div className="flex flex-col items-center">
               <p className="font-black text-xl mb-2">Call Rejected From...</p>
               <img
                 src={rejectorData?.profilePicture?.startsWith('/public/') 
                   ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${rejectorData.profilePicture}` 
                   : (rejectorData?.profilePicture || "/default-avatar.png")}
                 alt="Caller"
                 className="w-20 h-20 rounded-full border-4 border-green-500"
               />
               <h3 className="text-lg font-bold mt-3">{rejectorData?.name || rejectorData?.username}</h3>
               <div className="flex gap-4 mt-5">
                 <button
                   type="button"
                   onClick={() => {
                     startCall();
                   }}
                   className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center transition-colors font-semibold"
                 >
                   Call Again <FaPhoneAlt />
                 </button>
                 <button
                   type="button"
                   onClick={() => {
                     endCallCleanup();
                     setCallRejectedPopUp(false);
                   }}
                   className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center transition-colors font-semibold"
                 >
                   Back <FaPhoneSlash />
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
       {/* Incoming Call Modal */}
       {receiveCall && !callAccepted && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call From...</p>
              <img
                src={caller?.profilePicture?.startsWith('/public/') 
                  ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${caller.profilePicture}` 
                  : (caller?.profilePicture || "/default-avatar.png")}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
              />
              <h3 className="text-lg font-bold mt-3">{callerName || caller?.username}</h3>
              <p className="text-sm text-gray-500">{caller?.email}</p>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={handleAcceptCall}
                  style={{ backgroundColor: '#22c55e', color: 'white' }}
                  className="hover:bg-green-600 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center transition-colors font-semibold border-none"
                >
                  Accept <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={handleRejectCall}
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                  className="hover:bg-red-600 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center transition-colors font-semibold border-none"
                >
                  Reject <FaPhoneSlash />
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