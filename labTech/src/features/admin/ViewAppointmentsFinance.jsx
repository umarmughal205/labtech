import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const formatCurrency = (amount) => `Rs. ${amount.toLocaleString()}`;

const formatDateLabel = (date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const buildDailyBreakdown = (periodKey, summaryData) => {
  const today = new Date();

  if (!summaryData) return [];

  let dates = [];

  if (periodKey === 'today') {
    dates = [today];
  } else if (periodKey === 'week') {
    // Start from Monday of current week
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = (dayOfWeek + 6) % 7; // 0 if Mon, 1 if Tue, ...
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
  } else if (periodKey === 'month') {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }
  }

  // Only keep today and past dates (no future days)
  dates = dates.filter(d => d.getTime() <= today.getTime());

  // Sort dates descending (most recent first)
  dates.sort((a, b) => b.getTime() - a.getTime());

  const daysCount = dates.length || 1;

  const perDayTotal = Math.max(1, Math.round(summaryData.total / daysCount));
  const perDayRevenue = Math.max(1, Math.round(summaryData.revenue / daysCount));

  return dates.map((date, index) => {
    const total = perDayTotal;
    const completed = Math.max(0, Math.round(total * 0.75));
    const pending = Math.max(0, Math.round(total * 0.15));
    const cancelled = Math.max(0, total - completed - pending);

    return {
      id: index + 1,
      date: formatDateLabel(date),
      total,
      completed,
      pending,
      cancelled,
      revenue: perDayRevenue,
    };
  });
};

export default function ViewAppointmentsFinance() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const periods = ['Today', 'Week', 'Month'];

  const summary = {
    today: { total: 18, completed: 14, cancelled: 2, pending: 2, revenue: 24500 },
    week: { total: 96, completed: 81, cancelled: 5, pending: 10, revenue: 135000 },
    month: { total: 380, completed: 340, cancelled: 12, pending: 28, revenue: 520000 },
  };

  const data = summary[selectedPeriod];

  const dailyBreakdown = buildDailyBreakdown(selectedPeriod, data);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments Finance</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period.toLowerCase() && styles.activePeriodButton,
              ]}
              onPress={() => setSelectedPeriod(period.toLowerCase())}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.toLowerCase() && styles.activePeriodButtonText,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary ({selectedPeriod.toUpperCase()})</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Appointments</Text>
              <Text style={styles.summaryValue}>{data.total}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Completed</Text>
              <Text style={styles.summaryValue}>{data.completed}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={styles.summaryValue}>{data.pending}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cancelled</Text>
              <Text style={styles.summaryValue}>{data.cancelled}</Text>
            </View>
          </View>
          <View style={styles.summaryRevenueRow}>
            <Text style={styles.summaryRevenueLabel}>Estimated Revenue</Text>
            <Text style={styles.summaryRevenueValue}>{formatCurrency(data.revenue)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          <View style={styles.cardList}>
            {dailyBreakdown.map((item) => (
              <View key={item.id} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayDate}>{item.date}</Text>
                  <Text style={styles.dayTotal}>{item.total} appointments</Text>
                </View>
                <View style={styles.dayStatsRow}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusDot, styles.completedDot]} />
                    <Text style={styles.badgeText}>Completed: {item.completed}</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusDot, styles.pendingDot]} />
                    <Text style={styles.badgeText}>Pending: {item.pending}</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusDot, styles.cancelledDot]} />
                    <Text style={styles.badgeText}>Cancelled: {item.cancelled}</Text>
                  </View>
                </View>
                <View style={styles.dayRevenueRow}>
                  <Text style={styles.dayRevenueLabel}>Daily Revenue</Text>
                  <Text style={styles.dayRevenueValue}>{formatCurrency(item.revenue)}</Text>
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
  headerRightPlaceholder: {
    width: 40,
    height: 40,
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  summaryRevenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  summaryRevenueLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryRevenueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  cardList: {
    gap: 12,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dayTotal: {
    fontSize: 13,
    color: '#6B7280',
  },
  dayStatsRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  completedDot: {
    backgroundColor: '#16A34A',
  },
  pendingDot: {
    backgroundColor: '#F59E0B',
  },
  cancelledDot: {
    backgroundColor: '#EF4444',
  },
  badgeText: {
    fontSize: 12,
    color: '#4B5563',
  },
  dayRevenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dayRevenueLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  dayRevenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});
