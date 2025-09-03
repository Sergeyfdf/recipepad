import { useState } from "react";
import { Link } from "react-router-dom";
import { NetworkParticles} from "./components/NetworkParticles";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <NetworkParticles/>
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border rounded-full animate-pulse" style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 border rounded-full animate-pulse" style={{ borderColor: 'rgba(251, 191, 36, 0.2)', animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md z-10 relative">
        <div className="card border-gradient hover-glow" style={{ backgroundColor: 'rgba(26, 27, 30, 0.8)', backdropFilter: 'blur(4px)', borderRadius: '1rem' }}>
          <div className="text-center mb-8" style={{ padding: '2rem 2rem 0 2rem' }}>
            <h1 className="text-3xl font-bold golden-accent text-shadow-gold mb-2">
              Авторизация
            </h1>
            <p className="text-muted-foreground">
              Добро пожаловать обратно
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" style={{ padding: '0 2rem' }}>
            <div className="space-y-2">
              <label className="label" htmlFor="email" style={{ color: 'var(--foreground)', fontWeight: '500' }}>
                Email
              </label>
              <input
                className="input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите ваш email"
                style={{ backgroundColor: 'rgba(42, 43, 46, 0.5)', borderColor: 'var(--border)' }}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="label" htmlFor="password" style={{ color: 'var(--foreground)', fontWeight: '500' }}>
                Пароль
              </label>
              <input
                className="input"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите ваш пароль"
                style={{ backgroundColor: 'rgba(42, 43, 46, 0.5)', borderColor: 'var(--border)' }}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-default btn-lg btn-golden w-full"
            >
              Войти
            </button>
          </form>

          <div className="mt-6 text-center" style={{ padding: '0 2rem 2rem 2rem' }}>
            <p className="text-muted-foreground">
              Нет аккаунта?{" "}
              <Link 
                to="/register" 
                style={{ color: 'var(--accent)', fontWeight: '500' }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = 'rgba(230, 213, 119, 0.8)';
                  e.currentTarget.style.transition = 'color 0.3s';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'var(--accent)';
                }}
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;