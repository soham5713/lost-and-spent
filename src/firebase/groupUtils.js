import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch,
  runTransaction,
  orderBy,
} from "firebase/firestore"
import { db } from "./firebase"

// Create a new group
export const createGroup = async (userId, groupData) => {
  try {
    const groupRef = await addDoc(collection(db, "groups"), {
      name: groupData.name,
      description: groupData.description || "",
      members: [userId], // Creator is the first member
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Add this group to the user's groups collection
    await addDoc(collection(db, `users/${userId}/userGroups`), {
      groupId: groupRef.id,
      role: "admin", // Creator is admin
      joinedAt: serverTimestamp(),
    })

    return groupRef.id
  } catch (error) {
    console.error("Error creating group:", error)
    throw error
  }
}

// Get all groups a user belongs to
export const getUserGroups = async (userId) => {
  try {
    const userGroupsRef = collection(db, `users/${userId}/userGroups`)
    const userGroupsSnapshot = await getDocs(userGroupsRef)

    const groupIds = userGroupsSnapshot.docs.map((doc) => ({
      userGroupId: doc.id,
      ...doc.data(),
    }))

    const groups = []

    for (const groupData of groupIds) {
      const groupDoc = await getDoc(doc(db, "groups", groupData.groupId))
      if (groupDoc.exists()) {
        groups.push({
          id: groupDoc.id,
          ...groupDoc.data(),
          role: groupData.role,
          userGroupId: groupData.userGroupId,
        })
      }
    }

    return groups
  } catch (error) {
    console.error("Error getting user groups:", error)
    throw error
  }
}

// Get a single group by ID
export const getGroupById = async (groupId) => {
  try {
    const groupDoc = await getDoc(doc(db, "groups", groupId))
    if (!groupDoc.exists()) {
      throw new Error("Group not found")
    }
    return { id: groupDoc.id, ...groupDoc.data() }
  } catch (error) {
    console.error("Error getting group:", error)
    throw error
  }
}

// Add a member to a group
export const addGroupMember = async (groupId, userId, memberEmail) => {
  try {
    // First, find the user by email
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", memberEmail))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error("User not found with this email")
    }

    const memberDoc = querySnapshot.docs[0]
    const memberId = memberDoc.id

    // Check if user is already a member
    const groupDoc = await getDoc(doc(db, "groups", groupId))
    if (!groupDoc.exists()) {
      throw new Error("Group not found")
    }

    const groupData = groupDoc.data()
    if (groupData.members.includes(memberId)) {
      throw new Error("User is already a member of this group")
    }

    // Add member to group
    await updateDoc(doc(db, "groups", groupId), {
      members: arrayUnion(memberId),
      updatedAt: serverTimestamp(),
    })

    // Add group to user's groups
    await addDoc(collection(db, `users/${memberId}/userGroups`), {
      groupId: groupId,
      role: "member",
      joinedAt: serverTimestamp(),
    })

    return memberId
  } catch (error) {
    console.error("Error adding group member:", error)
    throw error
  }
}

// Remove a member from a group
export const removeGroupMember = async (groupId, userId, memberId) => {
  try {
    // Check if user has permission (is admin or removing self)
    const userGroupsRef = collection(db, `users/${userId}/userGroups`)
    const q = query(userGroupsRef, where("groupId", "==", groupId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error("User is not a member of this group")
    }

    const userGroupDoc = querySnapshot.docs[0]
    const userRole = userGroupDoc.data().role

    if (userRole !== "admin" && userId !== memberId) {
      throw new Error("You don't have permission to remove this member")
    }

    // Remove member from group
    await updateDoc(doc(db, "groups", groupId), {
      members: arrayRemove(memberId),
      updatedAt: serverTimestamp(),
    })

    // Remove group from user's groups
    const memberGroupsRef = collection(db, `users/${memberId}/userGroups`)
    const memberGroupsQuery = query(memberGroupsRef, where("groupId", "==", groupId))
    const memberGroupsSnapshot = await getDocs(memberGroupsQuery)

    if (!memberGroupsSnapshot.empty) {
      await deleteDoc(memberGroupsSnapshot.docs[0].ref)
    }

    return true
  } catch (error) {
    console.error("Error removing group member:", error)
    throw error
  }
}

// Delete a group and all its data
export const deleteGroup = async (groupId, userId) => {
  try {
    // Check if user is the admin
    const groupDoc = await getDoc(doc(db, "groups", groupId))
    if (!groupDoc.exists()) {
      throw new Error("Group not found")
    }

    const groupData = groupDoc.data()
    if (groupData.createdBy !== userId) {
      throw new Error("Only the group admin can delete the group")
    }

    // Use a batch to delete all related data
    const batch = writeBatch(db)

    // 1. Delete all expenses
    const expensesRef = collection(db, `groups/${groupId}/expenses`)
    const expensesSnapshot = await getDocs(expensesRef)
    expensesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // 2. Delete all balances
    const balancesRef = collection(db, `groups/${groupId}/balances`)
    const balancesSnapshot = await getDocs(balancesRef)
    balancesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // 3. Delete all settlements
    const settlementsRef = collection(db, `groups/${groupId}/settlements`)
    const settlementsSnapshot = await getDocs(settlementsRef)
    settlementsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // 4. Remove group from all members' userGroups collections
    for (const memberId of groupData.members) {
      const userGroupsRef = collection(db, `users/${memberId}/userGroups`)
      const userGroupsQuery = query(userGroupsRef, where("groupId", "==", groupId))
      const userGroupsSnapshot = await getDocs(userGroupsQuery)

      userGroupsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
    }

    // 5. Delete the group document itself
    batch.delete(doc(db, "groups", groupId))

    // Commit the batch
    await batch.commit()

    return true
  } catch (error) {
    console.error("Error deleting group:", error)
    throw error
  }
}

// Add an expense to a group
export const addGroupExpense = async (groupId, expenseData) => {
  try {
    const batch = writeBatch(db)

    // Add the expense
    const expenseRef = doc(collection(db, `groups/${groupId}/expenses`))
    batch.set(expenseRef, {
      description: expenseData.description,
      amount: Number(expenseData.amount),
      category: expenseData.category || "other",
      date: expenseData.date,
      paidBy: expenseData.paidBy,
      splitType: expenseData.splitType || "equal",
      splits: expenseData.splits,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Update balances
    const splits = expenseData.splits
    const paidBy = expenseData.paidBy

    // Get existing balances
    const balancesRef = collection(db, `groups/${groupId}/balances`)
    const balancesSnapshot = await getDocs(balancesRef)
    const balances = {}

    balancesSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const key = `${data.from}_${data.to}`
      balances[key] = {
        id: doc.id,
        ...data,
      }
    })

    // Calculate new balances
    for (const [userId, amount] of Object.entries(splits)) {
      if (userId === paidBy) continue // Skip if user paid for themselves

      const fromUser = userId
      const toUser = paidBy

      // Check if there's an existing balance in the opposite direction
      const oppositeKey = `${toUser}_${fromUser}`
      if (balances[oppositeKey]) {
        const oppositeBalance = balances[oppositeKey]
        if (oppositeBalance.amount > amount) {
          // Reduce the opposite balance
          batch.update(doc(db, `groups/${groupId}/balances`, oppositeBalance.id), {
            amount: oppositeBalance.amount - amount,
            updatedAt: serverTimestamp(),
          })
        } else if (oppositeBalance.amount < amount) {
          // Delete the opposite balance and create a new one in the other direction
          batch.delete(doc(db, `groups/${groupId}/balances`, oppositeBalance.id))

          const newBalanceRef = doc(collection(db, `groups/${groupId}/balances`))
          batch.set(newBalanceRef, {
            from: fromUser,
            to: toUser,
            amount: amount - oppositeBalance.amount,
            updatedAt: serverTimestamp(),
          })
        } else {
          // Balances are equal, just delete the opposite balance
          batch.delete(doc(db, `groups/${groupId}/balances`, oppositeBalance.id))
        }
      } else {
        // Check if there's an existing balance in this direction
        const key = `${fromUser}_${toUser}`
        if (balances[key]) {
          // Update existing balance
          batch.update(doc(db, `groups/${groupId}/balances`, balances[key].id), {
            amount: balances[key].amount + amount,
            updatedAt: serverTimestamp(),
          })
        } else {
          // Create new balance
          const newBalanceRef = doc(collection(db, `groups/${groupId}/balances`))
          batch.set(newBalanceRef, {
            from: fromUser,
            to: toUser,
            amount: amount,
            updatedAt: serverTimestamp(),
          })
        }
      }
    }

    await batch.commit()
    return expenseRef.id
  } catch (error) {
    console.error("Error adding group expense:", error)
    throw error
  }
}

// Get all expenses for a group
export const getGroupExpenses = async (groupId) => {
  try {
    const expensesRef = collection(db, `groups/${groupId}/expenses`)
    const q = query(expensesRef, orderBy("createdAt", "desc"))
    const expensesSnapshot = await getDocs(q)

    return expensesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting group expenses:", error)
    throw error
  }
}

// Get all balances for a group
export const getGroupBalances = async (groupId) => {
  try {
    const balancesRef = collection(db, `groups/${groupId}/balances`)
    const balancesSnapshot = await getDocs(balancesRef)

    return balancesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting group balances:", error)
    throw error
  }
}

// Record a settlement between users
export const recordSettlement = async (groupId, settlementData) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get the balance document
      const balancesRef = collection(db, `groups/${groupId}/balances`)
      const q = query(balancesRef, where("from", "==", settlementData.from), where("to", "==", settlementData.to))

      const balancesSnapshot = await getDocs(q)

      if (balancesSnapshot.empty) {
        throw new Error("No balance found between these users")
      }

      const balanceDoc = balancesSnapshot.docs[0]
      const balance = balanceDoc.data()

      if (balance.amount < settlementData.amount) {
        throw new Error("Settlement amount exceeds balance")
      }

      // Add settlement record
      const settlementRef = doc(collection(db, `groups/${groupId}/settlements`))
      transaction.set(settlementRef, {
        from: settlementData.from,
        to: settlementData.to,
        amount: settlementData.amount,
        date: settlementData.date || new Date(),
        notes: settlementData.notes || "",
        status: "completed",
        createdAt: serverTimestamp(),
      })

      // Update balance
      if (balance.amount === settlementData.amount) {
        // Delete balance if fully settled
        transaction.delete(balanceDoc.ref)
      } else {
        // Reduce balance
        transaction.update(balanceDoc.ref, {
          amount: balance.amount - settlementData.amount,
          updatedAt: serverTimestamp(),
        })
      }

      return settlementRef.id
    })
  } catch (error) {
    console.error("Error recording settlement:", error)
    throw error
  }
}

