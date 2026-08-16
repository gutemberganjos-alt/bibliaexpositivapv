import { useSearchParams } from 'react-router-dom';
import StudyGenerator from '../components/StudyGenerator';
import { MODOS, PUBLICOS } from '../lib/ai-config';

export default function Estudos() {
  const [searchParams] = useSearchParams();
  const modoParam = searchParams.get('modo');
  // Só trava o formato se o valor da URL for um modo real — link quebrado ou
  // digitado errado cai no comportamento normal (seletor de formato aberto).
  const modoFixo = MODOS.some((m) => m.id === modoParam) ? modoParam! : undefined;
  // Pré-preenche o campo de referência (ex.: vindo de "Trilhas recomendadas" no
  // Dashboard, da paleta de comando ⌘K, ou de "Versículo do dia"). Link
  // quebrado/sem o parâmetro cai no campo vazio normal.
  const referenciaParam = searchParams.get('ref') ?? '';
  const publicoParam = searchParams.get('publico');
  const publicoInicial = PUBLICOS.some((p) => p.id === publicoParam) ? publicoParam! : undefined;

  return (
    <StudyGenerator
      key={`${modoFixo ?? 'livre'}:${referenciaParam}:${publicoInicial ?? ''}`}
      titulo="Estudos"
      subtitulo="Gere material bíblico sob medida: escolha o formato, o público e o texto."
      modoFixo={modoFixo}
      referenciaInicial={referenciaParam}
      publicoInicial={publicoInicial}
    />
  );
}
