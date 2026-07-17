import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Check, Crown, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { PLANOS, startCheckout, type PlanId } from '../lib/subscription';

const BENEFITS = [
  'Estudos, sermões e exegeses estruturados',
  'Biblioteca pessoal e kit de aula',
  'Conteúdo reutilizável sem nova geração',
  'Experiência completa em celular, tablet e computador',
];

export default function Membership() {
  const { showToast } = useToast();
  const { active, subscription, refresh } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  // Retorno do Checkout da Stripe (?status=sucesso|cancelado)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status === 'sucesso') {
      showToast('Pagamento recebido! Estamos liberando seu acesso...', 'success');
      // O webhook pode levar alguns segundos; atualiza algumas vezes.
      void refresh();
      const t1 = setTimeout(() => void refresh(), 3000);
      const t2 = setTimeout(() => void refresh(), 8000);
      navigate('/assinatura', { replace: true });
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (status === 'cancelado') {
      showToast('Checkout cancelado. Você pode tentar novamente quando quiser.', 'info');
      navigate('/assinatura', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const gated = (location.state as { gated?: boolean } | null)?.gated;

  async function assinar(plan: PlanId) {
    setLoadingPlan(plan);
    try {
      await startCheckout(plan);
    } catch (e) {
      showToast((e as Error).message || 'Não foi possível abrir o checkout.', 'error');
      setLoadingPlan(null);
    }
  }

  return (
    <div className="membership-page max-w-4xl mx-auto p-4 pb-24">
      <header className="text-center mt-4 mb-10">
        <p className="eyebrow mb-3">ACESSO PREMIUM</p>
        <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl text-[var(--cor-dourado)] mb-3">Ferramentas sérias para ensinar a Palavra.</h1>
        <p className="text-[var(--cor-texto-medio)] text-sm max-w-xl mx-auto">A Bíblia Expositiva é um serviço por assinatura, construído para estudo consistente e preparo de aulas e mensagens.</p>
      </header>

      {gated && !active && (
        <div className="card p-4 mb-5 border-[var(--cor-dourado)]/40 text-center">
          <p className="text-sm text-[var(--cor-dourado-claro)]">Este recurso é exclusivo para assinantes. Escolha um plano para liberar a geração de estudos.</p>
        </div>
      )}

      {active && (
        <div className="card p-5 mb-5 text-center">
          <p className="text-[var(--cor-dourado-claro)] flex items-center justify-center gap-2">
            <ShieldCheck size={18} /> Sua assinatura está ativa
            {subscription?.tier === 'church' ? ' — plano Igreja' : subscription?.tier === 'premium' ? ' — plano Individual' : ''}.
          </p>
          {subscription?.cancel_at_period_end && subscription?.current_period_end && (
            <p className="text-xs text-[var(--cor-texto-dim)] mt-1">
              Cancelamento agendado. Acesso até {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}.
            </p>
          )}
          <button onClick={() => navigate('/minha-conta')} className="btn-secondary mt-4">Gerenciar assinatura</button>
        </div>
      )}

      <section className="membership-benefits card p-5 mb-5">
        {BENEFITS.map((benefit) => <div key={benefit}><Check size={17} /> <span>{benefit}</span></div>)}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <article className="plan-card card p-6">
          <Crown size={23} className="text-[var(--cor-dourado)] mb-4" />
          <p className="eyebrow">INDIVIDUAL</p>
          <h2>Para quem estuda, ensina e ministra.</h2>
          <p>Seu acervo, seus estudos e seus kits em uma experiência única.</p>
          <p className="text-2xl text-[var(--cor-dourado)] font-['Playfair_Display'] mt-4">{PLANOS.individual.precoLabel}<span className="text-sm text-[var(--cor-texto-dim)] font-sans"> {PLANOS.individual.ciclo}</span></p>
          <button
            onClick={() => assinar('individual')}
            disabled={loadingPlan !== null || active}
            className="btn-primary w-full mt-5 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loadingPlan === 'individual' && <Loader2 size={16} className="animate-spin" />}
            {active ? 'Plano ativo' : 'Assinar plano individual'}
          </button>
        </article>
        <article className="plan-card plan-card-featured card p-6">
          <Building2 size={23} className="text-[var(--cor-dourado)] mb-4" />
          <p className="eyebrow">IGREJA</p>
          <h2>Para equipes que servem e formam pessoas.</h2>
          <p>Uma base para professores, líderes e ministérios estudarem com unidade.</p>
          <p className="text-2xl text-[var(--cor-dourado)] font-['Playfair_Display'] mt-4">{PLANOS.igreja.precoLabel}<span className="text-sm text-[var(--cor-texto-dim)] font-sans"> {PLANOS.igreja.ciclo}</span></p>
          <button
            onClick={() => assinar('igreja')}
            disabled={loadingPlan !== null || active}
            className="btn-primary w-full mt-5 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loadingPlan === 'igreja' && <Loader2 size={16} className="animate-spin" />}
            {active ? 'Plano ativo' : 'Assinar plano igreja'}
          </button>
        </article>
      </section>

      <p className="membership-trust"><ShieldCheck size={15} /> Cobrança segura via Stripe (cartão e PIX). Reembolso integral em até 7 dias. Acesso liberado após a confirmação do pagamento.</p>
    </div>
  );
}
