import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, ArrowRight, RefreshCw } from "lucide-react";
import api from "../services/api";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
      return;
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < text.length; i++) {
      newOtp[i] = text[i];
    }
    setOtp(newOtp);
    setError("");
    const focusIndex = Math.min(text.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await api.post("/auth/verify-otp", { email, otp: otpString });
      navigate("/reset-password", { state: { email } });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Invalid OTP";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(30);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to resend OTP";
      setError(msg);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .lf-page-bg { min-height: 100vh; background-color: #000000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .lf-card-wrap { width: 100%; max-width: 440px; }
        .lf-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.25); border-radius: 100px; padding: 6px 14px; margin-bottom: 1.5rem; font-size: 12px; color: #f97316; font-weight: 500; letter-spacing: 0.04em; font-family: 'DM Sans', sans-serif; }
        .lf-badge-dot { width: 6px; height: 6px; background: #f97316; border-radius: 50%; animation: lf-pulse 2s infinite; }
        @keyframes lf-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        .lf-heading { font-family: 'Syne', sans-serif; font-size: 44px; font-weight: 800; color: #ffffff; line-height: 1.05; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
        .lf-heading-accent { color: #f97316; }
        .lf-subtext { font-size: 14px; color: #666666; font-family: 'DM Sans', sans-serif; margin: 0 0 2rem; }
        .lf-panel { background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 20px; padding: 2rem; }
        .lf-otp-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 1.5rem; }
        .lf-otp-box { width: 50px; height: 56px; background: #111111; border: 1px solid #222222; border-radius: 12px; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .lf-otp-box:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.08); }
        .lf-otp-box.lf-input-error { border-color: #dc2626 !important; }
        .lf-error-msg { margin-top: -0.5rem; margin-bottom: 1rem; font-size: 13.5px; color: #f87171; font-family: 'DM Sans', sans-serif; font-weight: 500; text-align: center; }
        .lf-general-error { background: rgba(220,38,38,0.08); border-left: 3px solid #dc2626; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 14px; color: #f87171; margin-bottom: 1.25rem; font-family: 'DM Sans', sans-serif; }
        .lf-btn-submit { width: 100%; background: #f97316; color: #000000; border: none; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700; font-family: 'Syne', sans-serif; letter-spacing: 0.02em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
        .lf-btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(249,115,22,0.3); }
        .lf-btn-submit:active:not(:disabled) { transform: translateY(0); }
        .lf-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .lf-resend-row { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 1.25rem; font-size: 13px; font-family: 'DM Sans', sans-serif; }
        .lf-resend-link { color: #f97316; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; }
        .lf-resend-link:hover { text-decoration: underline; }
        .lf-resend-disabled { color: #444444; cursor: not-allowed; }
        .lf-timer { color: #666666; }
        .lf-back-link { text-align: center; margin-top: 1rem; font-size: 13px; color: #666666; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: color 0.2s; }
        .lf-back-link:hover { color: #f97316; }
        .lf-footer-note { text-align: center; margin-top: 1.5rem; font-size: 11px; color: #333333; font-family: 'DM Sans', sans-serif; letter-spacing: 0.02em; }
      `}</style>

      <div className="lf-page-bg">
        <div className="lf-card-wrap">
          <div className="lf-badge">
            <div className="lf-badge-dot" />
            LeadFinder Intelligence Platform
          </div>

          <h1 className="lf-heading">
            Verify <span className="lf-heading-accent">OTP</span>
          </h1>
          <p className="lf-subtext">Enter the 6-digit OTP sent to your email.</p>

          <div className="lf-panel">
            {error && <div className="lf-general-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="lf-otp-row">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    className={`lf-otp-box${error ? " lf-input-error" : ""}`}
                    disabled={isLoading}
                  />
                ))}
              </div>

              <button type="submit" className="lf-btn-submit" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> Verifying...</>
                ) : (
                  <><>Verify OTP</> <ArrowRight size={20} /></>
                )}
              </button>
            </form>

            <div className="lf-resend-row">
              {canResend ? (
                <span className="lf-resend-link" onClick={handleResend}>
                  <RefreshCw size={14} /> Resend OTP
                </span>
              ) : (
                <span className="lf-resend-disabled">
                  Resend OTP in <span className="lf-timer">{resendTimer}s</span>
                </span>
              )}
            </div>

            <div className="lf-back-link" onClick={() => navigate("/forgot-password")}>
              Back to Forgot Password
            </div>
          </div>

          <p className="lf-footer-note">By continuing, you agree to our Terms of Service</p>
        </div>
      </div>
    </>
  );
}
