import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, ShieldCheck, Users, UserPlus, CreditCard } from 'lucide-react';
import { fetchAdminUsers } from '../../lib/admin';
import type { AdminUserRow } from '../../lib/admin';
import { useToast } from '../../contexts/ToastContext';

const TIER_LABEL: Record<string, string> = {
  free: 'Sem assinatura',
  premium: 'Individual',
  church: 'Igreja',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  trialing: 'Em teste',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  incomplete: 'Incompleta',
};

const ROLE_LABEL: Record<string, string> = {
  professor: 'Professor',
  pastor: 'Pastor',
  leader: 'Líder',
  student: 'Aluno',
};

const ATIVAS = new Set(['active', 'trialing']);

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

function assinaturaAtiva(u: AdminUserRow): boolean {
  const s = u.subscription;
  if (!s || !ATIVAS.has(s.status)) return false;
  if (s.current_period_end && new Date(s.current_period_end).getTime() < Date.now()) return false;
  return true;
}

function calcularKpis(usuarios: AdminUserRow[]) {
  const total = usuarios.length;
  const ativos = usuarios.filter(assinaturaAtiva).length;
  const trintaDias = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const novos = usuarios.filter((u) => new Date(u.created_at).getTime() > trintaDias).length;
  const mrr = usuarios.reduce((soma, u) => {
    if (!assinaturaAtiva(u) || !u.subscription?.value) return soma;
    const anual = (u.subscription.cycle ?? '').toUpperCase().startsWith('ANU');
    return soma + (anual ? u.subscription.value / 12 : u.subscription.value);
  }, 0);
  return { total, ativos, novos, mrr };
}

export default function AdminUsuarios() {
  const { showToast } = useToast();
  const [usuarios, setUsuarios] = useState<AdminUserRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let ativo = true;
    fetchAdminUsers()
      .then((lista) => { if (ativo) setUsuarios(lista); })
      .catch((e) => { if (ativo) showToast((e as Error).message || 'Não foi possível carregar os usuários.', 'error'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cálculo simples sobre uma lista pequena (dezenas de linhas) — não vale a pena
  // memoizar, e evita chamar Date.now() dentro de useMemo (quebra a regra de
  // pureza dos hooks: o resultado mudaria sozinho a cada minuto sem re-render).
  const kpis = calcularKpis(usuarios);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q));
  }, [usuarios, busca]);

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <Link to="/minha-conta" className="inline-flex items-center gap-1.5 text-sm text-[var(--cor-dourado)] mb-5">
        <ArrowLeft size={15} /> Voltar
      </Link>

      <header className="mb-6 pt-1">
        <p className="eyebrow">ADMINISTRAÇÃO</p>
        <h1 className="font-['Playfair_Display'] text-3xl text-[var(--cor-dourado)] mb-2 flex items-center gap-2">
          <ShieldCheck size={26} /> Usuários
        </h1>
        <p className="text-sm text-[var(--cor-texto-medio)]">Todos os cadastros da plataforma, em tempo real.</p>
      </header>

      {carregando ? (
        <div className="flex items-center justify-center py-16 text-[var(--cor-texto-dim)]">
          <Loader2 size={20} className="animate-spin mr-2" /> Carregando usuários…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--cor-texto-dim)] font-['Manrope']"><Users size={12} /> Usuários</div>
              <div className="text-2xl font-semibold text-[var(--cor-dourado-claro)] mt-1">{kpis.total}</div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--cor-texto-dim)] font-['Manrope']"><CreditCard size={12} /> Assinantes</div>
              <div className="text-2xl font-semibold text-[var(--cor-dourado-claro)] mt-1">{kpis.ativos}</div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--cor-texto-dim)] font-['Manrope']"><UserPlus size={12} /> Novos (30d)</div>
              <div className="text-2xl font-semibold text-[var(--cor-dourado-claro)] mt-1">{kpis.novos}</div>
            </div>
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-wider text-[var(--cor-texto-dim)] font-['Manrope']">MRR estimado</div>
              <div className="text-2xl font-semibold text-[var(--cor-dourado-claro)] mt-1">{brl(kpis.mrr)}</div>
            </div>
          </div>

          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)]" size={16} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="input-base w-full pl-9 pr-4 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-2">
            {filtrados.length === 0 && (
              <p className="text-center text-sm text-[var(--cor-texto-dim)] py-10">Nenhum usuário encontrado.</p>
            )}
            {filtrados.map((u) => {
              const ativa = assinaturaAtiva(u);
              return (
                <div key={u.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[var(--cor-pergaminho)] font-medium truncate">{u.full_name || '(sem nome)'}</p>
                      <p className="text-xs text-[var(--cor-texto-dim)] truncate">{u.email}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-1 rounded-full border font-['Manrope'] uppercase tracking-wider ${
                      ativa ? 'text-[var(--cor-dourado)] border-[var(--cor-dourado)]/40' : 'text-[var(--cor-texto-dim)] border-[var(--cor-borda)]'
                    }`}>
                      {u.subscription ? (STATUS_LABEL[u.subscription.status] ?? u.subscription.status) : 'Sem assinatura'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--cor-texto-medio)] font-['Manrope'] mt-3">
                    <span>{TIER_LABEL[u.subscription_tier ?? 'free'] ?? u.subscription_tier}</span>
                    <span>{ROLE_LABEL[u.role ?? ''] ?? u.role ?? '—'}</span>
                    {u.usage && <span>{u.usage.lessons_this_month} estudo(s) este mês</span>}
                    <span className="text-[var(--cor-texto-dim)]">desde {dateLabel(u.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
