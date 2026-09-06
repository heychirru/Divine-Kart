import { useAuth } from '@/hooks/useAuth';
import { sendLoginOtp, verifyLoginOtp } from '@/services/authService';
import { ROUTES } from '@/utils/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^\d+$/, 'Phone number must contain only numbers'),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

const Login = () => {
  const navigate = useNavigate();
  const { login: setAuthState } = useAuth();
  const [step, setStep] = useState(1);
  const [loginMethod, setLoginMethod] = useState('phone');
  const [identifier, setIdentifier] = useState('');
  

  // Step 1 forms
  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const phoneForm = useForm({ resolver: zodResolver(phoneSchema) });

  // Step 2 form
  const otpForm = useForm({ resolver: zodResolver(otpSchema) });

  const sendOtpMutation = useMutation({
    mutationFn: (data) => {
      if (loginMethod === 'email') {
        return sendLoginOtp(data.email);
      }
      return sendLoginOtp({ phone: data.phone });
    },
    onSuccess: (data, variables) => {
      setIdentifier(loginMethod === 'email' ? variables.email : variables.phone);
      setStep(2);
      toast.success(
        loginMethod === 'email'
          ? 'OTP sent to your email!'
          : 'OTP sent to your phone number!'
      );
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (data) =>
      verifyLoginOtp(
        loginMethod === 'email' ? { email: identifier } : { phone: identifier },
        data.otp
      ),
    onSuccess: (data) => {
      setAuthState(data.user, data.token, data.refreshToken);
      toast.success('Login successful!');
      navigate(ROUTES.HOME);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: () =>
      sendLoginOtp(
        loginMethod === 'email' ? { email: identifier } : { phone: identifier }
      ),
    onSuccess: () =>
      toast.success(
        loginMethod === 'email'
          ? 'New OTP sent to your email!'
          : 'New OTP sent to your phone!'
      ),
    onError: () => toast.error('Could not resend OTP'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Divine-Kart</h1>
          <p className="text-gray-600">
            {step === 1
              ? 'Sign in to your account using email or phone'
              : `Enter the OTP sent to your ${loginMethod === 'email' ? 'email' : 'phone'}`}
          </p>
        </div>

        {/* Step 1 – Identifier (Email or Phone) */}
        {step === 1 && (
          <>
            {loginMethod === 'email' ? (
              <form
                onSubmit={emailForm.handleSubmit((d) => sendOtpMutation.mutate(d))}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...emailForm.register('email')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="you@example.com"
                  />
                  {emailForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={sendOtpMutation.isPending}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendOtpMutation.isPending ? 'Sending OTP…' : 'Get OTP'}
                </button>
              </form>
            ) : (
              <form
                onSubmit={phoneForm.handleSubmit((d) => sendOtpMutation.mutate(d))}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    {...phoneForm.register('phone')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="10-digit mobile number"
                  />
                  {phoneForm.formState.errors.phone && (
                    <p className="mt-1 text-sm text-red-600">
                      {phoneForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={sendOtpMutation.isPending}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendOtpMutation.isPending ? 'Sending OTP…' : 'Get OTP'}
                </button>
              </form>
            )}

            <div className="mt-4 text-center text-sm text-gray-600">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod((prev) => {
                    const next = prev === 'email' ? 'phone' : 'email';
                    if (next === 'email') {
                      phoneForm.reset();
                    } else {
                      emailForm.reset();
                    }
                    return next;
                  });
                }}
                className="text-primary font-semibold hover:underline"
              >
                {loginMethod === 'email'
                  ? 'Use phone number instead'
                  : 'Use email instead'}
              </button>
            </div>
          </>
        )}

        {/* Step 2 – OTP */}
        {step === 2 && (
          <form onSubmit={otpForm.handleSubmit((d) => verifyOtpMutation.mutate(d))} className="space-y-5">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                One-Time Password
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Sent to{' '}
                <span className="font-semibold text-gray-700">
                  {identifier}
                </span>
              </p>

              {/* Dev OTP removed for production */}

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                {...otpForm.register('otp')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-3xl tracking-[0.6em] font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="──────"
              />
              {otpForm.formState.errors.otp && (
                <p className="mt-1 text-sm text-red-600 text-center">{otpForm.formState.errors.otp.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifyOtpMutation.isPending}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify & Sign In'}
            </button>

            <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
              <span>
                Didn't receive it?{' '}
                <button
                  type="button"
                  onClick={() => resendOtpMutation.mutate()}
                  disabled={resendOtpMutation.isPending}
                  className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendOtpMutation.isPending ? 'Sending…' : 'Resend OTP'}
                </button>
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  otpForm.reset();
                }}
                className="text-gray-400 hover:text-gray-600 hover:underline text-xs"
              >
                ← Change {loginMethod === 'email' ? 'email' : 'phone'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;
