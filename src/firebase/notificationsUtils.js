// notificationUtils.js
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export const createNotification = async (userId, notification) => {
  try {
    const notificationData = {
      ...notification,
      createdAt: new Date(),
      read: false,
    };
    
    await addDoc(collection(db, `users/${userId}/notifications`), notificationData);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const checkBudgetAndNotify = async (userId, category, spent, budget) => {
  const percentage = (spent / budget) * 100;
  
  if (percentage >= 90 && percentage < 100) {
    await createNotification(userId, {
      type: 'budget_warning',
      title: 'Budget Alert',
      message: `You've used ${percentage.toFixed(1)}% of your ${category} budget. Consider reducing spending in this category.`,
    });
  } else if (percentage >= 100) {
    await createNotification(userId, {
      type: 'budget_exceeded',
      title: 'Budget Exceeded',
      message: `You've exceeded your ${category} budget by ${(spent - budget).toLocaleString('en-IN', { 
        style: 'currency', 
        currency: 'INR' 
      })}`,
    });
  }
};

export const notifyLargeExpense = async (userId, expense) => {
  // Notify for expenses over ₹5000
  if (expense.amount >= 5000) {
    await createNotification(userId, {
      type: 'expense_reminder',
      title: 'Large Expense Added',
      message: `A large expense of ₹${expense.amount.toLocaleString('en-IN')} was added in ${expense.category}.`,
    });
  }
};

export const createWeeklySpendingReminder = async (userId, totalSpent) => {
  await createNotification(userId, {
    type: 'expense_reminder',
    title: 'Weekly Spending Summary',
    message: `You've spent ₹${totalSpent.toLocaleString('en-IN')} this week.`,
  });
};