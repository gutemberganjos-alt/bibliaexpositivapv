import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Preencha o e-mail');
      return;
    }
    if (!password) {
      setError('Preencha a senha');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login') || error.message.includes('invalid_credentials')) {
          setError('E-mail ou senha incorretos. Verifique seus dados.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('placeholder')) {
          setError('Erro de conexão. Verifique se as chaves do Supabase estão configuradas no arquivo .env');
        } else {
          setError(error.message);
        }
      } else {
        navigate('/inicio');
      }
    } catch {
      setError('Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen flex flex-col items-center justify-center p-4">
      <div className="auth-panel w-full max-w-[440px] p-7 md:p-9">
        <div className="text-center mb-8">
          <h1 className="font-['Playfair_Display'] text-4xl text-[var(--cor-dourado)] mb-2">Bíblia Expositiva PV</h1>
          <p className="font-['Literata'] italic text-[var(--cor-texto-dim)] text-lg">Estudo bíblico que inspira e prepara</p>
        </div>
        
        <div className="h-[1px] w-full mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)' }}></div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block font-['Manrope'] text-sm tracking-wider text-[var(--cor-texto-medio)] mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)]" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base w-full pl-10 pr-4 py-3 text-sm"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block font-['Manrope'] text-sm tracking-wider text-[var(--cor-texto-medio)] mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)]" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base w-full pl-10 pr-10 py-3 text-sm"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md p-3 border border-[#E05555] bg-[rgba(224,85,85,0.1)] text-[#E05555] text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/recuperar-senha" className="text-[var(--cor-dourado-dim)] hover:text-[var(--cor-dourado)] text-sm transition-colors">
            Esqueci minha senha
          </Link>
        </div>

        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-[var(--cor-borda)]"></div>
          <span className="flex-shrink-0 mx-4 text-[var(--cor-texto-dim)] text-sm font-['Manrope'] lowercase">ou</span>
          <div className="flex-grow border-t border-[var(--cor-borda)]"></div>
        </div>

        <div className="text-center">
          <Link to="/cadastro" className="text-[var(--cor-dourado)] hover:text-[var(--cor-dourado-claro)] text-sm transition-colors">
            Ainda não tem acesso? Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
