"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getGroupById, getUserDetails, addGroupExpense } from "../firebase/groupUtils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { format } from "date-fns"
import { ArrowLeft, CalendarIcon, ReceiptIndianRupee, DollarSign, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const SplitMemberRow = ({ member, amount, onAmountChange, disabled = false }) => {
  return (
    <div className="flex items-center justify-between space-x-4 py-2">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.photoURL} />
          <AvatarFallback>{member.displayName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{member.displayName}</p>
          <p className="text-xs text-muted-foreground">{member.email}</p>
        </div>
      </div>
      <div className="relative w-24">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
        <Input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(member.id, e.target.value)}
          className="pl-8"
          min="0"
          step="0.01"
          disabled={disabled}
        />
      </div>
    </div>
  )
}

const AddGroupExpense = ({ user }) => {
  const { groupId } = useParams()
  const navigate = useNavigate()

  const [groupData, setGroupData] = useState(null)
  const [members, setMembers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("other")
  const [date, setDate] = useState(new Date())
  const [paidBy, setPaidBy] = useState("")
  const [splitType, setSplitType] = useState("equal")
  const [splits, setSplits] = useState({})

  const categories = [
    { id: "food", name: "Food", icon: "🍽️" },
    { id: "transport", name: "Transport", icon: "🚗" },
    { id: "entertainment", name: "Entertainment", icon: "🎬" },
    { id: "shopping", name: "Shopping", icon: "🛍️" },
    { id: "utilities", name: "Utilities", icon: "💡" },
    { id: "rent", name: "Rent", icon: "🏠" },
    { id: "other", name: "Other", icon: "📝" },
  ]

  useEffect(() => {
    if (!user?.uid || !groupId) return

    const fetchGroupData = async () => {
      try {
        // Fetch group details
        const group = await getGroupById(groupId)
        setGroupData(group)

        // Fetch user details for all members
        const userDetails = await getUserDetails(group.members)
        setMembers(userDetails)

        // Set default paidBy to current user
        setPaidBy(user.uid)

        // Initialize splits with all members
        const initialSplits = {}
        group.members.forEach((memberId) => {
          initialSplits[memberId] = 0
        })
        setSplits(initialSplits)
      } catch (error) {
        console.error("Error fetching group data:", error)
        toast.error("Failed to load group data")
        navigate(`/groups/${groupId}`)
      } finally {
        setLoading(false)
      }
    }

    fetchGroupData()
  }, [groupId, user?.uid, navigate])

  // Update splits when amount, splitType, or paidBy changes
  useEffect(() => {
    if (!groupData || !amount) return

    const totalAmount = Number.parseFloat(amount) || 0
    const newSplits = { ...splits }

    if (splitType === "equal") {
      // Equal split among all members
      const memberCount = groupData.members.length
      const amountPerPerson = totalAmount / memberCount

      groupData.members.forEach((memberId) => {
        newSplits[memberId] = Number.parseFloat(amountPerPerson.toFixed(2))
      })
    } else if (splitType === "paidBy") {
      // Paid by one person, split among others
      const otherMembers = groupData.members.filter((id) => id !== paidBy)
      const amountPerPerson = totalAmount / otherMembers.length

      groupData.members.forEach((memberId) => {
        newSplits[memberId] = memberId === paidBy ? 0 : Number.parseFloat(amountPerPerson.toFixed(2))
      })
    }

    setSplits(newSplits)
  }, [amount, splitType, paidBy, groupData])

  const validateSplits = () => {
    const totalAmount = Number.parseFloat(amount) || 0
    const splitSum = Object.values(splits).reduce((sum, val) => sum + (Number.parseFloat(val) || 0), 0)

    // Allow for small floating point differences
    return Math.abs(totalAmount - splitSum) < 0.01
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!description.trim()) {
      toast.error("Description is required")
      return
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }

    if (!validateSplits()) {
      toast.error("The sum of splits must equal the total amount")
      return
    }

    setSubmitting(true)

    try {
      await addGroupExpense(groupId, {
        description: description.trim(),
        amount: Number.parseFloat(amount),
        category,
        date,
        paidBy,
        splitType,
        splits,
      })

      toast.success("Expense added successfully")
      navigate(`/groups/${groupId}`)
    } catch (error) {
      console.error("Error adding expense:", error)
      toast.error("Failed to add expense")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSplitAmountChange = (memberId, value) => {
    const newSplits = { ...splits }
    newSplits[memberId] = Number.parseFloat(value) || 0
    setSplits(newSplits)
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-md py-8 px-4">
        <Skeleton className="h-10 w-20 mb-6" /> {/* Back button */}
        <Skeleton className="h-[800px] w-full rounded-lg" />
      </div>
    )
  }

  // Calculate total of current splits
  const splitSum = Object.values(splits).reduce((sum, val) => sum + (Number.parseFloat(val) || 0), 0)
  const totalAmount = Number.parseFloat(amount) || 0
  const difference = totalAmount - splitSum

  return (
    <div className="container mx-auto max-w-md py-8 px-4">
      <Button variant="outline" className="mb-6" onClick={() => navigate(`/groups/${groupId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Group
      </Button>

      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl flex items-center gap-2">
            <ReceiptIndianRupee className="h-6 w-6" />
            Add Group Expense
          </CardTitle>
          <CardDescription>Add an expense to {groupData?.name} and split it among members</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Dinner at Restaurant"
                className="h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount</Label>
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

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center">
                        <span className="mr-2">{cat.icon}</span>
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-12">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Paid By</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(members).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={member.photoURL} />
                          <AvatarFallback>{member.displayName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <span>
                          {member.displayName} {member.id === user.uid ? "(You)" : ""}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Split Type</Label>
              <RadioGroup value={splitType} onValueChange={setSplitType} className="grid grid-cols-3 gap-4">
                <Label
                  htmlFor="equal"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                    splitType === "equal" ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  <RadioGroupItem value="equal" id="equal" className="sr-only" />
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-center text-sm">Equal</span>
                </Label>
                <Label
                  htmlFor="paidBy"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                    splitType === "paidBy" ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  <RadioGroupItem value="paidBy" id="paidBy" className="sr-only" />
                  <DollarSign className="h-6 w-6 mb-2" />
                  <span className="text-center text-sm">Paid by one</span>
                </Label>
                <Label
                  htmlFor="custom"
                  className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                    splitType === "custom" ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  <RadioGroupItem value="custom" id="custom" className="sr-only" />
                  <ReceiptIndianRupee className="h-6 w-6 mb-2" />
                  <span className="text-center text-sm">Custom</span>
                </Label>
              </RadioGroup>
            </div>

            {amount && (
              <div className="space-y-4 border rounded-md p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Split Details</h3>
                  {Math.abs(difference) > 0.01 && (
                    <p className="text-sm text-destructive">
                      {difference > 0
                        ? `₹${difference.toFixed(2)} remaining`
                        : `₹${Math.abs(difference).toFixed(2)} over`}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  {Object.entries(members).map(([memberId, member]) => (
                    <SplitMemberRow
                      key={memberId}
                      member={member}
                      amount={splits[memberId] || 0}
                      onAmountChange={handleSplitAmountChange}
                      disabled={splitType !== "custom"}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12"
                onClick={() => navigate(`/groups/${groupId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full h-12" disabled={submitting || !validateSplits()}>
                {submitting ? <Skeleton className="h-5 w-5 rounded-full" /> : "Add Expense"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AddGroupExpense
