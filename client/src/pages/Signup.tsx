import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

export default function Signup() {
  const navigate = useNavigate();
  const { setUser, setToken, setLoading, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    general: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const getPasswordStrength = (pw: string): number => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[!@#$%^&*]/.test(pw)) score++;
    return score;
  };

  const strengthColors = ["#dc2626", "#f97316", "#eab308", "#22c55e"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  const validateForm = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      general: "",
    };

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

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
      newErrors.password = "Password: 8+ chars, 1 uppercase, 1 number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return (
      !newErrors.firstName &&
      !newErrors.email &&
      !newErrors.password &&
      !newErrors.confirmPassword
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "password") {
      setPasswordStrength(getPasswordStrength(value));
    }
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors((prev) => ({ ...prev, general: "" }));

    try {
      const response = await api.post("/auth/signup", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage: string =
        error.response?.data?.message || "";

      if (error.response?.status === 409) {
        setErrors((prev) => ({
          ...prev,
          email:
            "Email already registered. Please use a different email or login.",
        }));
      } else if (
        errorMessage.toLowerCase().includes("email") ||
        errorMessage.toLowerCase().includes("gmail")
      ) {
        setErrors((prev) => ({
          ...prev,
          email: "Only @gmail.com addresses are accepted.",
        }));
      } else if (
        errorMessage.toLowerCase().includes("password")
      ) {
        setErrors((prev) => ({
          ...prev,
          password:
            "Password must be at least 8 characters, include 1 uppercase letter and 1 number.",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          general: errorMessage || "Signup failed. Please try again.",
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .sg-page-bg {
          min-height: 100vh;
          background-color: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }

        .sg-card-wrap {
          width: 100%;
          max-width: 440px;
        }

        .sg-badge {
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

        .sg-badge-dot {
          width: 6px;
          height: 6px;
          background: #f97316;
          border-radius: 50%;
          animation: sg-pulse 2s infinite;
        }

        @keyframes sg-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .sg-heading {
          font-family: 'Syne', sans-serif;
          font-size: 44px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.05;
          margin: 0 0 0.25rem;
          letter-spacing: -0.02em;
        }

        .sg-heading-accent { color: #f97316; }

        .sg-subtext {
          font-size: 14px;
          color: #666666;
          font-family: 'DM Sans', sans-serif;
          margin: 0 0 2rem;
        }

        .sg-panel {
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 20px;
          padding: 2rem;
        }

        .sg-tab-row {
          display: flex;
          gap: 8px;
          margin-bottom: 1.75rem;
        }

        .sg-tab {
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

        .sg-tab-active {
          background: rgba(249,115,22,0.1);
          border-color: rgba(249,115,22,0.3);
          color: #f97316;
        }

        .sg-name-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .sg-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555555;
          margin-bottom: 8px;
          font-family: 'DM Sans', sans-serif;
        }

        .sg-field { position: relative; margin-bottom: 1.25rem; }

        .sg-field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #333333;
          transition: color 0.2s;
          pointer-events: none;
          z-index: 1;
        }

        .sg-field:focus-within .sg-field-icon { color: #f97316; }

        .sg-eye-btn {
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

        .sg-eye-btn:hover { color: #f97316; }

        .sg-input-el {
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

        .sg-input-el::placeholder { color: #333333; }
        .sg-input-el:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.08);
        }
        .sg-input-error { border-color: #dc2626 !important; }

        .sg-error-msg {
          margin-top: 6px;
          font-size: 13.5px;
          color: #f87171;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
        }

        .sg-general-error {
          background: rgba(220,38,38,0.08);
          border-left: 3px solid #dc2626;
          border-radius: 0 8px 8px 0;
          padding: 10px 14px;
          font-size: 14px;
          color: #f87171;
          margin-bottom: 1.25rem;
          font-family: 'DM Sans', sans-serif;
        }

        .sg-strength-row {
          display: flex;
          gap: 4px;
          margin-top: 8px;
          align-items: center;
        }

        .sg-strength-bar {
          flex: 1;
          height: 3px;
          background: #1a1a1a;
          border-radius: 2px;
          transition: background 0.3s;
        }

        .sg-strength-label {
          font-size: 11px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          margin-left: 8px;
          min-width: 36px;
        }

        .sg-btn-submit {
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

        .sg-btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(249,115,22,0.3);
        }

        .sg-btn-submit:active:not(:disabled) { transform: translateY(0); }
        .sg-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        .sg-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.5rem 0;
        }

        .sg-divider-line { flex: 1; height: 1px; background: #1a1a1a; }
        .sg-divider-label { font-size: 12px; color: #444444; font-weight: 500; font-family: 'DM Sans', sans-serif; }

        .sg-btn-ghost {
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

        .sg-btn-ghost:hover {
          background: rgba(249,115,22,0.06);
          border-color: rgba(249,115,22,0.3);
        }

        .sg-footer-note {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 11px;
          color: #333333;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="sg-page-bg">
        <div className="sg-card-wrap">
          {/* Badge */}
          <div className="sg-badge">
            <div className="sg-badge-dot" />
            LeadFinder Intelligence Platform
          </div>

          {/* Heading */}
          <h1 className="sg-heading whitespace-nowrap">
            Start for <span className="sg-heading-accent inline">free.</span>
          </h1>
          <p className="sg-subtext">
            Join thousands of businesses finding leads
          </p>

          {/* Form Panel */}
          <div className="sg-panel">
            {/* Tab Row */}
            <div className="sg-tab-row">
              <div className="sg-tab" onClick={() => navigate("/login")}>
                Sign In
              </div>
              <div className="sg-tab sg-tab-active">Create Account</div>
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="sg-general-error">{errors.general}</div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Name Row */}
              <div className="sg-name-row">
                {/* First Name */}
                <div className="sg-field">
                  <label htmlFor="firstName" className="sg-label">
                    First Name *
                  </label>
                  <div style={{ position: "relative" }}>
                    <span className="sg-field-icon">
                      <User size={18} />
                    </span>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className={`sg-input-el${errors.firstName ? " sg-input-error" : ""}`}
                      disabled={isLoading}
                      autoComplete="off"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="sg-error-msg">• {errors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div className="sg-field">
                  <label htmlFor="lastName" className="sg-label">
                    Last Name
                  </label>
                  <div style={{ position: "relative" }}>
                    <span className="sg-field-icon">
                      <User size={18} />
                    </span>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className="sg-input-el"
                      disabled={isLoading}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="sg-field">
                <label htmlFor="email" className="sg-label">
                  Gmail Address *
                </label>
                <div style={{ position: "relative" }}>
                  <span className="sg-field-icon">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@gmail.com"
                    className={`sg-input-el${errors.email ? " sg-input-error" : ""}`}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                </div>
                {errors.email && (
                  <p className="sg-error-msg">• {errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="sg-field">
                <label htmlFor="password" className="sg-label">
                  Password *
                </label>
                <div style={{ position: "relative" }}>
                  <span className="sg-field-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`sg-input-el${errors.password ? " sg-input-error" : ""}`}
                    style={{ paddingRight: "46px" }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="sg-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength Meter */}
                {formData.password && (
                  <div className="sg-strength-row">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="sg-strength-bar"
                        style={{
                          background:
                            i < passwordStrength
                              ? strengthColors[passwordStrength - 1]
                              : "#1a1a1a",
                        }}
                      />
                    ))}
                    <span
                      className="sg-strength-label"
                      style={{
                        color:
                          passwordStrength > 0
                            ? strengthColors[passwordStrength - 1]
                            : "#444",
                      }}
                    >
                      {passwordStrength > 0
                        ? strengthLabels[passwordStrength - 1]
                        : ""}
                    </span>
                  </div>
                )}

                {errors.password && (
                  <p className="sg-error-msg">• {errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="sg-field">
                <label htmlFor="confirmPassword" className="sg-label">
                  Confirm Password *
                </label>
                <div style={{ position: "relative" }}>
                  <span className="sg-field-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`sg-input-el${errors.confirmPassword ? " sg-input-error" : ""}`}
                    style={{ paddingRight: "46px" }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="sg-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="sg-error-msg">• {errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="sg-btn-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="sg-divider">
              <div className="sg-divider-line" />
              <span className="sg-divider-label">Already registered?</span>
              <div className="sg-divider-line" />
            </div>

            {/* Login Link */}
            <button className="sg-btn-ghost" onClick={() => navigate("/login")}>
              Sign in instead
            </button>
          </div>

          <p className="sg-footer-note">
            By signing up, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </>
  );
}