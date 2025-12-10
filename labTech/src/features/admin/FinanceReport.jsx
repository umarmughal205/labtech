import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AdminDrawer from './AdminDrawer';
import { useNotifications } from '../../context/NotificationContext';

export default function FinanceReport() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { unreadAdminCount } = useNotifications();

  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const periods = ['Today', 'Week', 'Month', 'Year'];

  // ===== Dynamic finance data based on current date and selected period =====
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const startOfWeek = (() => {
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  })();

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const baseTransactions = [
    // Today
    {
      id: 1,
      type: 'Income',
      description: 'CBC Test - Patient #1234',
      amount: 450,
      date: startOfToday,
      status: 'Completed',
      revenueCategory: 'Lab Tests',
    },
    {
      id: 2,
      type: 'Expense',
      description: 'Utility Bill Payment',
      amount: -3000,
      date: startOfToday,
      status: 'Paid',
      expenseCategory: 'Utilities',
    },
    // Yesterday
    {
      id: 3,
      type: 'Income',
      description: 'LFT Test - Patient #5678',
      amount: 700,
      date: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 1),
      status: 'Completed',
      revenueCategory: 'Lab Tests',
    },
    {
      id: 4,
      type: 'Expense',
      description: 'Staff Salary - Dr. Ali',
      amount: -15000,
      date: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 1),
      status: 'Paid',
      expenseCategory: 'Salaries',
    },
    // Earlier this week
    {
      id: 5,
      type: 'Income',
      description: 'MRI Scan - Patient #8901',
      amount: 5000,
      date: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 3),
      status: 'Completed',
      revenueCategory: 'Lab Tests',
    },
    {
      id: 6,
      type: 'Expense',
      description: 'Lab Equipment Purchase',
      amount: -8000,
      date: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 4),
      status: 'Paid',
      expenseCategory: 'Equipment',
    },
    // Earlier this month
    {
      id: 7,
      type: 'Income',
      description: 'X-Ray Test - Ms. Ahmed',
      amount: 800,
      date: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 10),
      status: 'Completed',
      revenueCategory: 'Others',
    },
    {
      id: 8,
      type: 'Expense',
      description: 'Clinic Rent Payment',
      amount: -20000,
      date: new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 12),
      status: 'Paid',
      expenseCategory: 'Utilities',
    },
  ];

  const isWithinPeriod = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (d.getTime() > startOfToday.getTime()) return false; // no future days

    if (selectedPeriod === 'today') {
      return d.getTime() === startOfToday.getTime();
    }

    if (selectedPeriod === 'week') {
      return d.getTime() >= startOfWeek.getTime();
    }

    if (selectedPeriod === 'month') {
      return d.getTime() >= startOfMonth.getTime();
    }

    if (selectedPeriod === 'year') {
      return d.getTime() >= startOfYear.getTime();
    }

    return true;
  };

  const filteredTransactions = baseTransactions.filter((tx) => isWithinPeriod(tx.date));

  const totalRevenue = filteredTransactions
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const netProfit = totalRevenue - totalExpenses;
  const growthRate = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const revenueByCategoryMap = filteredTransactions
    .filter((tx) => tx.amount > 0)
    .reduce((acc, tx) => {
      const key = tx.revenueCategory || 'Others';
      acc[key] = (acc[key] || 0) + tx.amount;
      return acc;
    }, {});

  const expenseByCategoryMap = filteredTransactions
    .filter((tx) => tx.amount < 0)
    .reduce((acc, tx) => {
      const key = tx.expenseCategory || 'Others';
      acc[key] = (acc[key] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

  const revenueCategoriesOrder = [
    { key: 'Lab Tests', color: '#3B82F6' },
    { key: 'Others', color: '#8B5CF6' },
  ];

  const expenseCategoriesOrder = [
    { key: 'Salaries', icon: 'people' },
    { key: 'Equipment', icon: 'hardware-chip' },
    { key: 'Utilities', icon: 'flash' },
  ];

  const revenueBreakdown = revenueCategoriesOrder
    .map((item, index) => {
      const amount = revenueByCategoryMap[item.key] || 0;
      return {
        id: index + 1,
        category: item.key,
        amount,
        color: item.color,
      };
    })
    .filter((item) => item.amount > 0);

  const expenseBreakdown = expenseCategoriesOrder
    .map((item, index) => {
      const amount = expenseByCategoryMap[item.key] || 0;
      return {
        id: index + 1,
        category: item.key,
        amount,
        icon: item.icon,
      };
    })
    .filter((item) => item.amount > 0);

  const revenueTotalForPercent = revenueBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotalForPercent = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);

  const revenueBreakdownWithPercent = revenueBreakdown.map((item) => ({
    ...item,
    percentage: revenueTotalForPercent
      ? Math.round((item.amount / revenueTotalForPercent) * 100)
      : 0,
  }));

  const expenseBreakdownWithPercent = expenseBreakdown.map((item) => ({
    ...item,
    percentage: expenseTotalForPercent
      ? Math.round((item.amount / expenseTotalForPercent) * 100)
      : 0,
  }));

  const recentTransactions = [...filteredTransactions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((tx) => ({
      ...tx,
      dateLabel: tx.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with admin drawer menu (menu on left) and notifications bell on right */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuOpen((prev) => !prev)}
        >
          <Ionicons name={isMenuOpen ? 'close' : 'menu'} size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity
          style={styles.headerRightButton}
          onPress={() => router.push('/admin-notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#111827" />
          {unreadAdminCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadAdminCount > 9 ? '9+' : unreadAdminCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <AdminDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeRoute="finance"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period.toLowerCase() && styles.activePeriodButton
              ]}
              onPress={() => setSelectedPeriod(period.toLowerCase())}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.toLowerCase() && styles.activePeriodButtonText
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Financial Summary Cards */}
        <View style={styles.summaryGrid}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Ionicons name="trending-up" size={28} color="#FFFFFF" />
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
            <View style={styles.growthBadge}>
              <Ionicons name="arrow-up" size={12} color="#10B981" />
              <Text style={styles.growthText}>+{growthRate}%</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Ionicons name="trending-down" size={28} color="#FFFFFF" />
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Ionicons name="wallet" size={28} color="#FFFFFF" />
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text style={styles.summaryValue}>{formatCurrency(netProfit)}</Text>
          </LinearGradient>
        </View>

        {/* Revenue Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
          <View style={styles.breakdownCard}>
            {revenueBreakdownWithPercent.map((item) => (
              <View key={item.id} style={styles.breakdownItem}>
                <View style={styles.breakdownItemHeader}>
                  <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                  <Text style={styles.breakdownCategory}>{item.category}</Text>
                </View>
                <View style={styles.breakdownItemDetails}>
                  <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
                  <Text style={styles.breakdownPercentage}>{item.percentage}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Expense Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Breakdown</Text>
          <View style={styles.expenseGrid}>
            {expenseBreakdownWithPercent.map((item) => (
              <View key={item.id} style={styles.expenseCard}>
                <View style={styles.expenseIconContainer}>
                  <Ionicons name={item.icon} size={24} color="#3B82F6" />
                </View>
                <Text style={styles.expenseCategory}>{item.category}</Text>
                <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
                <Text style={styles.expensePercentage}>{item.percentage}% of total</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.transactionsCard}>
            {recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={[
                  styles.transactionIcon,
                  transaction.type === 'Income' ? styles.incomeIcon : styles.expenseIcon
                ]}>
                  <Ionicons 
                    name={transaction.type === 'Income' ? 'arrow-down' : 'arrow-up'} 
                    size={16} 
                    color={transaction.type === 'Income' ? '#10B981' : '#EF4444'} 
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>{transaction.dateLabel}</Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    transaction.type === 'Income' ? styles.incomeAmount : styles.expenseAmount
                  ]}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    transaction.status === 'Completed' ? styles.completedBadge : styles.paidBadge
                  ]}>
                    <Text style={styles.statusText}>{transaction.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerRightButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightPlaceholder: {
    width: 40,
    height: 40,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: '70%',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    zIndex: 15,
  },
  menuContainer: {
    position: 'absolute',
    top: 25,
    left: 0,
    bottom: 0,
    width: '70%',
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    zIndex: 20,
  },
  drawerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  drawerTopIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B21B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTopIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  drawerTopTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: '#5B21B6',
    borderRadius: 16,
    marginBottom: 12,
    marginTop: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#E5E7EB',
  },
  profileLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileLocation: {
    fontSize: 12,
    color: '#E5E7EB',
    marginLeft: 4,
  },
  menuSection: {
    marginTop: 16,
    paddingVertical: 8,
  },
  menuFooter: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  menuFooterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  menuFooterVersion: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePeriodButton: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  breakdownItem: {
    marginBottom: 20,
  },
  breakdownItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  breakdownCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  breakdownItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  breakdownPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  expenseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  expenseCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expenseIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  expenseCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  expensePercentage: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  transactionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  incomeIcon: {
    backgroundColor: '#D1FAE5',
  },
  expenseIcon: {
    backgroundColor: '#FEE2E2',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  incomeAmount: {
    color: '#10B981',
  },
  expenseAmount: {
    color: '#EF4444',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
  },
  paidBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
});
