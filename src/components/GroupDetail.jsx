"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  getGroupById,
  getGroupExpenses,
  getGroupBalances,
  getUserDetails,
  calculateSimplifiedDebts,
  addGroupMember,
  removeGroupMember,
  deleteGroup,
} from "../firebase/groupUtils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  PlusCircle,
  ArrowLeft,
  Receipt,
  UserPlus,
  UserMinus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  ArrowRight,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

const ExpenseCard = ({ expense, users, currentUser }) => {
  const paidByUser = users[expense.paidBy]
  const paidByName = paidByUser?.displayName || "Unknown User"
  const isCurrentUserPayer = expense.paidBy === currentUser.uid
  const formattedDate = expense.date?.toDate ? format(expense.date.toDate(), "MMM d, yyyy") : "Unknown date"

  // Calculate what current user owes or is owed
  const currentUserSplit = expense.splits[currentUser.uid] || 0
  const isPayer = expense.paidBy === currentUser.uid
  const isInvolved = isPayer || currentUserSplit > 0

  let statusText = ""
  let statusColor = ""

  if (isPayer && Object.keys(expense.splits).length > 1) {
    statusText = "You paid"
    statusColor = "text-green-500"
  } else if (currentUserSplit > 0) {
    statusText = "You owe"
    statusColor = "text-blue-500"
  } else if (!isInvolved) {
    statusText = "Not involved"
    statusColor = "text-gray-500"
  }

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center sm:space-x-4 min-w-0">
            <div className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="space-y-1 min-w-0 ml-4">
              <h3 className="text-base sm:text-lg font-semibold truncate max-w-[150px] sm:max-w-[200px] md:max-w-[400px]">
                {expense.description}
              </h3>
              <p className="text-sm text-muted-foreground">Paid by {isCurrentUserPayer ? "you" : paidByName}</p>
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="shrink-0 truncate max-w-[70px] sm:max-w-full">{formattedDate}</span>
                <Badge variant="outline" className="ml-1 text-xs shrink-0">
                  {expense.category}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1 ml-2 sm:ml-4 shrink-0">
            <span className="text-sm sm:text-xl font-semibold whitespace-nowrap">
              ₹{expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            {isInvolved && (
              <span className={`text-xs sm:text-sm font-medium ${statusColor}`}>
                {statusText}{" "}
                {currentUserSplit > 0
                  ? `₹${currentUserSplit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                  : ""}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const BalanceCard = ({ balance, users, currentUser }) => {
  const isDebtor = balance.from === currentUser.uid
  const isCreditor = balance.to === currentUser.uid

  if (!isDebtor && !isCreditor) return null

  const otherUserId = isDebtor ? balance.to : balance.from
  const otherUser = users[otherUserId]
  const otherUserName = otherUser?.displayName || "Unknown User"

  return (
    <Card
      className={`hover:shadow-md transition-all duration-200 ${isDebtor ? "border-blue-500/50" : "border-green-500/50"}`}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className={`h-12 w-12 rounded-full ${isDebtor ? "bg-blue-500/10" : "bg-green-500/10"} flex items-center justify-center`}
            >
              {isDebtor ? (
                <ArrowUpRight className="h-6 w-6 text-blue-500" />
              ) : (
                <ArrowDownRight className="h-6 w-6 text-green-500" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isDebtor ? `You owe ${otherUserName}` : `${otherUserName} owes you`}
              </h3>
              <p className="text-sm text-muted-foreground">{isDebtor ? "You need to pay" : "You will receive"}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xl font-semibold ${isDebtor ? "text-blue-500" : "text-green-500"}`}>
              ₹{balance.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const MembersList = ({ members, users, currentUser, groupData, onAddMember, onRemoveMember }) => {
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAddMember = async (e) => {
    e.preventDefault()

    if (!newMemberEmail.trim()) {
      toast.error("Email is required")
      return
    }

    setIsAddingMember(true)

    try {
      await onAddMember(newMemberEmail.trim())
      toast.success("Member added successfully")
      setIsDialogOpen(false)
      setNewMemberEmail("")
    } catch (error) {
      console.error("Error adding member:", error)
      toast.error(error.message || "Failed to add member")
    } finally {
      setIsAddingMember(false)
    }
  }

  const isCurrentUserAdmin = groupData.createdBy === currentUser.uid

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Members ({members.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddMember}>
              <DialogHeader>
                <DialogTitle>Add Group Member</DialogTitle>
                <DialogDescription>
                  Invite someone to join this group. They must have an account with this email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="friend@example.com"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingMember || !newMemberEmail.trim()}>
                  {isAddingMember ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                  ) : (
                    "Add Member"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {members.map((memberId) => {
          const member = users[memberId] || { displayName: "Unknown User" }
          const isCurrentUser = memberId === currentUser.uid
          const isAdmin = memberId === groupData.createdBy

          return (
            <div key={memberId} className="flex items-center justify-between p-3 rounded-md border">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={member.photoURL} />
                  <AvatarFallback>{member.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {member.displayName} {isCurrentUser && "(You)"}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <Badge variant="outline" className="bg-primary/10">
                    Admin
                  </Badge>
                )}
                {!isCurrentUser && isCurrentUserAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {member.displayName} from this group? This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onRemoveMember(memberId)}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const GroupDetail = ({ user }) => {
  const { groupId } = useParams()
  const navigate = useNavigate()

  const [groupData, setGroupData] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState([])
  const [simplifiedDebts, setSimplifiedDebts] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("expenses")

  useEffect(() => {
    if (!user?.uid || !groupId) return

    const fetchGroupData = async () => {
      try {
        // Fetch group details
        const group = await getGroupById(groupId)
        setGroupData(group)

        // Fetch expenses
        const groupExpenses = await getGroupExpenses(groupId)
        setExpenses(groupExpenses)

        // Fetch balances
        const groupBalances = await getGroupBalances(groupId)
        setBalances(groupBalances)

        // Calculate simplified debts
        const debts = await calculateSimplifiedDebts(groupId)
        setSimplifiedDebts(debts)

        // Fetch user details for all members
        const memberIds = new Set([
          ...group.members,
          ...groupExpenses.map((exp) => exp.paidBy),
          ...groupBalances.map((bal) => bal.from),
          ...groupBalances.map((bal) => bal.to),
          ...debts.map((debt) => debt.from),
          ...debts.map((debt) => debt.to),
        ])

        const userDetails = await getUserDetails(Array.from(memberIds))
        setUsers(userDetails)
      } catch (error) {
        console.error("Error fetching group data:", error)
        toast.error("Failed to load group data")
        navigate("/groups")
      } finally {
        setLoading(false)
      }
    }

    fetchGroupData()
  }, [groupId, user?.uid, navigate])

  const handleAddMember = async (email) => {
    try {
      await addGroupMember(groupId, user.uid, email)

      // Refresh group data
      const group = await getGroupById(groupId)
      setGroupData(group)

      // Fetch user details for new member
      const newMemberIds = group.members.filter((id) => !users[id])
      if (newMemberIds.length > 0) {
        const newUserDetails = await getUserDetails(newMemberIds)
        setUsers((prev) => ({ ...prev, ...newUserDetails }))
      }

      return true
    } catch (error) {
      console.error("Error adding member:", error)
      throw error
    }
  }

  const handleRemoveMember = async (memberId) => {
    try {
      await removeGroupMember(groupId, user.uid, memberId)

      // Refresh group data
      const group = await getGroupById(groupId)
      setGroupData(group)

      toast.success("Member removed successfully")
      return true
    } catch (error) {
      console.error("Error removing member:", error)
      toast.error(error.message || "Failed to remove member")
      return false
    }
  }

  const handleDeleteGroup = async () => {
    try {
      setLoading(true)
      await deleteGroup(groupId, user.uid)
      toast.success("Group deleted successfully")
      navigate("/groups")
    } catch (error) {
      console.error("Error deleting group:", error)
      toast.error(error.message || "Failed to delete group")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4 space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Group Summary Skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div>
          <Skeleton className="h-12 w-full mb-8" />
          <Skeleton className="h-[500px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!groupData) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <Button variant="outline" onClick={() => navigate("/groups")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Groups
        </Button>
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold">Group not found</h2>
          <p className="text-muted-foreground mt-2">This group may have been deleted or you don't have access to it.</p>
        </div>
      </div>
    )
  }

  // Calculate total group balance for current user
  const userBalanceOwed = balances.filter((b) => b.from === user.uid).reduce((sum, b) => sum + b.amount, 0)

  const userBalanceOwing = balances.filter((b) => b.to === user.uid).reduce((sum, b) => sum + b.amount, 0)

  const netBalance = userBalanceOwing - userBalanceOwed

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate("/groups")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold truncate">{groupData.name}</h1>
        </div>

        {groupData.createdBy === user.uid && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Group
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Group</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this group? This will permanently remove all expenses, balances, and
                  settlement records. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Group Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <h3 className="text-2xl font-bold">
                  ₹
                  {expenses
                    .reduce((sum, exp) => sum + exp.amount, 0)
                    .toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={netBalance >= 0 ? "bg-green-500/10" : "bg-blue-500/10"}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your Balance</p>
                <h3 className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-500" : "text-blue-500"}`}>
                  ₹{Math.abs(netBalance).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {netBalance > 0 ? "You are owed money" : netBalance < 0 ? "You owe money" : "You're all settled up"}
                </p>
              </div>
              <div
                className={`h-12 w-12 rounded-full ${netBalance >= 0 ? "bg-green-500/20" : "bg-blue-500/20"} flex items-center justify-center`}
              >
                {netBalance >= 0 ? (
                  <ArrowDownRight className="h-6 w-6 text-green-500" />
                ) : (
                  <ArrowUpRight className="h-6 w-6 text-blue-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Members</p>
                <h3 className="text-2xl font-bold">{groupData.members.length}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Expenses, Balances, and Members */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Group Expenses</h2>
            <Button onClick={() => navigate(`/groups/${groupId}/add-expense`)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <ScrollArea className="h-[500px] pr-4">
                {expenses.length > 0 ? (
                  <div className="space-y-4">
                    {expenses.map((expense) => (
                      <ExpenseCard key={expense.id} expense={expense} users={users} currentUser={user} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
                    <p className="text-muted-foreground mb-6">Add your first group expense to get started</p>
                    <Button onClick={() => navigate(`/groups/${groupId}/add-expense`)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Expense
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Balances</h2>
            <Button onClick={() => navigate(`/groups/${groupId}/settle`)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Settle Up
            </Button>
          </div>

          {balances.some((b) => b.from === user.uid || b.to === user.uid) ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Your Balances</h3>
              {balances
                .filter((b) => b.from === user.uid || b.to === user.uid)
                .map((balance) => (
                  <BalanceCard key={balance.id} balance={balance} users={users} currentUser={user} />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">You're all settled up!</h3>
                <p className="text-muted-foreground">You don't have any outstanding balances in this group.</p>
              </CardContent>
            </Card>
          )}

          {simplifiedDebts.length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-lg font-medium">Simplified Payments</h3>
              <p className="text-sm text-muted-foreground">
                These are the most efficient payments to settle all debts in the group.
              </p>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {simplifiedDebts.map((debt, index) => {
                      const fromUser = users[debt.from]
                      const toUser = users[debt.to]

                      return (
                        <div key={index} className="flex items-center justify-between p-3 rounded-md border">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={fromUser?.photoURL} />
                              <AvatarFallback>{fromUser?.displayName?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex items-center">
                              <span className="font-medium">
                                {debt.from === user.uid ? "You" : fromUser?.displayName || "Unknown"}
                              </span>
                              <ArrowRight className="mx-2 h-4 w-4" />
                              <span className="font-medium">
                                {debt.to === user.uid ? "You" : toUser?.displayName || "Unknown"}
                              </span>
                            </div>
                          </div>
                          <span className="font-semibold">
                            ₹{debt.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="p-6">
              <MembersList
                members={groupData.members}
                users={users}
                currentUser={user}
                groupData={groupData}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default GroupDetail
