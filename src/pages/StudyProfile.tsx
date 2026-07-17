import { Check, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudyProfileId, saveStudyProfileId, STUDY_PROFILES } from '../lib/profile';

export default function StudyProfile() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(getStudyProfileId);

  const save = () => {
    saveStudyProfileId(selected);
    navigate('/minha-conta');
  };

  return (
    <div className="p-4 max-w-3xl mx-auto w-full pb-24">
      <header className="text-center pt-5 mb-8">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[var(--cor-dourado-bg)] flex items-center justify-center"><GraduationCap className="text-[var(--cor-dourado)]" /></div>
        <p className="eyebrow mb-2">SEU PERFIL DE ESTUDO</p>
        <h1 className="font-['Playfair_Display'] text-3xl text-[var(--cor-dourado)]">A profundidade certa para você.</h1>
        <p className="text-sm text-[var(--cor-texto-medio)] max-w-lg mx-auto mt-2">A plataforma adapta linguagem, estrutura e densidade dos materiais ao seu momento de preparo.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        {STUDY_PROFILES.map((profile) => {
          const active = selected === profile.id;
          return <button key={profile.id} onClick={() => setSelected(profile.id)} className={`profile-option text-left ${active ? 'profile-option-active' : ''}`}>
            <span className="profile-check">{active && <Check size={14} />}</span>
            <strong>{profile.name}</strong><small>{profile.description}</small>
          </button>;
        })}
      </div>
      <button onClick={save} className="btn-primary w-full mt-6">Salvar meu perfil</button>
    </div>
  );
}
