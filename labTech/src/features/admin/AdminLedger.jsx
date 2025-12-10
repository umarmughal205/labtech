import React, { useState, useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AdminDrawer from './AdminDrawer';

// Build mock ledger entries relative to current date so filters always have data
const buildLedgerEntries = () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  const makeDate = (offsetDays) => new Date(year, month, day + offsetDays);

  return [
    {
      id: 1,
      date: makeDate(0),
      ref: 'INV-1023',
      type: 'Credit',
      description: 'CBC Test - Patient #1234',
      amount: 450,
      balance: 450,
    },
    {
      id: 2,
      date: makeDate(0),
      ref: 'EXP-883',
      type: 'Debit',
      description: 'Lab Supplies Purchase',
      amount: -1200,
      balance: -750,
    },
    {
      id: 3,
      date: makeDate(-1),
      ref: 'INV-1019',
      type: 'Credit',
      description: 'LFT Test - Patient #5678',
      amount: 700,
      balance: -50,
    },
    {
      id: 4,
      date: makeDate(-2),
      ref: 'EXP-880',
      type: 'Debit',
      description: 'Utility Bill Payment',
      amount: -650,
      balance: -700,
    },
    {
      id: 5,
      date: makeDate(-7),
      ref: 'INV-1010',
      type: 'Credit',
      description: 'X-Ray Test - Ms. Ahmed',
      amount: 800,
      balance: 100,
    },
    {
      id: 6,
      date: makeDate(-10),
      ref: 'EXP-870',
      type: 'Debit',
      description: 'Clinic Rent Payment',
      amount: -20000,
      balance: -19900,
    },
  ];
};

const ledgerEntries = buildLedgerEntries();

const formatCurrency = (value) => {
  const abs = Math.abs(value);
  const label = `Rs. ${abs.toLocaleString()}`;
  return value < 0 ? `- ${label}` : label;
};

export default function AdminLedger() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const isWithinPeriod = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (d.getTime() > startOfToday.getTime()) return false; // no future dates

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

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((e) => isWithinPeriod(e.date));
  }, [selectedPeriod]);

  const totalCredit = filteredEntries
    .filter(e => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalDebit = filteredEntries
    .filter(e => e.amount < 0)
    .reduce((sum, e) => sum + e.amount, 0);
  const closingBalance = totalCredit + totalDebit;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuOpen((prev) => !prev)}
        >
          <Ionicons name={isMenuOpen ? 'close' : 'menu'} size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ledger</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <AdminDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeRoute="ledger"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector (same style idea as Finance) */}
        <View style={styles.periodSelector}>
          {['Today', 'Week', 'Month', 'Year'].map((period) => (
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

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Credit</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>{formatCurrency(totalCredit)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Debit</Text>
            <Text style={[styles.summaryValue, { color: '#DC2626' }]}>{formatCurrency(totalDebit)}</Text>
          </View>
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.summaryLabel}>Closing Balance</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: closingBalance >= 0 ? '#16A34A' : '#DC2626' },
            ]}
          >
            {formatCurrency(closingBalance)}
          </Text>
        </View>

        {/* Ledger entries */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ledger Entries ({selectedPeriod.toUpperCase()})</Text>
        </View>

        <View style={styles.entriesCard}>
          {filteredEntries.map((entry, index) => (
            <View key={entry.id} style={[styles.entryRow, index !== filteredEntries.length - 1 && styles.entryDivider]}>
              <View style={styles.entryLeft}>
                <Text style={styles.entryDate}>{entry.date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}</Text>
                <Text style={styles.entryRef}>{entry.ref}</Text>
                <Text style={styles.entryDescription}>{entry.description}</Text>
              </View>
              <View style={styles.entryRight}>
                <View style={[styles.typeBadge, entry.type === 'Credit' ? styles.creditBadge : styles.debitBadge]}>
                  <Text style={styles.typeText}>{entry.type}</Text>
                </View>
                <Text style={[styles.amountText, entry.amount >= 0 ? styles.creditAmount : styles.debitAmount]}>
                  {formatCurrency(entry.amount)}
                </Text>
                <Text style={styles.balanceText}>Bal: {formatCurrency(entry.balance)}</Text>
              </View>
            </View>
          ))}
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  entriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 24,
  },
  entryRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  entryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  entryLeft: {
    flex: 1,
    paddingRight: 8,
  },
  entryRight: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  entryDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  entryRef: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  entryDescription: {
    fontSize: 13,
    color: '#111827',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  creditBadge: {
    backgroundColor: '#DCFCE7',
  },
  debitBadge: {
    backgroundColor: '#FEE2E2',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  creditAmount: {
    color: '#16A34A',
  },
  debitAmount: {
    color: '#DC2626',
  },
  balanceText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
