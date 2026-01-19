import React, { useState } from 'react';
import { authApi } from '../lib/api';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const response = await authApi.loginWithEmail(email, password);
      onLoginSuccess(response.data.access_token, response.data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="/logo.png" alt="Chatbull" className="app-logo" />
        <h1 className="app-title">Chatbull</h1>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <input
              type="email"
              className="form-input"
              placeholder="Phone number, username, or email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <input
              type={showPassword ? "text" : "password"}
              className="form-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {!isSignUp && (
            <div className="remember-me">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Remember me</label>
            </div>
          )}

          <button type="submit" className="login-button" disabled={isLoading || !email || !password}>
            {isLoading ? <div className="spinner"></div> : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>

          <div className="divider">
            <div className="divider-line"></div>
            <div className="divider-text">OR</div>
            <div className="divider-line"></div>
          </div>

          <div className="social-login">
            <span>Log in with Facebook</span>
          </div>

          {!isSignUp && (
            <a href="#" className="forgot-password">Forgot password?</a>
          )}
        </form>
      </div>

      <div className="signup-box">
        {isSignUp ? (
          <span>
            Have an account? 
            <span className="signup-link" onClick={toggleMode}>Log in</span>
          </span>
        ) : (
          <span>
            Don't have an account? 
            <span className="signup-link" onClick={toggleMode}>Sign up</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
