import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import UploadPage from './pages/UploadPage'
import ResultPage from './pages/ResultPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/results/:id" element={<ResultPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </>
  )
}
