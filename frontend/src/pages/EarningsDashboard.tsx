/**
 * Earnings Dashboard
 * Shows user's earnings, activities, and withdrawal options
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Activity, Wallet, Eye, ThumbsUp, MessageSquare, Share2, Users } from 'lucide-react';

interface EarningsStats {
  totalEarned: number;
  currentBalance: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  pendingWithdrawal: number;
}

interface ActivityBreakdown {
  watch: number;
  like: number;
  comment: number;
  share: number;
  invite: number;
  task: number;
  live: number;
  challenge: number;
}

interface EarningsHistory {
  date: string;
  earnings: number;
  activities: number;
}

export default function EarningsDashboard() {
  const [stats, setStats] = useState<EarningsStats>({
    totalEarned: 0,
    currentBalance: 0,
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    pendingWithdrawal: 0,
  });

  const [breakdown, setBreakdown] = useState<ActivityBreakdown>({
    watch: 0,
    like: 0,
    comment: 0,
    share: 0,
    invite: 0,
    task: 0,
    live: 0,
    challenge: 0,
  });

  const [history, setHistory] = useState<EarningsHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch earnings data
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      // Call tRPC endpoint to get earnings data
      // const data = await trpc.earnings.getStats.useQuery();
      // setStats(data);

      // Mock data for demo
      setStats({
        totalEarned: 245.5,
        currentBalance: 127.3,
        todayEarnings: 2.65,
        weekEarnings: 18.5,
        monthEarnings: 85.2,
        pendingWithdrawal: 50.0,
      });

      setBreakdown({
        watch: 45.2,
        like: 22.5,
        comment: 18.3,
        share: 15.8,
        invite: 80.0,
        task: 35.5,
        live: 20.2,
        challenge: 8.0,
      });

      setHistory([
        { date: 'Dec 10', earnings: 2.5, activities: 150 },
        { date: 'Dec 11', earnings: 3.2, activities: 180 },
        { date: 'Dec 12', earnings: 1.8, activities: 120 },
        { date: 'Dec 13', earnings: 2.65, activities: 165 },
      ]);
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">💰 Earnings Dashboard</h1>
          <p className="text-slate-400">Track your income and manage your withdrawals</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Current Balance */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">${stats.currentBalance.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Ready to withdraw</p>
            </CardContent>
          </Card>

          {/* Today's Earnings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Today's Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">${stats.todayEarnings.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Keep it up! 🎉</p>
            </CardContent>
          </Card>

          {/* Total Earned */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">${stats.totalEarned.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">All time</p>
            </CardContent>
          </Card>

          {/* Week Earnings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">${stats.weekEarnings.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          {/* Month Earnings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-400">${stats.monthEarnings.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          {/* Pending Withdrawal */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">${stats.pendingWithdrawal.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Processing</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Earnings Chart */}
          <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Earnings Trend</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} name="Daily Earnings ($)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Breakdown */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Top Activities</CardTitle>
              <CardDescription>Earnings by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-300">Watching</span>
                  </div>
                  <span className="text-sm font-semibold text-white">${breakdown.watch.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-slate-300">Invites</span>
                  </div>
                  <span className="text-sm font-semibold text-white">${breakdown.invite.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-300">Likes</span>
                  </div>
                  <span className="text-sm font-semibold text-white">${breakdown.like.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-slate-300">Comments</span>
                  </div>
                  <span className="text-sm font-semibold text-white">${breakdown.comment.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="activities" className="w-full">
          <TabsList className="bg-slate-700 border-slate-600">
            <TabsTrigger value="activities" className="text-slate-300">
              Activities
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-slate-300">
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-slate-300">
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Activity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(breakdown).map(([activity, amount]) => (
                    <div key={activity} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <span className="text-slate-300 capitalize">{activity}</span>
                      <span className="text-white font-semibold">${amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Withdraw Your Earnings</CardTitle>
                <CardDescription>Minimum withdrawal: $1.00</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-900 border border-green-700 rounded-lg">
                  <p className="text-green-200">
                    You can withdraw <span className="font-bold text-green-100">${stats.currentBalance.toFixed(2)}</span>
                  </p>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Withdraw Now
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Available Tasks</CardTitle>
                <CardDescription>Earn extra money by completing simple tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Browse Tasks
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
