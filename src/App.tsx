import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import FaceEnroll from './pages/FaceEnroll';
import FaceVerify from './pages/FaceVerify';
import FingerprintEnroll from './pages/FingerprintEnroll';
import FingerprintVerify from './pages/FingerprintVerify';
import Profile from './pages/Profile';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/face-enroll" element={<FaceEnroll />} />
        <Route path="/face-verify" element={<FaceVerify />} />
        <Route path="/fingerprint-enroll" element={<FingerprintEnroll />} />
        <Route path="/fingerprint-verify" element={<FingerprintVerify />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
