import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Estado = 'verificando' | 'pronto' | 'invalido' | 'sucesso';

/**
 * Página que o link do e-mail de recuperação abre. O supabase-js já processa o
 * token da URL sozinho (detectSessionInUrl) e cria uma sessão temporária — aqui
 * só conferimos se ela existe antes de deixar o usuário definir a nova senha.
 */
export default function ResetPassword() {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;

    const checar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (ativo) setEstado((atual) => (atual === 'sucesso' ? atual : session ? 'pronto' : 'invalido'));
    };
    void checar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setEstado('pronto');
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (senha.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) {
        setError(error.message);
      } else {
        setEstado('sucesso');
      }
    } catch {
      setError('Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'radial-gradient(circle at center, rgba(201,168,76,0.05) 0%, transparent 60%), var(--cor-fundo)' }}>
      <div className="w-full max-w-[420px] p-8">
        <div className="text-center mb-8">
          <h1 className="font-['Playfair_Display'] text-3xl text-[var(--cor-dourado)] mb-2">Nova Senha</h1>
          <p className="font-['Literata'] italic text-[var(--cor-texto-dim)] text-lg">Defina uma senha nova para sua conta</p>
        </div>

        <div className="h-[1px] w-full mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)' }}></div>

        {estado === 'verificando' && (
          <div className="flex flex-col items-center gap-3 py-6 text-[var(--cor-texto-dim)]">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">Verificando o link…</p>
          </div>
        )}

        {estado === 'invalido' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(224,85,85,0.1)] flex items-center justify-center border border-[#E05555]">
              <AlertCircle size={32} className="text-[#E05555]" />
            </div>
            <p className="text-[var(--cor-texto-medio)] leading-relaxed">
              Este link de recuperação é inválido ou expirou. Peça um novo link para trocar sua senha.
            </p>
            <Link to="/recuperar-senha" className="inline-block mt-2 text-[var(--cor-dourado)] hover:text-[var(--cor-dourado-claro)] text-sm transition-colors">
              Pedir novo link
            </Link>
          </div>
        )}

        {estado === 'sucesso' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--cor-dourado-bg)] flex items-center justify-center border border-[var(--cor-dourado)]">
              <CheckCircle2 size={32} className="text-[var(--cor-dourado)]" />
            </div>
            <p className="text-[var(--cor-texto-medio)] leading-relaxed">
              Senha atualizada com sucesso.
            </p>
            <button onClick={() => navigate('/inicio', { replace: true })} className="btn-primary w-full">
              Entrar no app
            </button>
          </div>
        )}

        {estado === 'pronto' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-['Manrope'] text-sm tracking-wider text-[var(--cor-texto-medio)] mb-2">Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)]" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-base w-full pl-10 pr-10 py-3 text-sm"
                  placeholder="••••••••"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className={`text-xs mt-1 ${senha.length > 0 && senha.length < 8 ? 'text-[var(--cor-erro)]' : 'text-[var(--cor-texto-dim)]'}`}>Mínimo 8 caracteres</p>
            </div>

            <div>
              <label className="block font-['Manrope'] text-sm tracking-wider text-[var(--cor-texto-medio)] mb-2">Confirmar nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)]" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="input-base w-full pl-10 pr-4 py-3 text-sm"
                  placeholder="••••••••"
                />
              </div>
              {confirmar.length > 0 && senha !== confirmar && (
                <p className="text-xs mt-1 text-[var(--cor-erro)]">As senhas não coincidem</p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md p-3 border border-[#E05555] bg-[rgba(224,85,85,0.1)] text-[#E05555] text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
