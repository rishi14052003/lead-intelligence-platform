import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setToken, setLoading, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });

  const validateForm = () => {
    const newErrors = { email: "", password: "", general: errors.general };

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[a-zA-Z0-9._%+\-]+@gmail\.com$/.test(formData.email)) {
      newErrors.email = "Email must be a valid Gmail address (@gmail.com)";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (
      !/^(?=.*[A-Z])(?=.*\d)[a-zA-Z0-9!@#$%^&*]{8,}$/.test(formData.password)
    ) {
      newErrors.password =
        "Password must be 8+ chars with 1 uppercase and 1 number";
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "", general: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      if (errorMessage.includes("Email")) {
        setErrors((prev) => ({ ...prev, email: errorMessage, general: "" }));
      } else if (errorMessage.includes("Password")) {
        setErrors((prev) => ({ ...prev, password: errorMessage, general: "" }));
      } else {
        setErrors((prev) => ({ ...prev, general: errorMessage }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .lf-page-bg {
          min-height: 100vh;
          background-color: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .lf-card-wrap {
          width: 100%;
          max-width: 440px;
        }

        .lf-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(249,115,22,0.1);
          border: 1px solid rgba(249,115,22,0.25);
          border-radius: 100px;
          padding: 6px 14px;
          margin-bottom: 1.5rem;
          font-size: 12px;
          color: #f97316;
          font-weight: 500;
          letter-spacing: 0.04em;
          font-family: 'DM Sans', sans-serif;
        }

        .lf-badge-dot {
          width: 6px;
          height: 6px;
          background: #f97316;
          border-radius: 50%;
          animation: lf-pulse 2s infinite;
        }

        @keyframes lf-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .lf-heading {
          font-family: 'Syne', sans-serif;
          font-size: 44px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.05;
          margin: 0 0 0.25rem;
          letter-spacing: -0.02em;
        }

        .lf-heading-accent { color: #f97316; }

        .lf-subtext {
          font-size: 14px;
          color: #666666;
          font-family: 'DM Sans', sans-serif;
          margin: 0 0 2rem;
        }

        .lf-panel {
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 20px;
          padding: 2rem;
        }

        .lf-tab-row {
          display: flex;
          gap: 8px;
          margin-bottom: 1.75rem;
        }

        .lf-tab {
          flex: 1;
          background: transparent;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          padding: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          color: #444444;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .lf-tab-active {
          background: rgba(249,115,22,0.1);
          border-color: rgba(249,115,22,0.3);
          color: #f97316;
        }

        .lf-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555555;
          margin-bottom: 8px;
          font-family: 'DM Sans', sans-serif;
        }

        .lf-field { position: relative; margin-bottom: 1.25rem; }

        .lf-field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #333333;
          transition: color 0.2s;
          pointer-events: none;
          z-index: 1;
        }

        .lf-field:focus-within .lf-field-icon { color: #f97316; }

        .lf-eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 0;
          color: #333333;
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }

        .lf-eye-btn:hover { color: #f97316; }

        .lf-input-el {
          width: 100%;
          background-color: #111111;
          border: 1px solid #222222;
          border-radius: 12px;
          padding: 13px 13px 13px 46px;
          font-size: 14px;
          color: #ffffff;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .lf-input-el::placeholder { color: #333333; }
        .lf-input-el:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.08);
        }
        .lf-input-error { border-color: #dc2626 !important; }

        .lf-error-msg {
          margin-top: 6px;
          font-size: 13.5px;
          color: #f87171;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
        }

        .lf-general-error {
          background: rgba(220,38,38,0.08);
          border-left: 3px solid #dc2626;
          border-radius: 0 8px 8px 0;
          padding: 10px 14px;
          font-size: 14px;
          color: #f87171;
          margin-bottom: 1.25rem;
          font-family: 'DM Sans', sans-serif;
        }

        .lf-forgot {
          display: flex;
          justify-content: flex-end;
          margin: -0.5rem 0 1rem;
        }

        .lf-forgot-link {
          font-size: 12px;
          color: #f97316;
          cursor: pointer;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          background: none;
          border: none;
          padding: 0;
        }

        .lf-btn-submit {
          width: 100%;
          background: #f97316;
          color: #000000;
          border: none;
          border-radius: 12px;
          padding: 15px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.02em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 0.5rem;
          transition: all 0.2s;
        }

        .lf-btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(249,115,22,0.3);
        }

        .lf-btn-submit:active:not(:disabled) { transform: translateY(0); }
        .lf-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        .lf-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.5rem 0;
        }

        .lf-divider-line { flex: 1; height: 1px; background: #1a1a1a; }
        .lf-divider-label { font-size: 12px; color: #444444; font-weight: 500; font-family: 'DM Sans', sans-serif; }

        .lf-btn-ghost {
          width: 100%;
          background: transparent;
          color: #f97316;
          border: 1px solid #2a1a0a;
          border-radius: 12px;
          padding: 14px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }

        .lf-btn-ghost:hover {
          background: rgba(249,115,22,0.06);
          border-color: rgba(249,115,22,0.3);
        }

        .lf-footer-note {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 11px;
          color: #333333;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="lf-page-bg">
        <div className="lf-card-wrap">
          {/* Badge */}
          <div className="lf-badge">
            <div className="lf-badge-dot" />
            LeadFinder Intelligence Platform
          </div>

          {/* Heading */}
          <h1 className="lf-heading whitespace-nowrap text-[clamp(2rem,5vw,4rem)]">
            Welcome <span className="lf-heading-accent">back.</span>
          </h1>
          <p className="lf-subtext">Sign in to access your lead pipeline</p>

          {/* Form Panel */}
          <div className="lf-panel">
            {/* Tab Row */}
            <div className="lf-tab-row">
              <div className="lf-tab lf-tab-active">Sign In</div>
              <div className="lf-tab" onClick={() => navigate("/signup")}>
                Create Account
              </div>
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="lf-general-error">{errors.general}</div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="lf-field">
                <label htmlFor="email" className="lf-label">
                  Gmail Address
                </label>
                <div style={{ position: "relative" }}>
                  <span className="lf-field-icon">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@gmail.com"
                    className={`lf-input-el${errors.email ? " lf-input-error" : ""}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="lf-error-msg">• {errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="lf-field">
                <label htmlFor="password" className="lf-label">
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <span className="lf-field-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`lf-input-el${errors.password ? " lf-input-error" : ""}`}
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
                {errors.password && (
                  <p className="lf-error-msg">• {errors.password}</p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="lf-forgot">
                <button type="button" className="lf-forgot-link">
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="lf-btn-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="lf-divider">
              <div className="lf-divider-line" />
              <span className="lf-divider-label">New user?</span>
              <div className="lf-divider-line" />
            </div>

            {/* Sign Up */}
            <button
              className="lf-btn-ghost"
              onClick={() => navigate("/signup")}
            >
              Create account
            </button>
          </div>

          <p className="lf-footer-note">
            By signing in, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </>
  );
}