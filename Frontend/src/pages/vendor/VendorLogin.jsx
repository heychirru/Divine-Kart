import { getMyStore, sendVendorOtp, verifyVendorOtp } from '@/services/storeService';
import useVendorStore from '@/store/vendorStore';
import { VENDOR_ROUTES } from '@/utils/constants';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, ShieldCheck, Store } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const VendorLogin = () => {
  const navigate = useNavigate();
  const { login, vendor, token } = useVendorStore();
  const queryClient = useQueryClient();
  const isVendor = !!vendor && !!token;

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isVendor) navigate(VENDOR_ROUTES.DASHBOARD, { replace: true });
  }, [isVendor, navigate]);

  const startResendTimer = () => {
    setResendTimer(60);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email');
    setLoading(true);
    try {
      const res = await sendVendorOtp(email.trim().toLowerCase());
      toast.success('OTP sent! Check your email.');
      setStep(2);
      startResendTimer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error('Please enter the OTP');
    setLoading(true);
    try {
      const data = await verifyVendorOtp(email.trim().toLowerCase(), otp.trim());
      let storeData = null;
      try {
        localStorage.setItem('vendor-token', data.token);
        const storeRes = await getMyStore();
        storeData = storeRes?.data ?? null;
      } catch { /* store may not exist yet */ }

      login({ vendor: data.user, store: storeData, token: data.token });
      queryClient.clear();
      toast.success(`Welcome back${data.user?.name ? `, ${data.user.name}` : ''}!`);
      navigate(VENDOR_ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const res = await sendVendorOtp(email.trim().toLowerCase());
      toast.success('OTP resent!');
      startResendTimer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0E1117] via-[#161B27] to-[#0E1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-2xl mb-4 border border-amber-500/20">
            <Store className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1 uppercase italic tracking-tight">Divine-Kart</h1>
          <p className="text-amber-400/80 text-xs font-bold uppercase tracking-widest">Vendor Portal</p>
        </div>

        <div className="bg-[#161B27] border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {step === 1 ? (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Sign in to your store</h2>
              <p className="text-gray-400 text-sm mb-6">We'll send a one-time code to your registered email.</p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Store Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="vendor@example.com" required
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => { setStep(1); setOtp(''); }}
                className="text-xs text-gray-500 hover:text-gray-300 mb-5 flex items-center gap-1 transition">
                ← Change email
              </button>
              <h2 className="text-xl font-bold text-white mb-1">Enter your OTP</h2>
              <p className="text-gray-400 text-sm mb-1">Sent to <span className="text-amber-400 font-semibold">{email}</span></p>
              <p className="text-gray-500 text-xs mb-4">Valid for 10 minutes.</p>

              {/* Dev OTP removed for production */}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">6-digit OTP</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" inputMode="numeric" maxLength={6} value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456" required
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm tracking-[0.4em] font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading || otp.length < 6}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Verifying…' : 'Verify & Login'}
                </button>
                <button type="button" onClick={handleResend} disabled={resendTimer > 0 || loading}
                  className="w-full text-sm text-gray-500 hover:text-amber-400 disabled:opacity-40 transition font-medium">
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-500">
              Don't have a store?{' '}
              <Link to={VENDOR_ROUTES.REGISTER} className="text-amber-400 font-bold hover:underline">Register your store</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorLogin;
