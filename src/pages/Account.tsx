import { useState } from 'react';
import { LogOut, User, Mail, Shield, CreditCard, ChevronRight, GraduationCap, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAdmin } from '../contexts/AdminContext';
import { cancelSubscription } from '../lib/subscription';

const TIER_LABEL: Record<string, string> = {
  free: 'Sem assinatura ativa',
  premium: 'Plano Individual',
  church: 'Plano Igreja',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  trialing: 'Em teste',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  incomplete: 'Incompleta',
};

export default function Account() {
  const { user, signOut } = useAuth();
  const { subscription, active, refresh } = useSubscription();
  const { isAdmin } = useAdmin();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'cancel' | null>(null);

  const userName = user?.user_metadata?.full_name || 'Irmão(ã) em Cristo';
  const userEmail = user?.email || 'usuario@email.com';

  async function handleCancel() {
    if (!confirm('Deseja mesmo cancelar sua assinatura? Se estiver dentro de 7 dias do primeiro pagamento, o reembolso é automático.')) return;
    setBusy('cancel');
    try {
      const r = await cancelSubscription();
      showToast(r.message, r.refunded ? 'success' : 'info');
      await refresh();
    } catch (e) {
      showToast((e as Error).message || 'Não foi possível cancelar.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto w-full pb-24">
      <header className="mb-6 pt-4 pb-2" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(201,168,76,0.07), transparent 70%)' }}>
        <h1 className="font-['Manrope'] text-2xl text-[var(--cor-dourado)] tracking-wide">Minha Conta</h1>
      </header>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--cor-dourado-bg)] flex items-center justify-center border border-[var(--cor-borda)]">
            <User size={32} className="text-[var(--cor-dourado)]" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-lg text-[var(--cor-dourado-claro)] truncate">{userName}</h2>
            <p className="text-sm text-[var(--cor-texto-dim)] flex items-center gap-1 mt-1">
              <Shield size={14} /> {active ? 'Acesso liberado' : 'Acesso por assinatura'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-[var(--cor-fundo-input)] rounded-md border border-[var(--cor-borda)] overflow-hidden">
            <Mail size={18} className="text-[var(--cor-texto-dim)] shrink-0" />
            <span className="text-[var(--cor-texto-medio)] text-sm truncate">{userEmail}</span>
          </div>
        </div>
      </div>

      {/* Assinatura */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[var(--cor-dourado-claro)] flex items-center gap-2"><CreditCard size={18} /> Assinatura</h3>
          {subscription && (
            <span className={`text-xs px-2 py-1 rounded-full border ${active ? 'text-[var(--cor-dourado)] border-[var(--cor-dourado)]/40' : 'text-[var(--cor-texto-dim)] border-[var(--cor-borda)]'}`}>
              {STATUS_LABEL[subscription.status] ?? subscription.status}
            </span>
          )}
        </div>

        <p className="text-sm text-[var(--cor-texto-medio)]">
          {subscription?.cycle === 'AVULSO' ? 'Acesso Avulso (30 dias)' : TIER_LABEL[subscription?.tier ?? 'free']}
          {subscription?.current_period_end && active && (
            <> · {subscription.cycle === 'AVULSO' ? 'acesso até' : subscription.cancel_at_period_end ? 'acesso até' : 'renova em'} {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</>
          )}
        </p>

        {active ? (
          <div className="mt-5">
            {subscription?.cycle === 'AVULSO' ? (
              <p className="text-xs text-[var(--cor-texto-dim)]">
                Isso não é uma assinatura — foi um pagamento único, não tem nada para cancelar. O acesso só não renova sozinho: quando o período acabar, volte em "Ver planos" se quiser continuar.
              </p>
            ) : subscription?.cancel_at_period_end ? (
              <p className="text-xs text-[var(--cor-texto-dim)]">
                Cancelamento já solicitado. Você mantém o acesso até o fim do período pago.
              </p>
            ) : (
              <button onClick={handleCancel} disabled={busy !== null} className="btn-destructive w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {busy === 'cancel' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />} Cancelar assinatura
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => navigate('/assinatura')} className="btn-primary w-full mt-5">Ver planos</button>
        )}
      </div>

      <div className="space-y-3 mb-8">
        <button
          onClick={() => navigate('/perfil')}
          className="w-full card p-4 flex items-center justify-between hover:border-[var(--cor-dourado)] group transition-all"
        >
          <div className="flex items-center gap-3">
            <GraduationCap size={20} className="text-[var(--cor-dourado-dim)] group-hover:text-[var(--cor-dourado)] transition-colors" />
            <span className="text-[var(--cor-pergaminho)]">Perfil de Estudo</span>
          </div>
          <ChevronRight size={18} className="text-[var(--cor-dourado-dim)]" />
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate('/admin/usuarios')}
            className="w-full card p-4 flex items-center justify-between hover:border-[var(--cor-dourado)] group transition-all"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-[var(--cor-dourado-dim)] group-hover:text-[var(--cor-dourado)] transition-colors" />
              <span className="text-[var(--cor-pergaminho)]">Painel Admin</span>
            </div>
            <ChevronRight size={18} className="text-[var(--cor-dourado-dim)]" />
          </button>
        )}
      </div>

      <button
        onClick={signOut}
        className="btn-destructive w-full flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Sair da conta
      </button>
    </div>
  );
}
