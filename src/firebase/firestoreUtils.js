// src/firebase/firestoreUtils.js
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase.js"; // Ensure you import the initialized Firebase app

// Function to add an expense
export async function addExpense(expense) {
  try {
    const docRef = await addDoc(collection(db, "expenses"), expense);
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

// Function to fetch all expenses
export async function getExpenses() {
  const querySnapshot = await getDocs(collection(db, "expenses"));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Function to update an expense
export async function updateExpense(id, updatedExpense) {
  const expenseRef = doc(db, "expenses", id);
  await updateDoc(expenseRef, updatedExpense);
}

// Function to delete an expense
export async function deleteExpense(id) {
  await deleteDoc(doc(db, "expenses", id));
}
