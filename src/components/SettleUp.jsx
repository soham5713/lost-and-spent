"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getGroupById, getGroupBalances, getUserDetails, recordSettlement } from "../firebase/groupUtils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { format } from "date-fns"
import { ArrowLeft, CalendarIcon, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const SettleUp = ({ user }) => {
  const { groupId } = useParams()
  const navigate = useNavigate()

  const [groupData, setGroupData] = useState(null)
  const [balances, setBalances] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedBalance, setSelectedBalance] = useState(null)
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date())
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!user?.uid || !groupId) return

    const fetchData = async () => {
      try {
        // Fetch group details
        const group = await getGroupById(groupId)
        setGroupData(group)

        // Fetch balances
        const groupBalances = await getGroupBalances(groupId)

        // Filter balances relevant to current user
        const userBalances = groupBalances.filter((balance) => balance.from === user.uid || balance.to === user.uid)

        setBalances(userBalances)

        // Fetch user details
        const memberIds = new Set([...userBalances.map((b) => b.from), ...userBalances.map((b) => b.to)])

        const userDetails = await getUserDetails(Array.from(memberIds))
        setUsers(userDetails)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load data")
        navigate(`/groups/${groupId}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [groupId, user?.uid, navigate])

  useEffect(() => {
    if (selectedBalance) {
      setAmount(selectedBalance.amount.toString())
    } else {
      setAmount("")
    }
  }, [selectedBalance])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedBalance) {
      toast.error("Please select a balance to settle")
      return
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than zero")
      return
    }

    if (Number.parseFloat(amount) > selectedBalance.amount) {
      toast.error("Settlement amount cannot exceed the balance")
      return
    }

    setSubmitting(true)

    try {
      await recordSettlement(groupId, {
        from: selectedBalance.from,
        to: selectedBalance.to,
        amount: Number.parseFloat(amount),
        date,
        notes,
      })

      toast.success("Payment recorded successfully")
      navigate(`/groups/${groupId}`)
    } catch (error) {
      console.error("Error recording settlement:", error)
      toast.error("Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-md py-8 px-4">
        <Skeleton className="h-10 w-20 mb-6" /> {/* Back button */}
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    )
  }

  // Separate balances where user owes vs. is owed
  const userOwes = balances.filter((b) => b.from === user.uid)
  const userIsOwed = balances.filter((b) => b.to === user.uid)

  return (
    <div className="container mx-auto max-w-md py-8 px-4">
      <Button variant="outline" className="mb-6" onClick={() => navigate(`/groups/${groupId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Group
      </Button>

      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Settle Up
          </CardTitle>
          <CardDescription>Record a payment to settle balances in {groupData?.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <div className="text-center py-6">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No balances to settle</h3>
              <p className="text-muted-foreground mb-6">You're all settled up in this group!</p>
              <Button onClick={() => navigate(`/groups/${groupId}`)}>Back to Group</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Select Balance to Settle</Label>
                <div className="space-y-4">
                  {userOwes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 text-blue-500 flex items-center">
                        <ArrowUpRight className="mr-1 h-4 w-4" />
                        You owe
                      </h3>
                      {userOwes.map((balance) => {
                        const otherUser = users[balance.to]

                        return (
                          <div
                            key={balance.id}
                            className={`p-3 rounded-md border-2 cursor-pointer mb-2 ${
                              selectedBalance?.id === balance.id
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-muted hover:border-blue-500/50"
                            }`}
                            onClick={() => setSelectedBalance(balance)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarImage src={otherUser?.photoURL} />
                                  <AvatarFallback>{otherUser?.displayName?.charAt(0) || "U"}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">You owe {otherUser?.displayName}</p>
                                </div>
                              </div>
                              <span className="font-semibold text-blue-500">
                                ₹{balance.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {userIsOwed.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 text-green-500 flex items-center">
                        <ArrowDownRight className="mr-1 h-4 w-4" />
                        You are owed
                      </h3>
                      {userIsOwed.map((balance) => {
                        const otherUser = users[balance.from]

                        return (
                          <div
                            key={balance.id}
                            className={`p-3 rounded-md border-2 cursor-pointer mb-2 ${
                              selectedBalance?.id === balance.id
                                ? "border-green-500 bg-green-500/10"
                                : "border-muted hover:border-green-500/50"
                            }`}
                            onClick={() => setSelectedBalance(balance)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarImage src={otherUser?.photoURL} />
                                  <AvatarFallback>{otherUser?.displayName?.charAt(0) || "U"}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{otherUser?.displayName} owes you</p>
                                </div>
                              </div>
                              <span className="font-semibold text-green-500">
                                ₹{balance.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selectedBalance && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Settlement Amount</Label>
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
                        max={selectedBalance.amount}
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum: ₹{selectedBalance.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </p>
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
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Cash payment, bank transfer"
                      className="min-h-[80px]"
                    />
                  </div>
                </>
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
                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={
                    submitting ||
                    !selectedBalance ||
                    !amount ||
                    Number.parseFloat(amount) <= 0 ||
                    Number.parseFloat(amount) > selectedBalance.amount
                  }
                >
                  {submitting ? <Skeleton className="h-5 w-5 rounded-full" /> : "Record Payment"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SettleUp
