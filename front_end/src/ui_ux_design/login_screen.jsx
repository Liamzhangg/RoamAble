import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./lib/firebase";

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  const handleSignUp = async () => {
    setError("");
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email to reset password");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setError("Password reset email sent!");
    } catch (err) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  const handleGuest = () => {
    onLoginSuccess();
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-blue-200 to-blue-400 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">AccessMap Login</h1>

        {error && (
          <div
            className={`p-2 mb-4 rounded ${
              error.includes("sent")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={handleSignIn}
          className="w-full bg-blue-500 text-white py-3 rounded mb-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </button>

        <button
          onClick={handleSignUp}
          className="w-full bg-green-500 text-white py-3 rounded mb-2 hover:bg-green-600 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Signing Up..." : "Sign Up"}
        </button>

        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-red-500 text-white py-3 rounded mb-2 hover:bg-red-600 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Signing In..." : "Sign In with Google"}
        </button>

        <div className="flex justify-between mt-2 mb-4 text-sm">
          <button
            onClick={handleForgotPassword}
            className="text-blue-600 hover:underline"
          >
            Forgot Password?
          </button>

          <button onClick={handleGuest} className="text-gray-600 hover:underline">
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
