"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AlertCircle, Save, RotateCcw, PiggyBank } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

const BudgetSettings = ({ user }) => {
  const [budgets, setBudgets] = useState({
    food: "",
    stationery: "",
    transport: "",
    utilities: "",
    entertainment: "",
    other: "",
  })
  const [totalBudget, setTotalBudget] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const categories = [
    { id: "food", name: "Food", icon: "🍽️", color: "bg-red-500" },
    { id: "stationery", name: "Stationery", icon: "🛒", color: "bg-green-500" },
    { id: "transport", name: "Transport", icon: "🚗", color: "bg-blue-500" },
    { id: "utilities", name: "Utilities", icon: "💡", color: "bg-yellow-500" },
    { id: "entertainment", name: "Entertainment", icon: "🎬", color: "bg-purple-500" },
    { id: "other", name: "Other", icon: "📝", color: "bg-gray-500" },
  ]

  const calculateTotal = (budgetValues) => {
    return Object.values(budgetValues)
      .reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0)
      .toFixed(2)
  }

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const budgetDoc = await getDoc(doc(db, `users/${user.uid}/settings`, "budgets"))
        if (budgetDoc.exists()) {
          const data = budgetDoc.data()
          const budgetData = {
            food: data.food?.toString() || "",
            stationery: data.stationery?.toString() || "",
            transport: data.transport?.toString() || "",
            utilities: data.utilities?.toString() || "",
            entertainment: data.entertainment?.toString() || "",
            other: data.other?.toString() || "",
          }
          setBudgets(budgetData)
          setTotalBudget(data.totalBudget?.toString() || "")
        }
      } catch (error) {
        console.error("Error fetching budgets:", error)
        setError("Failed to load budget settings")
      } finally {
        setLoading(false)
      }
    }

    fetchBudgets()
  }, [user.uid])

  const handleTotalBudgetChange = (value) => {
    setTotalBudget(value)
  }

  const handleInputChange = (category, value) => {
    setBudgets((prev) => {
      const newBudgets = {
        ...prev,
        [category]: value,
      }
      return newBudgets
    })
  }

  const handleReset = () => {
    setBudgets({
      food: "",
      stationery: "",
      transport: "",
      utilities: "",
      entertainment: "",
      other: "",
    })
    setTotalBudget("")
    toast.success("Budget settings reset")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const parsedBudgets = {
        ...Object.entries(budgets).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value ? Number.parseFloat(value) : 0,
          }),
          {},
        ),
        totalBudget: totalBudget ? Number.parseFloat(totalBudget) : 0,
      }

      await setDoc(doc(db, `users/${user.uid}/settings`, "budgets"), parsedBudgets)
      toast.success("Budget settings saved successfully")
    } catch (error) {
      console.error("Error saving budgets:", error)
      setError("Failed to save budget settings")
      toast.error("Failed to save budget settings")
    } finally {
      setSaving(false)
    }
  }

  const getCurrentTotal = () => {
    return calculateTotal(budgets)
  }

  const getBudgetAllocationPercentage = (categoryAmount) => {
    const total = getCurrentTotal()
    return total > 0 ? (Number.parseFloat(categoryAmount) / Number.parseFloat(total)) * 100 : 0
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <Skeleton className="h-[800px] w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <PiggyBank className="h-6 w-6" />
            Budget Settings
          </CardTitle>
          <CardDescription>Manage your monthly spending limits</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Total Budget Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-lg">Total Monthly Budget</Label>
                <span className="text-sm text-muted-foreground">Allocated: ₹{getCurrentTotal()}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => handleTotalBudgetChange(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-12 text-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              {Number.parseFloat(totalBudget) > 0 &&
                Number.parseFloat(getCurrentTotal()) > Number.parseFloat(totalBudget) && (
                  <Alert variant="warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Category allocations exceed total budget by ₹
                      {(Number.parseFloat(getCurrentTotal()) - Number.parseFloat(totalBudget)).toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
            </div>

            <Separator />

            {/* Category Budgets */}
            <div className="space-y-6">
              <Label className="text-lg">Category Allocations</Label>
              {categories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="flex items-center space-x-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      {getBudgetAllocationPercentage(budgets[category.id]).toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={budgets[category.id]}
                      onChange={(e) => handleInputChange(category.id, e.target.value)}
                      placeholder="0.00"
                      className="pl-8"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <Progress
                    value={getBudgetAllocationPercentage(budgets[category.id])}
                    className={`h-1 ${category.color}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex space-x-4 pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Budget Settings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all your budget allocations. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <Skeleton className="h-5 w-5 rounded-full" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default BudgetSettings
