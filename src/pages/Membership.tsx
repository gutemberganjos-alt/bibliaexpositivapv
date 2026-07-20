import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Check, Crown, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  PLANOS, startCheckout, documentoValido, formatarDocumento, type PlanId,
} from '../lib/subscription';

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

  // Retorno do Checkout da Stripe (?status=sucesso|cancelado).
  // O estado é DERIVADO da URL — nada de setState em efeito, e a limpeza da URL
  // não cancela a confirmação (foi esse o bug: os timers morriam na hora).
  const statusRetorno = new URLSearchParams(location.search).get('status');
  const [desistiu, setDesistiu] = useState(false);
  const confirmando = statusRetorno === 'sucesso' && !active && !desistiu;
  const avisou = useRef(false);

  useEffect(() => {
    if (!statusRetorno || avisou.current) return;
    avisou.current = true;
    if (statusRetorno === 'sucesso') {
      showToast('Pagamento recebido! Confirmando sua assinatura...', 'success');
    } else if (statusRetorno === 'cancelado') {
      showToast('Checkout cancelado. Você pode tentar novamente quando quiser.', 'info');
      navigate('/assinatura', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusRetorno]);

  // O webhook da Stripe leva alguns segundos: consulta repetidamente até a
  // assinatura aparecer (~40s), em vez de checar uma vez e dizer que não existe.
  useEffect(() => {
    if (!confirmando) return;
    let tentativas = 0;
    const id = setInterval(() => {
      tentativas += 1;
      void refresh();
      if (tentativas >= 16) {
        clearInterval(id);
        setDesistiu(true);
      }
    }, 2500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmando]);

  // Assinatura confirmada: limpa a URL de retorno.
  useEffect(() => {
    if (statusRetorno === 'sucesso' && active) navigate('/assinatura', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusRetorno, active]);

  const gated = (location.state as { gated?: boolean } | null)?.gated;

  // O Asaas exige CPF/CNPJ e a forma de pagamento na criação da assinatura.
  const [planoEscolhido, setPlanoEscolhido] = useState<PlanId | null>(null);
  const [documento, setDocumento] = useState('');
  const [erroDoc, setErroDoc] = useState('');

  function escolherPlano(plan: PlanId) {
    setPlanoEscolhido(plan);
    setErroDoc('');
  }

  async function confirmarAssinatura() {
    if (!planoEscolhido) return;
    if (!documentoValido(documento)) {
      setErroDoc('Informe um CPF ou CNPJ válido.');
      return;
    }
    setErroDoc('');
    setLoadingPlan(planoEscolhido);
    try {
      await startCheckout(planoEscolhido, documento);
    } catch (e) {
      showToast((e as Error).message || 'Não foi possível iniciar a assinatura.', 'error');
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

      {confirmando && !active && (
        <div className="card p-4 mb-5 text-center">
          <p className="text-sm text-[var(--cor-dourado-claro)] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Pagamento recebido. Confirmando sua assinatura — isso leva alguns segundos.
          </p>
          <p className="text-xs text-[var(--cor-texto-dim)] mt-1">Pode deixar esta página aberta; o acesso libera sozinho.</p>
        </div>
      )}

      {gated && !active && !confirmando && (
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

      {planoEscolhido && !active && (
        <section className="card p-5 mb-5">
          <p className="eyebrow mb-1">FINALIZAR ASSINATURA</p>
          <h2 className="text-lg text-[var(--cor-dourado-claro)] mb-1">
            Plano {PLANOS[planoEscolhido].nome} — {PLANOS[planoEscolhido].precoLabel} {PLANOS[planoEscolhido].ciclo}
          </h2>
          <p className="text-xs text-[var(--cor-texto-dim)] mb-4">
            Precisamos do seu CPF ou CNPJ para emitir a cobrança. Na próxima tela você escolhe entre PIX e cartão de crédito.
          </p>

          <label className="block text-sm text-[var(--cor-texto-medio)] mb-1" htmlFor="doc">CPF ou CNPJ</label>
          <input
            id="doc"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={documento}
            onChange={(e) => { setDocumento(formatarDocumento(e.target.value)); setErroDoc(''); }}
            className="w-full mb-1"
          />
          {erroDoc && <p className="text-xs text-[var(--cor-erro)] mb-2">{erroDoc}</p>}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={confirmarAssinatura}
              disabled={loadingPlan !== null}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loadingPlan !== null && <Loader2 size={16} className="animate-spin" />}
              Ir para o pagamento
            </button>
            <button onClick={() => setPlanoEscolhido(null)} className="btn-secondary" disabled={loadingPlan !== null}>
              Voltar
            </button>
          </div>
        </section>
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
            onClick={() => escolherPlano('individual')}
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
            onClick={() => escolherPlano('igreja')}
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
