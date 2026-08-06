import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, KeyRound, MailCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import GoogleIcon from '../../components/GoogleIcon';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/inicio` },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch {
      setError('Não foi possível iniciar o login com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('Failed to fetch') || signUpError.message.includes('NetworkError') || signUpError.message.includes('placeholder')) {
          setError('Erro de conexão. Verifique se as chaves do Supabase estão configuradas no arquivo .env');
        } else if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered') || signUpError.message.includes('User already registered')) {
          setError('Este e-mail já está cadastrado. Tente fazer login.');
        } else {
          setError(signUpError.message);
        }
      } else if (signUpData.session) {
        // Confirmação de e-mail desativada: já veio com sessão ativa
        navigate('/inicio');
      } else {
        // Confirmação de e-mail exigida pelo Supabase: ainda não há sessão
        setSuccess(true);
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
          <h1 className="font-['Playfair_Display'] text-3xl text-[var(--cor-dourado)] mb-2">Criar Conta</h1>
          <p className="font-['Literata'] italic text-[var(--cor-texto-dim)] text-lg">Comece sua jornada de estudo</p>
        </div>
        
        <div className="h-[1px] w-full mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)' }}></div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--cor-dourado-bg)] flex items-center justify-center border border-[var(--cor-dourado)]">
              <MailCheck size={32} className="text-[var(--cor-dourado)]" />
            </div>
            <p className="text-[var(--cor-texto-medio)] leading-relaxed">
              Conta criada com sucesso! Enviamos um link de confirmação para <strong className="text-[var(--cor-dourado-claro)]">{email}</strong>. Verifique sua caixa de entrada (e o spam) para ativar o acesso.
            </p>
            <Link to="/login" className="inline-block mt-4 text-[var(--cor-dourado)] hover:text-[var(--cor-dourado-claro)] text-sm transition-colors">
              Voltar ao login
            </Link>
          </div>
        ) : (
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block font-['Manrope'] text-sm tracking-wider text-[var(--cor-texto-medio)] mb-2">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)]" size={18} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base w-full pl-10 pr-4 py-3 text-sm"
                placeholder="Seu nome"
              />
            </div>
          </div>

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
            <p className={`text-xs mt-1 ${password.length > 0 && password.length < 8 ? 'text-[var(--cor-erro)]' : 'text-[var(--cor-texto-dim)]'}`}>Mínimo 8 caracteres</p>
          </div>

          <div>
            <label className="block font-['Manrope'] text-sm tracking-wider text-[var(--cor-texto-medio)] mb-2">Confirmar Senha</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)]" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-base w-full pl-10 pr-4 py-3 text-sm"
                placeholder="••••••••"
              />
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs mt-1 text-[var(--cor-erro)]">As senhas não coincidem</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md p-3 border border-[#E05555] bg-[rgba(224,85,85,0.1)] text-[#E05555] text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
            {loading ? 'Carregando...' : 'Criar conta'}
          </button>
        </form>
        )}

        {!success && (
          <>
            <div className="relative flex items-center py-6">
              <div className="flex-grow border-t border-[var(--cor-borda)]"></div>
              <span className="flex-shrink-0 mx-4 text-[var(--cor-texto-dim)] text-sm font-['Manrope'] lowercase">ou</span>
              <div className="flex-grow border-t border-[var(--cor-borda)]"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="btn-secondary w-full flex items-center justify-center gap-2.5 disabled:opacity-60"
            >
              <GoogleIcon size={18} />
              {googleLoading ? 'Redirecionando...' : 'Continuar com Google'}
            </button>

            <div className="text-center mt-6">
              <Link to="/login" className="text-[var(--cor-dourado)] hover:text-[var(--cor-dourado-claro)] text-sm transition-colors">
                Já tenho conta. Fazer login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
