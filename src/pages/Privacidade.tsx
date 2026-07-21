import { Link } from 'react-router-dom';

/**
 * Política de Privacidade (LGPD - Lei 13.709/2018). Página pública.
 *
 * Reflete o que o sistema REALMENTE faz hoje. Se algum tratamento de dados
 * mudar (novo provedor, novo dado coletado), esta página precisa ser atualizada
 * junto — descrever o que não acontece é pior do que não ter política.
 *
 * Campos entre colchetes: preencher com os dados da empresa antes de vender.
 */
export default function Privacidade() {
  return (
    <div className="documento-legal max-w-3xl mx-auto p-5 pb-24">
      <p className="eyebrow mb-2">DOCUMENTO LEGAL</p>
      <h1>Política de Privacidade</h1>
      <p className="doc-data">Última atualização: 20 de julho de 2026</p>

      <h2>1. Controlador dos dados</h2>
      <p>
        A controladora dos dados pessoais tratados na Bíblia Expositiva PV é a pessoa
        jurídica inscrita no CNPJ sob o nº <strong>41.350.395/0001-30</strong>.
      </p>
      <p>
        Para exercer seus direitos ou tirar dúvidas sobre privacidade, escreva para
        {' '}<a href="mailto:suporte@grupo-soares.com">suporte@grupo-soares.com</a>.
        Respondemos em até 15 dias, conforme a LGPD.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <table className="doc-tabela">
        <thead>
          <tr><th>Dado</th><th>Para quê</th><th>Base legal</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>E-mail e nome</td>
            <td>Criar e identificar sua conta, enviar avisos sobre o serviço</td>
            <td>Execução do contrato</td>
          </tr>
          <tr>
            <td>CPF ou CNPJ</td>
            <td>Emitir a cobrança (exigência do meio de pagamento e da legislação fiscal)</td>
            <td>Obrigação legal</td>
          </tr>
          <tr>
            <td>Telefone e endereço (CEP e número)</td>
            <td>Exigidos pelo processador de pagamentos para autorizar a cobrança</td>
            <td>Execução do contrato</td>
          </tr>
          <tr>
            <td>Histórico de pagamentos</td>
            <td>Controlar sua assinatura e cumprir obrigações fiscais</td>
            <td>Obrigação legal</td>
          </tr>
          <tr>
            <td>Textos que você envia ao gerar estudos</td>
            <td>Produzir o conteúdo solicitado</td>
            <td>Execução do contrato</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>Não guardamos seu CPF/CNPJ nem os dados do seu cartão.</strong> O
        documento é enviado diretamente ao processador de pagamentos no momento da
        contratação e não fica armazenado em nosso banco de dados. Os dados do cartão
        são digitados na tela do próprio processador — nós nunca temos acesso a eles.
      </p>

      <h2>3. Com quem compartilhamos</h2>
      <p>
        Apenas com os fornecedores necessários para o serviço funcionar, e somente os
        dados que cada um precisa para cumprir sua função:
      </p>
      <ul>
        <li>
          <strong>Processador de pagamentos</strong> (instituição de pagamento
          brasileira) — recebe nome, e-mail, CPF/CNPJ, telefone e endereço para emitir
          e liquidar a cobrança.
        </li>
        <li>
          <strong>Provedor de banco de dados e autenticação</strong> — armazena sua
          conta, sua biblioteca de estudos e o histórico da assinatura.
        </li>
        <li>
          <strong>Provedor de inteligência artificial</strong> — recebe o conteúdo do
          seu pedido de estudo para gerar o material, sem seus dados de identificação.
        </li>
        <li>
          <strong>Provedor de hospedagem</strong> — entrega as páginas do site ao seu
          navegador.
        </li>
      </ul>
      <p>
        Você tem direito de saber quem são esses fornecedores. Basta pedir a lista
        nominal por e-mail para{' '}
        <a href="mailto:suporte@grupo-soares.com">suporte@grupo-soares.com</a> e nós
        informamos.
      </p>
      <p>
        Não vendemos, alugamos nem cedemos seus dados para publicidade ou para
        terceiros com finalidade comercial.
      </p>

      <h2>4. Transferência internacional</h2>
      <p>
        Os provedores de banco de dados, inteligência artificial e hospedagem podem
        processar dados em servidores fora do Brasil.
        Essas transferências ocorrem com base em cláusulas contratuais padrão de
        proteção de dados, conforme o artigo 33 da LGPD.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <ul>
        <li><strong>Dados da conta:</strong> enquanto sua assinatura estiver ativa.</li>
        <li>
          <strong>Após o cancelamento:</strong> excluímos os dados da conta em até 30 dias,
          se você pedir.
        </li>
        <li>
          <strong>Registros fiscais e de pagamento:</strong> mantidos por 5 anos, prazo
          exigido pela legislação tributária e pelo Código de Defesa do Consumidor.
        </li>
      </ul>

      <h2>6. Seus direitos</h2>
      <p>A LGPD garante que você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar se tratamos seus dados e acessar quais são;</li>
        <li>corrigir dados incompletos ou desatualizados;</li>
        <li>pedir a exclusão dos dados desnecessários ou tratados sem base legal;</li>
        <li>solicitar a portabilidade dos dados a outro fornecedor;</li>
        <li>revogar consentimento e saber com quem compartilhamos seus dados.</li>
      </ul>
      <p>
        Para exercer qualquer um deles, escreva para
        {' '}<a href="mailto:suporte@grupo-soares.com">suporte@grupo-soares.com</a>.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Todo o tráfego é criptografado (HTTPS). O acesso ao banco de dados é restrito
        por regras que impedem um usuário de ler dados de outro. Senhas são armazenadas
        de forma criptografada e ninguém da nossa equipe consegue lê-las.
      </p>
      <p>
        Nenhum sistema é 100% seguro. Em caso de incidente que possa gerar risco
        relevante a você, avisaremos você e a ANPD, conforme a LGPD.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Usamos apenas o armazenamento necessário para manter você conectado e guardar
        sua biblioteca no próprio navegador. Não usamos cookies de publicidade nem de
        rastreamento entre sites.
      </p>

      <h2>9. Menores de idade</h2>
      <p>
        O serviço é destinado a maiores de 18 anos. Não coletamos intencionalmente dados
        de crianças ou adolescentes.
      </p>

      <h2>10. Mudanças nesta política</h2>
      <p>
        Se alterarmos a forma como tratamos seus dados, avisaremos por e-mail ou dentro
        do app antes da mudança valer.
      </p>

      <p className="doc-rodape">
        <Link to="/termos">Termos de Uso</Link> · <Link to="/">Início</Link>
      </p>
    </div>
  );
}
