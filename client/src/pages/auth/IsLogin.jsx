import { useUser } from '../../context/UserContext'
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

function IsLogin() {
    const {user,loading} = useUser();
    if(loading){
        return <div>Loading...</div>
    }
    if(!user){
        return <Navigate to="/login" />
    }
    return <Outlet />
}

export default IsLogin