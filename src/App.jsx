import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import AddExpense from "./components/AddExpense";
// import BudgetSettings from "./components/BudgetSettings";
import ExpenseList from "./components/ExpenseList";
import ExpenseAnalytics from "./components/ExpenseAnalytics";
import LoginPage from "./components/LoginPage";
import Navbar from "./components/Navbar";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { auth } from "./firebase/firebase";

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="expense-tracker-theme">
      <Router>
        <div className="min-h-screen bg-background font-sans antialiased">
          {user && <Navbar user={user} />}
          <Routes>
            <Route
              path="/"
              element={user ? <Navigate to="/expenses" /> : <LoginPage />}
            />
            <Route
              path="/add-expense"
              element={user ? <AddExpense user={user} /> : <Navigate to="/" />}
            />
            <Route
              path="/expenses"
              element={user ? <ExpenseList user={user} /> : <Navigate to="/" />}
            />
            <Route
              path="/analytics"
              element={user ? <ExpenseAnalytics user={user} /> : <Navigate to="/" />}
            />
            {/* <Route
              path="/settings"
              element={user ? <BudgetSettings user={user} /> : <Navigate to="/" />}
            /> */}
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;