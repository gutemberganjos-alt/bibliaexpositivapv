import { useLocation } from 'react-router-dom';
import StudyGenerator from '../components/StudyGenerator';

interface InterpretacaoState {
  reference?: string;
}

export default function Interpretacao() {
  const location = useLocation();
  const state = location.state as InterpretacaoState | null;

  return (
    <StudyGenerator
      titulo="Interpretação"
      subtitulo="Contexto, hermenêutica, teologia bíblica e aplicação prática do texto."
      modoFixo="estudo"
      referenciaInicial={state?.reference ?? ''}
      placeholder="Ex.: Salmos 23, o sermão do monte…"
    />
  );
}
