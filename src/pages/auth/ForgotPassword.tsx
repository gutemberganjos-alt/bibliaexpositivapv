import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Preencha o e-mail');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/resetar-senha`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
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
          <h1 className="font-['Playfair_Display'] text-3xl text-[var(--cor-dourado)] mb-2">Recuperar Senha</h1>
          <p className="font-['Literata'] italic text-[var(--cor-texto-dim)] text-lg">Enviaremos um link para o seu e-mail</p>
        </div>
        
        <div className="h-[1px] w-full mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)' }}></div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--cor-dourado-bg)] flex items-center justify-center border border-[var(--cor-dourado)]">
              <MailCheck size={32} className="text-[var(--cor-dourado)]" />
            </div>
            <p className="text-[var(--cor-texto-medio)] leading-relaxed">
              Se este e-mail estiver cadastrado, você receberá um link em instantes. Verifique também sua caixa de spam.
            </p>
            <Link to="/login" className="inline-block mt-4 text-[var(--cor-dourado)] hover:text-[var(--cor-dourado-claro)] text-sm transition-colors">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
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

            {error && (
              <div className="flex items-start gap-2 text-[var(--cor-erro)] text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
              {loading ? 'Carregando...' : 'Enviar link de recuperação'}
            </button>

            <div className="text-center mt-6">
              <Link to="/login" className="text-[var(--cor-dourado-dim)] hover:text-[var(--cor-dourado)] text-sm transition-colors">
                Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
