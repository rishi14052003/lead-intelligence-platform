import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button - styled like other icon buttons */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="icon-btn"
        title="Profile"
      >
        <UserIcon size={20} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="profile-dropdown"
          style={{
            position: 'absolute',
            right: '0',
            top: 'calc(100% + 8px)',
            width: '280px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: '1000',
            overflow: 'hidden',
            animation: 'slideDown 0.2s ease-out',
          }}
        >
          {/* Profile Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <p style={{ 
              color: 'var(--text2)', 
              fontSize: '11px', 
              fontWeight: '600',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Profile
            </p>
            <p style={{ 
              color: 'var(--text)', 
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: 'Montserrat, sans-serif'
            }}>
              {user?.firstName} {user?.lastName || ''}
            </p>
          </div>

          {/* Profile Details */}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '100%',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--surface2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text2)',
              flexShrink: 0,
            }}>
              <User size={16} />
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <p style={{ 
                color: 'var(--text2)', 
                fontSize: '11px',
                fontWeight: '500',
                marginBottom: '2px'
              }}>
                Name
              </p>
              <p style={{ 
                color: 'var(--text)', 
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {user?.firstName} {user?.lastName || ''}
              </p>
            </div>
          </button>

          {/* Email */}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '100%',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--surface2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text2)',
              flexShrink: 0,
            }}>
              <Mail size={16} />
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <p style={{ 
                color: 'var(--text2)', 
                fontSize: '11px',
                fontWeight: '500',
                marginBottom: '2px'
              }}>
                Email
              </p>
              <p style={{ 
                color: 'var(--text)', 
                fontSize: '13px',
                fontWeight: '500',
                wordBreak: 'break-all'
              }}>
                {user?.email}
              </p>
            </div>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
              color: '#dc2626',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            <span style={{ 
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: 'DM Sans, sans-serif'
            }}>
              Sign out
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