// Get all settlements for a group
export const getGroupSettlements = async (groupId) => {
  try {
    const settlementsRef = collection(db, `groups/${groupId}/settlements`)
    const q = query(settlementsRef, orderBy("createdAt", "desc"))
    const settlementsSnapshot = await getDocs(q)

    return settlementsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting group settlements:", error)
    throw error
  }
}

// Calculate simplified debts (who should pay whom)
export const calculateSimplifiedDebts = async (groupId) => {
  try {
    const balances = await getGroupBalances(groupId)

    // Create a net balance for each user
    const netBalances = {}

    balances.forEach((balance) => {
      if (!netBalances[balance.from]) netBalances[balance.from] = 0
      if (!netBalances[balance.to]) netBalances[balance.to] = 0

      netBalances[balance.from] -= balance.amount
      netBalances[balance.to] += balance.amount
    })

    // Separate users who owe money from users who are owed money
    const debtors = []
    const creditors = []

    for (const [userId, amount] of Object.entries(netBalances)) {
      if (amount < 0) {
        debtors.push({ userId, amount: -amount })
      } else if (amount > 0) {
        creditors.push({ userId, amount })
      }
    }

    // Sort by amount (descending)
    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    // Calculate simplified transactions
    const transactions = []

    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0]
      const creditor = creditors[0]

      const amount = Math.min(debtor.amount, creditor.amount)

      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount,
      })

      debtor.amount -= amount
      creditor.amount -= amount

      if (debtor.amount < 0.01) debtors.shift()
      if (creditor.amount < 0.01) creditors.shift()
    }

    return transactions
  } catch (error) {
    console.error("Error calculating simplified debts:", error)
    throw error
  }
}

// Get user details for a list of user IDs
export const getUserDetails = async (userIds) => {
  try {
    const users = {}

    for (const userId of userIds) {
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        users[userId] = {
          id: userId,
          ...userDoc.data(),
        }
      }
    }

    return users
  } catch (error) {
    console.error("Error getting user details:", error)
    throw error
  }
}
