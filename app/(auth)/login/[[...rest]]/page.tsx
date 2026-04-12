"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function LoginPage() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-black relative px-4"
      style={{ fontFamily: '"Geist Mono", monospace' }}
    >
      {/* ───────────────────────────────────────────── */}
      {/* GLOBAL CSS OVERRIDES                          */}
      {/* ───────────────────────────────────────────── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Obliterate Clerk Watermarks & Dev Badges */
        .cl-watermark, .cl-internal-b3al4t { 
            display: none !important; 
            opacity: 0 !important; 
            visibility: hidden !important; 
        }
        div[style*="repeating-linear-gradient"],
        div[style*="background-image: repeating-linear-gradient"] { 
            display: none !important; 
        }
        
        /* Hide stray wrappers */
        .cl-rootBox > div > div:last-child:not(.cl-card) {
             display: none !important;
        }

        /* Enforce flat UI */
        .cl-card { box-shadow: none !important; }
        
        /* Remove default outlines on focus */
        .cl-formFieldInput:focus {
            box-shadow: none !important;
            outline: none !important;
        }
      `,
        }}
      />

      {/* ───────────────────────────────────────────── */}
      {/* CUSTOM HEADER (Matches EDGE-OS Structure)     */}
      {/* ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center mb-6 text-center z-10 w-full max-w-[360px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-[#000] border border-[#333] flex items-center justify-center rounded-[2px]">
            <span className="text-[#EAEAEA] font-mono text-[14px] mt-[1px] ml-[1px]">&gt;</span>
          </div>
          <div className="text-[14px] font-semibold text-[#EAEAEA] font-mono tracking-[1px]">
            EDGE-OS <span className="text-[#666] font-normal">// AUTH</span>
          </div>
        </div>
        
        <div className="w-full flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-[#1A1A1A]"></div>
          <div className="text-[#888] text-[10px] uppercase tracking-[1px] font-mono font-semibold">
            System Login
          </div>
          <div className="h-[1px] flex-1 bg-[#1A1A1A]"></div>
        </div>
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* CLERK COMPONENT                               */}
      {/* ───────────────────────────────────────────── */}
      <div className="w-full max-w-[360px] z-10">
        <SignIn
          routing="hash"
          forceRedirectUrl="/chat"
          appearance={{
            variables: {
              colorBackground: "#000000",
              colorPrimary: "#EAEAEA",
              colorDanger: "#ef4444",
              fontFamily: '"Geist Mono", monospace',
              borderRadius: "2px", // Strict sharp corners
            },
            elements: {
              rootBox: {
                width: "100%",
              },
              card: {
                backgroundColor: "#000000",
                border: "1px solid #1A1A1A",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)", // Match floating input shadow
                padding: "32px 24px",
                borderRadius: "4px",
              },
              header: {
                display: "none", // Hidden in favor of our custom header above
              },
              socialButtonsBlockButton: {
                backgroundColor: "transparent",
                border: "1px solid #222222",
                color: "#A1A1AA",
                borderRadius: "2px",
                fontFamily: '"Geist Mono", monospace',
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                padding: "12px",
                justifyContent: "center",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "#111111",
                  borderColor: "#444444",
                  color: "#EAEAEA",
                },
              },
              socialButtonsBlockButtonText: {
                fontWeight: "600",
              },
              dividerLine: {
                background: "#1A1A1A",
              },
              dividerText: {
                color: "#666666",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontFamily: '"Geist Mono", monospace',
              },
              formFieldLabel: {
                color: "#888888",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: "600",
                marginBottom: "8px",
                fontFamily: '"Geist Mono", monospace',
              },
              formFieldInput: {
                backgroundColor: "#000000",
                border: "1px solid #222222",
                color: "#EAEAEA",
                borderRadius: "2px",
                fontSize: "13px",
                padding: "10px 12px",
                fontFamily: '"Geist Mono", monospace',
                transition: "border-color 0.2s",
                "&:focus": {
                  borderColor: "#555555",
                },
              },
              formButtonPrimary: {
                backgroundColor: "#EAEAEA",
                color: "#000000",
                borderRadius: "2px",
                fontSize: "12px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px",
                padding: "12px",
                marginTop: "16px",
                border: "1px solid #EAEAEA",
                fontFamily: '"Geist Mono", monospace',
                transition: "all 0.15s ease",
                "&:hover": {
                  backgroundColor: "#FFFFFF",
                },
              },
              footer: {
                background: "transparent",
                borderTop: "1px solid #1A1A1A",
                padding: "0",
                paddingTop: "20px",
                marginTop: "24px",
              },
              footerActionText: {
                color: "#666666",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontFamily: '"Geist Mono", monospace',
              },
              footerActionLink: {
                color: "#A1A1AA",
                fontSize: "11px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginLeft: "6px",
                fontFamily: '"Geist Mono", monospace',
                "&:hover": {
                  color: "#EAEAEA",
                },
              },
            },
          }}
        />
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* CUSTOM FIXED FOOTER                           */}
      {/* ───────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
        <div className="text-[#444444] text-[10px] uppercase tracking-[1px] flex gap-4 pointer-events-auto font-mono">
          <a href="#" className="hover:text-[#EAEAEA] transition-colors">
            Terms of Service
          </a>
          <span>&bull;</span>
          <a href="#" className="hover:text-[#EAEAEA] transition-colors">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}