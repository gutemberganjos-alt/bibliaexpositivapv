import { Link } from 'react-router-dom';
import { PLANOS } from '../lib/subscription';

/**
 * Termos de Uso. Página pública (não exige login) porque o cliente precisa
 * poder ler ANTES de assinar — e o Asaas/bandeiras exigem isso acessível.
 *
 * Os campos entre colchetes precisam ser preenchidos com os dados da empresa
 * antes de vender: razão social, CNPJ e endereço.
 */
export default function Termos() {
  return (
    <div className="documento-legal max-w-3xl mx-auto p-5 pb-24">
      <p className="eyebrow mb-2">DOCUMENTO LEGAL</p>
      <h1>Termos de Uso</h1>
      <p className="doc-data">Última atualização: 20 de julho de 2026</p>

      <h2>1. Quem somos</h2>
      <p>
        A Bíblia Expositiva PV é um serviço de assinatura operado por pessoa jurídica
        inscrita no CNPJ sob o nº <strong>41.350.395/0001-30</strong>.
      </p>
      <p>
        Contato: <a href="mailto:suporte@grupo-soares.com">suporte@grupo-soares.com</a>.
        Respondemos em até 2 dias úteis.
      </p>

      <h2>2. O que o serviço faz</h2>
      <p>
        A Bíblia Expositiva PV usa inteligência artificial para ajudar no preparo de
        estudos bíblicos, sermões, exegeses e materiais de ensino. O conteúdo é gerado
        automaticamente a partir do que você solicita.
      </p>
      <p>
        <strong>Importante:</strong> o material gerado é uma ferramenta de apoio ao seu
        estudo, não uma autoridade doutrinária. Sistemas de IA podem cometer erros,
        inclusive em referências bíblicas, datas e citações. Confira sempre o texto
        bíblico nas fontes originais antes de ensinar ou publicar. A responsabilidade
        pelo conteúdo que você utiliza ou divulga é sua.
      </p>

      <h2>3. Conta e uso pessoal</h2>
      <p>
        Você precisa criar uma conta com e-mail válido e é responsável por manter sua
        senha em sigilo. O plano {PLANOS.individual.nome} é de uso individual. O plano
        {' '}{PLANOS.igreja.nome} destina-se a equipes de uma mesma igreja ou ministério.
      </p>
      <p>Não é permitido usar o serviço para:</p>
      <ul>
        <li>revender, redistribuir ou sublicenciar o acesso a terceiros;</li>
        <li>gerar conteúdo que incite ódio, violência ou discriminação;</li>
        <li>tentar burlar limites de uso, sistemas de cobrança ou segurança;</li>
        <li>qualquer finalidade ilegal.</li>
      </ul>

      <h2>4. Limites de uso</h2>
      <p>
        Cada assinatura inclui uma quantidade mensal de gerações, informada no app. O
        limite reinicia a cada ciclo de cobrança e não é acumulativo. Uso automatizado
        ou muito acima do padrão pode ser suspenso, com aviso prévio sempre que possível.
      </p>

      <h2>5. Preços, cobrança e renovação</h2>
      <p>
        Os valores vigentes são {PLANOS.individual.precos.MENSAL.precoLabel}/mês ou
        {' '}{PLANOS.individual.precos.ANUAL.precoLabel}/ano no plano {PLANOS.individual.nome}, e
        {' '}{PLANOS.igreja.precos.MENSAL.precoLabel}/mês ou {PLANOS.igreja.precos.ANUAL.precoLabel}/ano
        no plano {PLANOS.igreja.nome}.
      </p>
      <p>
        A cobrança é processada pelo Asaas (Asaas Gestão Financeira S.A.), nosso
        provedor de pagamentos. Aceitamos PIX e cartão de crédito.
      </p>
      <ul>
        <li>
          <strong>Cartão:</strong> a assinatura renova automaticamente ao fim de cada
          ciclo, até você cancelar.
        </li>
        <li>
          <strong>PIX:</strong> uma nova cobrança é gerada a cada ciclo e precisa ser
          paga por você para manter o acesso.
        </li>
      </ul>
      <p>
        Podemos reajustar os preços. Nesse caso, avisaremos com no mínimo 30 dias de
        antecedência, e o novo valor só vale a partir do ciclo seguinte.
      </p>

      <h2>6. Cancelamento e reembolso</h2>
      <p>
        <strong>Arrependimento (7 dias).</strong> Conforme o artigo 49 do Código de
        Defesa do Consumidor, você pode desistir em até 7 dias corridos da contratação e
        receber o valor integral de volta. Basta cancelar dentro do app: o reembolso é
        processado automaticamente.
      </p>
      <p>
        <strong>Depois de 7 dias.</strong> Você pode cancelar a qualquer momento e o
        acesso permanece até o fim do período já pago. Não há multa nem fidelidade, e
        não há devolução proporcional do período em curso.
      </p>

      <h2>7. Propriedade do conteúdo</h2>
      <p>
        O conteúdo que você gera é seu: pode usar em aulas, sermões, publicações e
        materiais da sua igreja, inclusive comercialmente. O software, a marca e a
        interface da Bíblia Expositiva PV continuam sendo nossos.
      </p>

      <h2>8. Disponibilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar, mas ele depende de terceiros
        (hospedagem e provedores de IA) e pode ter interrupções para manutenção ou por
        falhas fora do nosso controle. Não garantimos disponibilidade ininterrupta. Se
        houver indisponibilidade prolongada por nossa causa, você pode solicitar
        compensação proporcional pelo e-mail de suporte.
      </p>

      <h2>9. Encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes Termos, com aviso prévio
        sempre que possível e devolução proporcional do valor já pago, salvo em casos de
        fraude ou uso ilegal.
      </p>

      <h2>10. Alterações destes Termos</h2>
      <p>
        Podemos atualizar estes Termos. Mudanças relevantes serão avisadas por e-mail ou
        dentro do app com 30 dias de antecedência. Continuar usando o serviço após esse
        prazo significa que você concorda com a nova versão.
      </p>

      <h2>11. Lei aplicável</h2>
      <p>
        Estes Termos seguem a lei brasileira. Fica eleito o foro do domicílio do
        consumidor para resolver qualquer controvérsia, conforme o Código de Defesa do
        Consumidor.
      </p>

      <p className="doc-rodape">
        <Link to="/privacidade">Política de Privacidade</Link> · <Link to="/">Início</Link>
      </p>
    </div>
  );
}
