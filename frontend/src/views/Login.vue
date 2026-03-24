<template>
  <div class="login-container">

    <div class="logo-section">
      <img src="@/assets/images/logo.png" alt="Silingan Coffee" class="logo-image" />
      <h1 class="brand-title">Silingan Coffee</h1>
      <p class="brand-subtitle">Management System</p>
    </div>


    <div class="login-card">
      <div class="login-header">
        <h2 class="welcome-title">Welcome Back</h2>
        <p class="welcome-subtitle">Sign in to access your coffee shop dashboard</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <div class="input-group">
            <span class="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <input 
              type="text" 
              v-model="username" 
              placeholder="Enter your username"
              required 
            />
          </div>
        </div>

        <div class="form-group">
          <div class="input-group">
            <span class="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <input 
              type="password" 
              v-model="password" 
              placeholder="Enter your password"
              required 
            />
          </div>
        </div>

        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="rememberMe" />
            <span>Remember me</span>
          </label>
        </div>
        
        <button type="submit" class="login-btn">Sign In</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const router = useRouter()

const handleLogin = () => {
  // Simple validation for testing
  if (username.value && password.value) {
    // Store user info (optional)
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('username', username.value)
    
    // Redirect to dashboard
    router.push('/dashboard')
  } else {
    alert('Please enter both username and password')
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: white;
  padding: 20px;
}

/* Logo Section - Outside the card with image */
.logo-section {
  text-align: center;
  margin-bottom: 30px;
}

.logo-image {
  width: 80px;
  height: auto;
  margin-bottom: 15px;
}

.brand-title {
  font-size: 42px;
  font-weight: 800;
  color: #532f15;
  margin: 0;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 16px;
  color: #532f15;
  margin-top: 5px;
  font-weight: 500;
  letter-spacing: 1px;
}

/* Login Card */
.login-card {
  background: white;
  border-radius: 16px;
  border: 0.4px solid #532f15;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  transition: all 0.3s ease;
}

.login-card:hover {
  box-shadow: 0 15px 35px rgba(139, 69, 19, 0.1);
  border-color: #532f15;
}

.login-header {
  text-align: center;
  margin-bottom: 35px;
}

.welcome-title {
  font-size: 28px;
  font-weight: 700;
  color: #532f15;
  margin-bottom: 10px;
}

.welcome-subtitle {
  color: #532f15;
  font-size: 14px;
  font-weight: 500;
}

/* Form Styles */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  width: 100%;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #532f15;
  transition: color 0.3s ease;
}

.input-group input {
  width: 100%;
  padding: 14px 14px 14px 45px;
  border: 1px solid #E8D9C5;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
  outline: none;
  background-color: #FFFBF7;
  color: #5D3A1A;
}

.input-group input:focus {
  border-color: #532f15;
  box-shadow: 0 0 0 3px rgba(210, 105, 30, 0.1);
  background-color: white;
}

.input-group input::placeholder {
  color: #C7B59B;
  font-weight: 400;
}

.input-group input:hover {
  border-color: #CD853F;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.remember-me input {
  cursor: pointer;
}

/* Login Button */
.login-btn {
  width: 100%;
  padding: 14px;
  background: #532f15;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
  letter-spacing: 0.5px;
}

.login-btn:hover {
  background: #594537;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(139, 69, 19, 0.3);
}

.login-btn:active {
  transform: translateY(0);
}

/* Responsive Design */
@media (max-width: 480px) {
  .login-card {
    padding: 30px 25px;
    max-width: 90%;
  }
  
  .brand-title {
    font-size: 32px;
  }
  
  .brand-subtitle {
    font-size: 14px;
  }
  
  .logo-image {
    width: 60px;
  }
  
  .welcome-title {
    font-size: 24px;
  }
  
  .input-group input {
    padding: 12px 12px 12px 42px;
  }
}
</style>