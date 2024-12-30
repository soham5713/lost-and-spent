import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { addDoc, collection, doc, updateDoc, getDoc, query, getDocs, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { PlusCircle, Save, CalendarIcon, AlertCircle } from "lucide-react";

const AddExpense = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const editingExpense = location.state?.expense;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState(null);

  const categories = [
    { id: "food", name: "Food", icon: "🍽️" },
    { id: "stationery", name: "Stationery", icon: "🛒" },
    { id: "transport", name: "Transport", icon: "🚗" },
    { id: "utilities", name: "Utilities", icon: "💡" },
    { id: "entertainment", name: "Entertainment", icon: "🎬" },
    { id: "other", name: "Other", icon: "📝" },
  ];

  useEffect(() => {
    if (editingExpense) {
      setName(editingExpense.name);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setDate(new Date(editingExpense.date));
    }
  }, [editingExpense]);

  useEffect(() => {
    checkBudgetWarning();
  }, [amount, category]);

  const checkBudgetWarning = async () => {
    if (!amount || !user) return;

    try {
      // Get budget settings
      const budgetDoc = await getDoc(doc(db, `users/${user.uid}/settings`, 'budgets'));
      if (!budgetDoc.exists()) return;

      const budgets = budgetDoc.data();
      const categoryBudget = budgets[category];
      if (!categoryBudget) return;

      // Get current month's expenses for this category
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const expensesRef = collection(db, `users/${user.uid}/expenses`);
      const q = query(
        expensesRef,
        where('category', '==', category),
        where('date', '>=', startOfMonth)
      );

      const expensesSnapshot = await getDocs(q);
      let currentTotal = 0;

      expensesSnapshot.forEach((doc) => {
        const expenseData = doc.data();
        // Skip the current expense if we're editing
        if (!editingExpense || doc.id !== editingExpense.id) {
          currentTotal += expenseData.amount || 0;
        }
      });

      const newTotal = currentTotal + parseFloat(amount);
      if (newTotal > categoryBudget) {
        setBudgetWarning({
          budget: categoryBudget,
          projected: newTotal,
          overage: newTotal - categoryBudget
        });
      } else {
        setBudgetWarning(null);
      }
    } catch (error) {
      console.error('Error checking budget:', error);
      // Don't show toast here as it's not a critical error for the user
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingExpense) {
        await updateDoc(doc(db, `users/${user.uid}/expenses`, editingExpense.id), {
          name,
          amount: parseFloat(amount),
          category,
          date,
          updatedAt: new Date(),
        });
        toast.success("Expense updated successfully!");
      } else {
        await addDoc(collection(db, `users/${user.uid}/expenses`), {
          name,
          amount: parseFloat(amount),
          category,
          date,
          createdAt: new Date(),
        });
        toast.success("Expense added successfully!");
      }
      navigate("/expenses");
    } catch (error) {
      toast.error(editingExpense ? "Failed to update expense" : "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  // Rest of the component remains the same...

  return (
    <div className="container mx-auto max-w-md py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {editingExpense ? 'Edit Expense' : 'New Expense'}
          </CardTitle>
          <CardDescription>
            {editingExpense ? 'Update your expense details' : 'Track your spending by adding a new expense'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Expense Name</Label>
              <Input 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Groceries" 
                className="h-12" 
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    type="button"
                    variant={category === cat.id ? "default" : "outline"}
                    className="h-12 justify-start space-x-2"
                    onClick={() => setCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-12"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input 
                  id="amount" 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" 
                  className="pl-8 h-12" 
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {budgetWarning && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  This expense will exceed your monthly budget for {categories.find(c => c.id === category)?.name} by ₹{budgetWarning.overage.toFixed(2)}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12"
                onClick={() => navigate("/expenses")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="w-full h-12"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                ) : (
                  <>
                    {editingExpense ? (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Update Expense
                      </>
                    ) : (
                      <>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Add Expense
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddExpense;