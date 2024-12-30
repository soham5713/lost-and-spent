import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Receipt } from "lucide-react";

const LoginPage = () => {
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if this is a first-time user
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // First time user - create their document and redirect to add-expense
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date()
        });
        
        // Also set up default budget settings
        const budgetDocRef = doc(db, `users/${user.uid}/settings`, 'budgets');
        await setDoc(budgetDocRef, {
          food: 0,
          groceries: 0,
          transport: 0,
          utilities: 0,
          entertainment: 0,
          other: 0,
          totalBudget: 0
        });
        
        window.location.href = "/add-expense";
      } else {
        // Returning user - redirect to expenses list
        window.location.href = "/expenses";
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
            <Receipt className="h-12 w-12 text-primary" />
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