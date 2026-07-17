import { useLocation } from 'react-router-dom';
import StudyGenerator from '../components/StudyGenerator';

interface ExegeseState {
  reference?: string;
}

export default function Exegese() {
  const location = useLocation();
  const state = location.state as ExegeseState | null;

  return (
    <StudyGenerator
      titulo="Exegese"
      subtitulo="Análise versículo por versículo, com idiomas originais e variantes textuais."
      modoFixo="exegese"
      referenciaInicial={state?.reference ?? ''}
      placeholder="Ex.: João 1:1, Romanos 8:28…"
    />
  );
}
