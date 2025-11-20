import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Auth from './pages/Auth/Auth'
import { Routes, Route, Router } from 'react-router-dom'


function App() {
  const [count, setCount] = useState(0)

  return (
   <Router>
    <Routes>
      <Route path="/signup" element={<Auth type="signup"/>} />
      <Route path="/login" element={<Auth type="login"/>} />
    </Routes>
   </Router>
  )
} 

export default App
