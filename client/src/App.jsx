import './App.css'
import Auth from './pages/Auth/Auth'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/dashboard/Dashboard'
import Admin from './pages/admin/Admin'
import IsLogin from './pages/auth/IsLogin'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<IsLogin />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="/signup" element={<Auth type="signup"/>} />
        <Route path="/login" element={<Auth type="login"/>} />
      </Routes>
    </BrowserRouter>
  )
} 

export default App
