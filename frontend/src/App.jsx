import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import RoleSelect from "./pages/RoleSelect";
import FarmerSignup from "./pages/FarmerSignup";
import DealerSignup from "./pages/DealerSignup";
import OTPVerify from "./pages/OTPVerify";
import SignIn from "./pages/SignIn";
import UpdateNotification from "./component/UpdateNotification";
import InstallPrompt from "./component/InstallPrompt";
import Scan from "./pages/Scan";
import Results from "./pages/Results";
import Checkout from "./pages/Checkout";
import FarmerDashboard from "./pages/FarmerDashboard";
import History from "./pages/History";
import Wallet from "./pages/Wallet";
import DealerDashboard from "./pages/DealerDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute, { AuthRoute } from "./component/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import OrderTracking from "./pages/OrderTracking";
import DealerPending from "./pages/DealerPending";
import DealerDetails from "./pages/DealerDetails";
import FarmerDetails from "./pages/FarmerDetails";
import FarmerWelcome from "./pages/FarmerWelcome";
import GlobalToast from "./component/GlobalToast";

export default function App() {
  return (
    <>
      <Routes>
        {/* Auth pages — redirect to dashboard if already logged in */}
        <Route path="/" element={<AuthRoute><Landing /></AuthRoute>} />
        <Route path="/role" element={<AuthRoute><RoleSelect /></AuthRoute>} />
        <Route path="/signin" element={<AuthRoute><SignIn /></AuthRoute>} />
        <Route path="/signup/farmer" element={<AuthRoute><FarmerSignup /></AuthRoute>} />
        <Route path="/signup/dealer" element={<AuthRoute><DealerSignup /></AuthRoute>} />

        {/* OTP + signup detail pages — no auth wrapping, user not yet authenticated */}
        <Route path="/verify-otp" element={<OTPVerify />} />
        <Route path="/signup/farmer/details" element={<FarmerDetails />} />
        <Route path="/signup/dealer/details" element={<DealerDetails />} />
        <Route path="/signup/farmer/welcome" element={<FarmerWelcome />} />
        <Route path="/dealer-pending" element={<DealerPending />} />

        {/* Farmer routes */}
        <Route path="/scan" element={<ProtectedRoute requiredRole="farmer"><Scan /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute requiredRole="farmer"><Results /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute requiredRole="farmer"><Checkout /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requiredRole="farmer"><FarmerDashboard /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute requiredRole="farmer"><History /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute requiredRole="farmer"><Wallet /></ProtectedRoute>} />
        <Route path="/order-tracking" element={<ProtectedRoute requiredRole="farmer"><OrderTracking /></ProtectedRoute>} />

        {/* Dealer routes */}
        <Route path="/dealer" element={<ProtectedRoute requiredRole="dealer"><DealerDashboard /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <UpdateNotification />
      <InstallPrompt />
      <GlobalToast />
    </>
  );
}