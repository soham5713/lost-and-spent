import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReceiptIndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom"; // Added for proper navigation

const LoginPage = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Added for proper navigation

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if this is a first-time user
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // First time user - create their document
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date()
        });
        
        // Set up default budget settings with stationery instead of groceries
        const budgetDocRef = doc(db, `users/${user.uid}/settings`, 'budgets');
        await setDoc(budgetDocRef, {
          food: 0,
          stationery: 0, // Changed from groceries to stationery
          transport: 0,
          utilities: 0,
          entertainment: 0,
          other: 0,
          totalBudget: 0
        });
        
        navigate("/"); // Changed to use React Router navigation
      } else {
        // Returning user - redirect to expenses list
        navigate("/expenses"); // Changed to use React Router navigation
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Failed to login with Google. Please try again.");
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ReceiptIndianRupee className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Expense Tracker</CardTitle>
          <CardDescription>Sign in to manage your expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;