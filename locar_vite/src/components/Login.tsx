import React, { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase"; // adjust path as needed
import { Loader2, LogIn } from "lucide-react";

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      alert("Login successful!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100">
      <div className="w-full max-w-sm p-8 bg-white shadow-2xl rounded-2xl text-center">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">
          Welcome Back
        </h1>
        <p className="text-gray-500 mb-8">Sign in with your Google account</p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg py-2.5 shadow-sm hover:bg-gray-50 transition disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 text-indigo-600" />
              <span className="text-gray-700 font-medium">Signing in...</span>
            </>
          ) : (
            <>
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="h-5 w-5"
              />
              <span className="text-gray-700 font-medium">
                Sign in with Google
              </span>
            </>
          )}
        </button>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <div className="mt-8 flex items-center justify-center text-gray-400 text-sm">
          <LogIn className="w-4 h-4 mr-1" />
          <span>Powered by Firebase Authentication</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
