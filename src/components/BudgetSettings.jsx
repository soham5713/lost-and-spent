import React, { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BudgetSettings = ({ user }) => {
    const [budgets, setBudgets] = useState({});
    const [initialBudgets, setInitialBudgets] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [totalBudget, setTotalBudget] = useState(0);
    const [isDirty, setIsDirty] = useState(false);
    const [showExitPrompt, setShowExitPrompt] = useState(false);

    const categories = [
        { id: "groceries", name: "Groceries", icon: "🛒", recommended: 30 },
        { id: "transport", name: "Transport", icon: "🚗", recommended: 15 },
        { id: "utilities", name: "Utilities", icon: "💡", recommended: 25 },
        { id: "entertainment", name: "Entertainment", icon: "🎬", recommended: 10 },
        { id: "other", name: "Other", icon: "📝", recommended: 20 }
    ];

    const fetchBudgets = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, `users/${user.uid}/settings`, 'budgets');
            const docSnap = await getDoc(docRef);
            const fetchedBudgets = docSnap.exists()
                ? docSnap.data()
                : categories.reduce((acc, category) => ({ ...acc, [category.id]: 0 }), {});

            setBudgets(fetchedBudgets);
            setInitialBudgets(fetchedBudgets);
        } catch (error) {
            toast.error("Failed to fetch budgets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudgets();
    }, [user.uid]);

    useEffect(() => {
        const total = Object.values(budgets).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
        if (total !== totalBudget) {
            setTotalBudget(total);
        }

        const hasChanges = Object.entries(budgets).some(([key, value]) => {
            const initialValue = initialBudgets[key] || 0;
            const currentValue = parseFloat(value) || 0;
            return Math.abs(initialValue - currentValue) > 0.001; // Float comparison
        });
        setIsDirty(hasChanges);
    }, [budgets, initialBudgets, totalBudget]);


    // Add beforeunload event listener
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const validateBudget = (value, categoryId) => {
        const errors = {};
        const amount = parseFloat(value);
        if (!/^\d*(\.\d{1,2})?$/.test(value)) {
            errors.invalid = "Please enter a valid amount (up to 2 decimal places)";
        } else if (amount < 0) {
            errors.negative = "Budget cannot be negative";
        }
        return errors;
    };

    const validateAllBudgets = () => {
        const newErrors = {};
        let hasErrors = false;

        for (const [category, value] of Object.entries(budgets)) {
            const categoryErrors = validateBudget(value, category);
            if (Object.keys(categoryErrors).length > 0) {
                newErrors[category] = categoryErrors;
                hasErrors = true;
            }
        }

        setErrors(newErrors);
        return !hasErrors;
    };

    const handleBudgetChange = (category, value) => {
        // Only allow numbers and decimal point
        const newValue = value.replace(/[^\d.]/g, '');

        // Prevent multiple decimal points
        if (newValue.split('.').length > 2) return;

        // Limit decimal places to 2
        if (newValue.includes('.') && newValue.split('.')[1].length > 2) return;

        setBudgets(prev => ({
            ...prev,
            [category]: newValue
        }));

        setTouched(prev => ({
            ...prev,
            [category]: true
        }));

        const validationErrors = validateBudget(newValue, category);
        setErrors(prev => ({
            ...prev,
            [category]: validationErrors
        }));
    };

    const handleSaveBudgets = async () => {
        if (!validateAllBudgets()) {
            toast.error("Please fix the errors before saving");
            return;
        }

        setSaving(true);
        try {
            const processedBudgets = Object.entries(budgets).reduce((acc, [key, value]) => {
                const numValue = parseFloat(value) || 0;
                acc[key] = numValue;
                return acc;
            }, {});

            await setDoc(doc(db, `users/${user.uid}/settings`, 'budgets'), processedBudgets);
            setInitialBudgets(processedBudgets);
            setTouched({});
            setIsDirty(false);
            toast.success("Budgets saved successfully");
        } catch (error) {
            toast.error("Failed to save budgets");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setBudgets(initialBudgets);
        setTouched({});
        setErrors({});
        setIsDirty(false);
        setShowExitPrompt(false);
    };

    if (loading) {
        return (
            <div className="container mx-auto max-w-2xl py-8 px-4">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {Array(5).fill(null).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ))}
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="container mx-auto max-w-2xl py-8 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Budget Settings</CardTitle>
                        <CardDescription>Set your monthly budget limits for each category</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="p-4 bg-primary/10 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold">Total Monthly Budget</span>
                                    <span className="text-xl font-bold">₹{totalBudget.toFixed(2)}</span>
                                </div>
                                <Progress value={100} className="h-2" />
                            </div>

                            {categories.map((category) => (
                                <div key={category.id} className="space-y-2">
                                    <Label className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span>{category.icon}</span>
                                            <span>{category.name}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            Recommended: {category.recommended}%
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                        <Input
                                            type="text"
                                            value={budgets[category.id] || ""}
                                            onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                                            className={`pl-8 ${touched[category.id] && errors[category.id] ? "border-red-500" : ""
                                                }`}
                                            placeholder="Enter monthly budget"
                                        />
                                    </div>
                                    {touched[category.id] && errors[category.id] && Object.entries(errors[category.id]).map(([key, error]) => (
                                        <Alert key={key} variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    ))}
                                    {budgets[category.id] && !errors[category.id] && (
                                        <div className="text-sm text-muted-foreground">
                                            {((parseFloat(budgets[category.id]) / totalBudget) * 100 || 0).toFixed(1)}% of total budget
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div className="flex space-x-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowExitPrompt(true)}
                                    disabled={saving || !isDirty}
                                    className="w-full"
                                >
                                    Reset
                                </Button>
                                <Button
                                    onClick={handleSaveBudgets}
                                    className="w-full"
                                    disabled={saving || Object.keys(errors).length > 0 || !isDirty}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Budgets
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showExitPrompt} onOpenChange={setShowExitPrompt}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Changes</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reset all changes? This will restore your previously saved budgets.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExitPrompt(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReset}
                        >
                            Reset Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default BudgetSettings;