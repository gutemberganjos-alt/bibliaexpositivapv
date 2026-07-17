export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-4 flex flex-col items-center justify-center h-full text-center">
      <h1 className="font-['Manrope'] text-2xl text-[var(--cor-dourado)] mb-4">{title}</h1>
      <p className="text-[var(--cor-texto-medio)]">Esta funcionalidade será implementada em breve.</p>
    </div>
  );
}
