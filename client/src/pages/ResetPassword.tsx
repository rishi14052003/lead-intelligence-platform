import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import api from "../services/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
      return;
    }
  }, [email, navigate]);

  const validateForm = () => {
    if (!newPassword) {
      setError("New password is required");
      return false;
    }
    if (!/^(?=.*[A-Z])(?=.*\d)[a-zA-Z0-9!@#$%^&*]{8,}$/.test(newPassword)) {
      setError("Password must be 8+ chars with 1 uppercase and 1 number");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/auth/reset-password", { email, newPassword });
      setSuccess("Password updated successfully");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to update password";
      setError(msg);
    } finally {
      setIsLoading(false);
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
        .lf-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #555555; margin-bottom: 8px; font-family: 'DM Sans', sans-serif; }
        .lf-field { position: relative; margin-bottom: 1.25rem; }
        .lf-field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #333333; pointer-events: none; z-index: 1; }
        .lf-field:focus-within .lf-field-icon { color: #f97316; }
        .lf-eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; padding: 0; color: #333333; cursor: pointer; transition: color 0.2s; display: flex; align-items: center; }
        .lf-eye-btn:hover { color: #f97316; }
        .lf-input-el { width: 100%; background-color: #111111; border: 1px solid #222222; border-radius: 12px; padding: 13px 13px 13px 46px; font-size: 14px; color: #ffffff; font-family: 'DM Sans', sans-serif; outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
        .lf-input-el::placeholder { color: #333333; }
        .lf-input-el:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.08); }
        .lf-input-error { border-color: #dc2626 !important; }
        .lf-error-msg { margin-top: 6px; font-size: 13.5px; color: #f87171; font-family: 'DM Sans', sans-serif; font-weight: 500; }
        .lf-general-error { background: rgba(220,38,38,0.08); border-left: 3px solid #dc2626; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 14px; color: #f87171; margin-bottom: 1.25rem; font-family: 'DM Sans', sans-serif; }
        .lf-general-success { background: rgba(34,197,94,0.08); border-left: 3px solid #22c55e; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 14px; color: #4ade80; margin-bottom: 1.25rem; font-family: 'DM Sans', sans-serif; }
        .lf-btn-submit { width: 100%; background: #f97316; color: #000000; border: none; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700; font-family: 'Syne', sans-serif; letter-spacing: 0.02em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 0.5rem; transition: all 0.2s; }
        .lf-btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(249,115,22,0.3); }
        .lf-btn-submit:active:not(:disabled) { transform: translateY(0); }
        .lf-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .lf-back-link { text-align: center; margin-top: 1.25rem; font-size: 13px; color: #666666; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: color 0.2s; }
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
            Reset <span className="lf-heading-accent">Password</span>
          </h1>
          <p className="lf-subtext">Create your new password.</p>

          <div className="lf-panel">
            {error && <div className="lf-general-error">{error}</div>}
            {success && <div className="lf-general-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="lf-field">
                <label htmlFor="newPassword" className="lf-label">New Password</label>
                <div style={{ position: "relative" }}>
                  <span className="lf-field-icon"><Lock size={18} /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className={`lf-input-el${error ? " lf-input-error" : ""}`}
                    style={{ paddingRight: "46px" }}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="lf-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="lf-field">
                <label htmlFor="confirmPassword" className="lf-label">Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <span className="lf-field-icon"><Lock size={18} /></span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className={`lf-input-el${error ? " lf-input-error" : ""}`}
                    style={{ paddingRight: "46px" }}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="lf-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="lf-btn-submit" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> Updating...</>
                ) : (
                  <><>Update Password</> <ArrowRight size={20} /></>
                )}
              </button>
            </form>

            <div className="lf-back-link" onClick={() => navigate("/login")}>
              Back to Login
            </div>
          </div>

          <p className="lf-footer-note">By continuing, you agree to our Terms of Service</p>
        </div>
      </div>
    </>
  );
}
