import { useNavigate } from "react-router-dom";
import { User, Mail, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const userInitial = user?.firstName ? user.firstName[0].toUpperCase() : "U";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ps-page-bg {
          min-height: 100vh;
          background-color: #000000;
          padding: 2rem;
        }

        .ps-container {
          max-width: 600px;
          margin: 0 auto;
        }

        .ps-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .ps-back-btn {
          background: transparent;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          padding: 10px;
          color: #666666;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ps-back-btn:hover {
          border-color: #f97316;
          color: #f97316;
        }

        .ps-title {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .ps-card {
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 1.5rem;
        }

        .ps-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #1a1a1a;
        }

        .ps-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #ea580c);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
        }

        .ps-avatar-name {
          font-family: 'Syne', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
        }

        .ps-info-row {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: #111111;
          border-radius: 12px;
          margin-bottom: 1rem;
        }

        .ps-info-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(249, 115, 22, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f97316;
          flex-shrink: 0;
        }

        .ps-info-content {
          flex: 1;
        }

        .ps-info-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555555;
          margin-bottom: 4px;
          font-family: 'DM Sans', sans-serif;
        }

        .ps-info-value {
          font-size: 15px;
          color: #ffffff;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
        }
      `}</style>

      <div className="ps-page-bg">
        <div className="ps-container">
          {/* Header */}
          <div className="ps-header">
            <button className="ps-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="ps-title">Account Settings</h1>
          </div>

          {/* Profile Card */}
          <div className="ps-card">
            {/* Avatar Section */}
            <div className="ps-avatar-section">
              <div className="ps-avatar">{userInitial}</div>
              <div className="ps-avatar-name">
                {user?.firstName} {user?.lastName || ""}
              </div>
            </div>

            {/* Name Info */}
            <div className="ps-info-row">
              <div className="ps-info-icon">
                <User size={20} />
              </div>
              <div className="ps-info-content">
                <div className="ps-info-label">Full Name</div>
                <div className="ps-info-value">
                  {user?.firstName} {user?.lastName || ""}
                </div>
              </div>
            </div>

            {/* Email Info */}
            <div className="ps-info-row">
              <div className="ps-info-icon">
                <Mail size={20} />
              </div>
              <div className="ps-info-content">
                <div className="ps-info-label">Email Address</div>
                <div className="ps-info-value">{user?.email}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
