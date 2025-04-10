"use client"

import React, { useState, useEffect } from "react"
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom"
import AddExpense from "./components/AddExpense"
import BudgetSettings from "./components/BudgetSettings"
import ExpenseList from "./components/ExpenseList"
import ExpenseAnalytics from "./components/ExpenseAnalytics"
import LoginPage from "./components/LoginPage"
import Navbar from "./components/Navbar"
import ProfilePage from "./components/ProfilePage"
import Notifications from "./components/Notifications"
import LoansList from "./components/LoansList"
import AddLoan from "./components/AddLoan"
import GroupsList from "./components/GroupsList"
import GroupDetail from "./components/GroupDetail"
import AddGroupExpense from "./components/AddGroupExpense"
import SettleUp from "./components/SettleUp"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { auth } from "./firebase/firebase"
import { Skeleton } from "@/components/ui/skeleton"

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState(null)
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setAuthChecked(true)
    })

    return () => unsubscribe()
  }, [])

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return (
    <>
      <Navbar user={user} />
      {React.cloneElement(children, { user })}
    </>
  )
}

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="expense-tracker-theme">
      <Router>
        <div className="min-h-screen bg-background font-sans antialiased">
          <style jsx global>{`
          @media (max-width: 475px) {
            .xs\\:inline {
              display: inline;
            }
            .xs\\:max-w-\\[220px\\] {
              max-width: 220px;
            }
          }
        `}</style>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/add-expense"
              element={
                <ProtectedRoute>
                  <AddExpense />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <ExpenseList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <ExpenseAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <BudgetSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans"
              element={
                <ProtectedRoute>
                  <LoansList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-loan"
              element={
                <ProtectedRoute>
                  <AddLoan />
                </ProtectedRoute>
              }
            />
            {/* Group Routes */}
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <GroupsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <GroupDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId/add-expense"
              element={
                <ProtectedRoute>
                  <AddGroupExpense />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId/settle"
              element={
                <ProtectedRoute>
                  <SettleUp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

// Public Route wrapper component for the login page
const PublicRoute = ({ children }) => {
  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setAuthChecked(true)
    })

    return () => unsubscribe()
  }, [])

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/expenses" replace />
  }

  return children
}

export default App
