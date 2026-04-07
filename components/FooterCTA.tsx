"use client";
export default function FooterCTA() {
    return (<>
      
      <section className="relative py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] p-8 md:p-8 lg:p-12 overflow-hidden">
            
            <div className="absolute inset-0 z-0" style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)",
        }}/>
            
            
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Ready to automate your workflow?
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Start building powerful workflows in minutes with EdgeOS
              </p>
              <a href="/home" className="group inline-flex items-center gap-0.5 px-6 py-2 bg-white text-[#8B5CF6] font-semibold rounded-xl hover:bg-white/90 transition-all duration-150">
                Get Started
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" className="size-5 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none">
                  <path stroke="currentColor" strokeLinecap="square" strokeWidth="1.25" d="M8.333 13.333 11.667 10 8.333 6.667"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>);
}