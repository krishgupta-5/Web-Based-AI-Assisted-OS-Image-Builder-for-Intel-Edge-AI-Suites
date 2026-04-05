"use client";

import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center text-white">

      <div className="w-full max-w-sm text-center space-y-4">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-5xl text-[#8B5CF6] font-semibold">EdgeOS</h1>
          <h1 className="text-xl text-white">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to continue your journey</p>
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          <button className="w-full flex items-center justify-center gap-3 bg-white text-black py-2 rounded-lg font-medium hover:bg-gray-200 transition">
            <FcGoogle size={20} />
            Continue with Google
          </button>

        </div>

        {/* Terms */}
        <p className="text-xs text-gray-500">
          By continuing, you agree to our Terms & Policy
        </p>

        {/* Back to Home (exact style) */}
        <button
          onClick={() => router.push("/")}
          className="mt-4 flex items-center justify-center gap-2 mx-auto text-sm text-gray-500 hover:text-gray-300 transition"
        >
          <span className="text-md leading-none">←</span>
          <span className="text-lg">Back to home</span>
        </button>

      </div>
    </main>
  );
}