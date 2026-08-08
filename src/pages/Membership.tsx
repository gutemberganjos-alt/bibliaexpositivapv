import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Building2, Check, Crown, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  PLANOS, startCheckout, documentoValido, formatarDocumento,
  telefoneValido, formatarTelefone, cepValido, formatarCep,
  type PlanId, type FormaPagamento, type Ciclo, type PixCobranca,
} from '../lib/subscription';
import { trackInitiateCheckout } from '../lib/pixel';

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
  // Cobrança PIX exibida dentro do app (QR + copia-e-cola).
  const [pix, setPix] = useState<PixCobranca | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Retorno do pagamento. O Asaas recusa URLs de callback com "?", então o status
  // chega no caminho (/assinatura/sucesso). Aceitamos as duas formas por segurança.
  // O estado é DERIVADO da URL — nada de setState em efeito, e a limpeza da URL
  // não cancela a confirmação (foi esse o bug: os timers morriam na hora).
  const { retorno } = useParams<{ retorno?: string }>();
  const statusRetorno = retorno ?? new URLSearchParams(location.search).get('status');
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

  // PIX exibido no app: consulta o banco a cada 4s até o webhook confirmar.
  // Sem isso o cliente pagaria e ficaria olhando para o QR sem saber de nada.
  useEffect(() => {
    if (!pix || active) return;
    const id = setInterval(() => { void refresh(); }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix, active]);

  // Assinatura confirmada: limpa a URL de retorno.
  useEffect(() => {
    if (statusRetorno === 'sucesso' && active) navigate('/assinatura', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusRetorno, active]);

  const gated = (location.state as { gated?: boolean } | null)?.gated;

  // O Asaas exige CPF/CNPJ e a forma de pagamento na criação da assinatura.
  const [planoEscolhido, setPlanoEscolhido] = useState<PlanId | null>(null);
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [ciclo, setCiclo] = useState<Ciclo>('MENSAL');
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [erroDoc, setErroDoc] = useState('');
  const [erroTel, setErroTel] = useState('');
  const [erroEnd, setErroEnd] = useState('');

  async function confirmarAssinatura() {
    if (!planoEscolhido) return;
    let invalido = false;
    if (!documentoValido(documento)) {
      setErroDoc('Informe um CPF ou CNPJ válido.');
      invalido = true;
    } else setErroDoc('');
    if (!telefoneValido(telefone)) {
      setErroTel('Informe um telefone com DDD.');
      invalido = true;
    } else setErroTel('');
    if (!cepValido(cep) || !numero.trim()) {
      setErroEnd('Informe o CEP e o número.');
      invalido = true;
    } else setErroEnd('');
    if (invalido) return;

    setLoadingPlan(planoEscolhido);
    try {
      const r = await startCheckout(planoEscolhido, documento, forma, telefone, ciclo, cep, numero, complemento);
      if (r.tipo === 'pix') {
        // PIX fica no app: mostramos o QR aqui e esperamos o webhook confirmar.
        setPix(r.pix);
        setLoadingPlan(null);
      } else {
        window.location.href = r.url;
      }
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

      {/* PIX dentro do app: QR code + copia-e-cola, aguardando a confirmação. */}
      {pix && !active && (
        <section className="card p-5 mb-5 text-center">
          <p className="eyebrow mb-1">PAGUE COM PIX</p>
          <h2 className="text-lg text-[var(--cor-dourado-claro)] mb-3">
            Abra o app do seu banco e escaneie o código
          </h2>

          {pix.imagemBase64 && (
            <img
              src={`data:image/png;base64,${pix.imagemBase64}`}
              alt="QR code do PIX"
              className="mx-auto w-52 h-52 rounded-lg bg-white p-2"
            />
          )}

          <p className="text-sm text-[var(--cor-texto-medio)] mt-4 mb-2">
            Ou copie o código e cole no seu banco:
          </p>
          <textarea
            readOnly
            value={pix.copiaECola}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full text-xs h-20 dados-cobranca"
          />
          <button
            type="button"
            className="btn-primary w-full mt-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(pix.copiaECola);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2500);
              } catch {
                showToast('Não consegui copiar. Selecione o código e copie manualmente.', 'info');
              }
            }}
          >
            {copiado ? 'Código copiado!' : 'Copiar código PIX'}
          </button>

          <p className="text-sm text-[var(--cor-dourado-claro)] flex items-center justify-center gap-2 mt-5">
            <Loader2 size={16} className="animate-spin" />
            Aguardando o pagamento…
          </p>
          <p className="text-xs text-[var(--cor-texto-dim)] mt-1">
            Assim que o banco confirmar, esta tela libera sozinha. Pode deixar aberta.
          </p>

          <button onClick={() => setPix(null)} className="btn-secondary mt-4">
            Voltar
          </button>
        </section>
      )}

      {planoEscolhido && !active && !pix && (
        <section className="card p-5 mb-5">
          <p className="eyebrow mb-1">FINALIZAR ASSINATURA</p>
          <h2 className="text-lg text-[var(--cor-dourado-claro)] mb-1">
            Plano {PLANOS[planoEscolhido].nome} — {PLANOS[planoEscolhido].precos[ciclo].precoLabel} {PLANOS[planoEscolhido].precos[ciclo].ciclo}
          </h2>
          <p className="text-xs text-[var(--cor-texto-dim)] mb-4">
            O Asaas exige esses dados para emitir a cobrança. Rua, bairro e cidade
            vêm automaticamente pelo CEP.
          </p>

          <p className="text-sm text-[var(--cor-texto-medio)] mb-2">Como prefere cobrar?</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(['MENSAL', 'ANUAL'] as Ciclo[]).map((c) => {
              const preco = PLANOS[planoEscolhido].precos[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCiclo(c)}
                  className={`card p-3 text-sm text-left ${ciclo === c ? 'border-[var(--cor-dourado)]' : ''}`}
                >
                  {c === 'MENSAL' ? 'Mensal' : 'Anual'}
                  <span className="block text-[var(--cor-dourado-claro)]">{preco.precoLabel}</span>
                  {preco.economiaLabel && (
                    <span className="block text-xs text-[var(--cor-texto-dim)]">{preco.economiaLabel}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Caixa dos dados de cobrança: tudo aqui é exigido pelo Asaas. */}
          <div className="dados-cobranca">
            <p className="dados-cobranca-titulo">Seus dados de cobrança</p>

            <label className="campo-rotulo" htmlFor="doc">CPF ou CNPJ <span className="obrigatorio">*</span></label>
            <input
              id="doc"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={documento}
              onChange={(e) => { setDocumento(formatarDocumento(e.target.value)); setErroDoc(''); }}
              className="w-full"
            />
            {erroDoc && <p className="campo-erro">{erroDoc}</p>}

            <label className="campo-rotulo mt-4" htmlFor="tel">Telefone com DDD <span className="obrigatorio">*</span></label>
            <input
              id="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(11) 91234-5678"
              value={telefone}
              onChange={(e) => { setTelefone(formatarTelefone(e.target.value)); setErroTel(''); }}
              className="w-full"
            />
            {erroTel && <p className="campo-erro">{erroTel}</p>}

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="col-span-2">
                <label className="campo-rotulo" htmlFor="cep">CEP <span className="obrigatorio">*</span></label>
                <input
                  id="cep"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="01310-100"
                  value={cep}
                  onChange={(e) => { setCep(formatarCep(e.target.value)); setErroEnd(''); }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="campo-rotulo" htmlFor="num">Número <span className="obrigatorio">*</span></label>
                <input
                  id="num"
                  inputMode="numeric"
                  placeholder="1000"
                  value={numero}
                  onChange={(e) => { setNumero(e.target.value); setErroEnd(''); }}
                  className="w-full"
                />
              </div>
            </div>
            {erroEnd && <p className="campo-erro">{erroEnd}</p>}

            <label className="campo-rotulo mt-4" htmlFor="compl">
              Complemento <span className="opcional">(opcional)</span>
            </label>
            <input
              id="compl"
              autoComplete="address-line2"
              placeholder="Apto 42, bloco B"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className="w-full"
            />

            <p className="dados-cobranca-nota">
              <span className="obrigatorio">*</span> Campos obrigatórios. Rua, bairro e cidade
              vêm automaticamente pelo CEP.
            </p>
          </div>

          <p className="text-sm text-[var(--cor-texto-medio)] mt-4 mb-2">Como prefere pagar?</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setForma('PIX')}
              className={`card p-3 text-sm text-left ${forma === 'PIX' ? 'border-[var(--cor-dourado)]' : ''}`}
            >
              PIX
              <span className="block text-xs text-[var(--cor-texto-dim)]">Cobranca todo mes por QR code</span>
            </button>
            <button
              type="button"
              onClick={() => setForma('CREDIT_CARD')}
              className={`card p-3 text-sm text-left ${forma === 'CREDIT_CARD' ? 'border-[var(--cor-dourado)]' : ''}`}
            >
              Cartao de credito
              <span className="block text-xs text-[var(--cor-texto-dim)]">Renova sozinho, sem esforco</span>
            </button>
          </div>

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
          <p className="text-xs text-[var(--cor-texto-dim)] mt-1">ou {PLANOS.individual.precos.ANUAL.precoLabel} por ano — {PLANOS.individual.precos.ANUAL.economiaLabel?.toLowerCase()}</p>
          {active ? (
            <button disabled className="btn-primary w-full mt-5 disabled:opacity-60">Plano ativo</button>
          ) : (
            <button
              onClick={() => {
                trackInitiateCheckout({ value: PLANOS.individual.precos.MENSAL.valor, plano: 'Individual', ciclo: 'MENSAL' });
                setPlanoEscolhido('individual');
              }}
              className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
            >
              Assinar agora
            </button>
          )}
        </article>
        <article className="plan-card plan-card-featured card p-6">
          <Building2 size={23} className="text-[var(--cor-dourado)] mb-4" />
          <p className="eyebrow">IGREJA</p>
          <h2>Para equipes que servem e formam pessoas.</h2>
          <p>Uma base para professores, líderes e ministérios estudarem com unidade.</p>
          <p className="text-2xl text-[var(--cor-dourado)] font-['Playfair_Display'] mt-4">{PLANOS.igreja.precoLabel}<span className="text-sm text-[var(--cor-texto-dim)] font-sans"> {PLANOS.igreja.ciclo}</span></p>
          <p className="text-xs text-[var(--cor-texto-dim)] mt-1">ou {PLANOS.igreja.precos.ANUAL.precoLabel} por ano — {PLANOS.igreja.precos.ANUAL.economiaLabel?.toLowerCase()}</p>
          <button disabled className="btn-primary w-full mt-5 disabled:opacity-60">
            {active ? 'Plano ativo' : 'Em breve — fale com o suporte'}
          </button>
        </article>
      </section>

      <p className="membership-trust"><ShieldCheck size={15} /> Pagamento processado com segurança (PIX e cartão). Reembolso automático em até 7 dias. Acesso liberado em poucos minutos após a confirmação do pagamento.</p>
    </div>
  );
}
