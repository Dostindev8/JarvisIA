import JarvisOrb from '../jarvis/JarvisOrb';

export default function CosmosLoadingScreen({ message = 'Inicializando JARVIS' }) {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-jarvis-void">
      <div className="scale-50">
        <JarvisOrb state="thinking" />
      </div>
      <p className="font-jarvis text-jarvis-gold text-sm mt-6">
        {message}
        <span className="animate-pulse">...</span>
      </p>
    </div>
  );
}
