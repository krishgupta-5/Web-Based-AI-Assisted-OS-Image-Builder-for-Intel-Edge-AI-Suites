"use client";

import { HeroAnimation } from "./HeroAnimation";

export function HeroContent() {
  return (
    <div className="relative z-10 mx-auto w-full sm:w-[88%] md:w-[85%] lg:w-[80%] xl:w-[80%] max-w-[1920px] overflow-x-hidden px-4 sm:px-4 md:px-5 lg:px-6 xl:px-8 2xl:px-10">

      <div className="grid md:grid-cols-2 gap-6 sm:gap-7 md:gap-8 lg:gap-10 xl:gap-12 2xl:gap-16 items-start md:min-h-[560px] lg:min-h-[660px] xl:min-h-[760px]">

        {/* LEFT CONTENT */}
        <div className="md:pl-2 lg:pl-7 xl:pl-3 lg:pr-6 xl:pr-8">

          {/* TEXT */}
          <div className="text-center md:text-left pt-36">

            <h1 className="font-serif text-4xl sm:text-2xl md:text-[26px] lg:text-[40px] xl:text-[60px] leading-tight lg:leading-[1.08] tracking-tight text-white mb-4 md:mb-4">
              <span className="block">EdgeOS</span>
            </h1>

            <p className="max-w-xl mx-auto md:mx-0 text-sm lg:text-[17px] xl:text-[14px] text-[#A1A1AA] mb-10 leading-relaxed font-sans">
              Describe your AI usecase and instantly generate deployment-ready system architectures.
              From models to pipelines and APIs, everything is structured, optimized, and ready to build.
            </p>
          </div>

          {/* MOBILE ANIMATION */}
          <div className="relative mx-auto md:hidden w-full max-w-[420px] h-[220px] sm:h-[250px] mb-12 overflow-visible">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.42] sm:scale-[0.4]">
              <HeroAnimation />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex items-center justify-center md:justify-start gap-3 mt-8">

            <a
              href="/features"
              className="bg-[#8B5CF6] hover:bg-[#A78BFA]/90 text-white rounded-[12px] px-4 py-2 text-sm font-medium transition"
            >
              See Features →
            </a>

            <a
              href="/home"
              className="bg-white/10 hover:bg-white/20 text-white rounded-[12px] px-4 py-2 text-sm font-medium transition"
            >
              Try Now
            </a>

          </div>

        </div>

        {/* RIGHT ANIMATION (DESKTOP) */}
        <div className="relative hidden md:block perspective-[2000px] -mt-4 lg:-mt-6 xl:ml-14 z-10">
          <HeroAnimation className="scale-[0.36] lg:scale-[0.4] xl:scale-[0.7] origin-top-left" />
        </div>

      </div>
    </div>
  );
}