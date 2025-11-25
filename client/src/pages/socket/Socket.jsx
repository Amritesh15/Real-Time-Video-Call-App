import {io} from "socket.io-client";

let socket;

const getSocket=()=>{
    if(!socket){
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        socket=io(socketUrl, {
            withCredentials: true
        });
    }
    return socket;
}

const disconnectSocket=()=>{
    if(socket){
        socket.disconnect();
        socket = null;
    }
}

export {getSocket, disconnectSocket};