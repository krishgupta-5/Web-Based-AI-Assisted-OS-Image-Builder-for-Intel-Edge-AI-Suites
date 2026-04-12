export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 
          className="text-6xl md:text-8xl font-bold mb-8 tracking-wider"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          WE ARE LAUNCHING
        </h1>
        <h2 
          className="text-4xl md:text-6xl font-bold text-gray-400"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          SOON...
        </h2>
      </div>
    </div>
  );
}