import { useAuthStore } from '../store/authStore';

export default function DebugAuth() {
  const { user, token, isAuthenticated, isLoading } = useAuthStore();

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Auth Debug Info:</h4>
      <div><strong>isAuthenticated:</strong> {isAuthenticated.toString()}</div>
      <div><strong>isLoading:</strong> {isLoading.toString()}</div>
      <div><strong>user:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}</div>
      <div><strong>token:</strong> {token ? token.substring(0, 50) + '...' : 'null'}</div>
      <div><strong>localStorage:</strong> {localStorage.getItem('auth-storage') ? 'has data' : 'empty'}</div>
    </div>
  );
}
