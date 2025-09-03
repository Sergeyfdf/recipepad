import { Link } from "react-router-dom";
import { NetworkParticles } from "./components/NetworkParticles";
import { GoldenLine } from "./components/GoldenLine";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <NetworkParticles/>
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 border rounded-full animate-pulse" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}></div>
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 border rounded-full animate-pulse" style={{ borderColor: 'rgba(251, 191, 36, 0.3)', animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 border rounded-full animate-pulse" style={{ borderColor: 'rgba(251, 191, 36, 0.4)', animationDelay: '3s' }}></div>
      </div>

      <div className="text-center z-10 relative">
        <div className="mb-12">
          <h1 className="text-6xl font-bold golden-accent text-shadow-gold mb-6">
            Добро пожаловать
          </h1>
          <GoldenLine className="mx-auto w-32 mb-6" />
          <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            Изящная платформа для ваших потребностей
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link to="/register">
            <button className="btn btn-default btn-lg btn-golden w-48 text-lg font-semibold">
              Регистрация
            </button>
          </Link>
          
          <Link to="/login">
            <button className="btn btn-default btn-lg btn-golden-outline w-48 text-lg font-semibold">
              Авторизация
            </button>
          </Link>
        </div>

        <div className="mt-16">
          <GoldenLine className="mx-auto w-20" />
        </div>
      </div>
    </div>
  );
};

export default Index;
