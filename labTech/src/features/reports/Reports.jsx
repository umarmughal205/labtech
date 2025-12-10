import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export default function Reports() {
  const router = useRouter();

  // Initial reports data
  const initialReports = [
    {
      id: 1,
      date: 'Nov 10, 2025',
      testName: 'Blood Test Report',
      patientName: 'Ethan Carter',
      sampleId: '12345',
      status: 'Ready',
      isNew: true
    },
    {
      id: 2,
      date: 'Nov 5, 2025',
      testName: 'X-ray Report',
      patientName: 'Ethan Carter',
      sampleId: '67890',
      status: 'Ready',
      isNew: false
    },
    {
      id: 3,
      date: '2024-07-20',
      testName: 'Complete Blood Count (CBC)',
      patientName: 'Ethan Carter',
      sampleId: '11121',
      status: 'Ready',
      isNew: false
    },
    {
      id: 4,
      date: '2024-07-05',
      testName: 'Basic Metabolic Panel (BMP)',
      patientName: 'Ethan Carter',
      sampleId: '13141',
      status: 'Ready'
    }
  ];

  // State management for reports
  const [reports, setReports] = useState(initialReports);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // First launch detection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFirstLaunch(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);


  // Calculate unread count
  const unreadCount = reports.filter(report => report.isNew).length;

  // Function to mark report as viewed (remove NEW badge)
  const markAsViewed = (reportId) => {
    setReports(prevReports =>
      prevReports.map(report =>
        report.id === reportId
          ? { ...report, isNew: false }
          : report
      )
    );
  };

  const parseReportDate = (dateString) => {
    // Try native Date parsing first
    const direct = new Date(dateString);
    if (!isNaN(direct.getTime())) return direct;

    // Fallback for formats like "Nov 10, 2025"
    return new Date(Date.parse(dateString));
  };

  const getFilteredReports = () => {
    if (reports.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (activeFilter) {
      case 'Upcoming':
        return reports.filter((report) => {
          const date = parseReportDate(report.date);
          return !isNaN(date.getTime()) && date >= today;
        });
      case 'Past':
        return reports.filter((report) => {
          const date = parseReportDate(report.date);
          return !isNaN(date.getTime()) && date < today;
        });
      case 'All':
      default:
        return reports;
    }
  };

  const filteredReports = getFilteredReports();

  // Function to mark all reports as read
  const markAllAsRead = () => {
    setTimeout(() => {
      setReports(prevReports => 
        prevReports.map(report => ({ 
          ...report, 
          isNew: false 
        }))
      );
    }, 50);
  };

  const generatePDFContent = (report) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Medical Report - ${report.testName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { color: #3B82F6; font-size: 24px; font-weight: bold; }
        .report-title { color: #111827; font-size: 20px; margin: 10px 0; }
        .info-section { margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #6B7280; }
        .results { margin-top: 30px; padding: 20px; background-color: #F9FAFB; border-radius: 8px; }
        .footer { margin-top: 40px; text-align: center; color: #9CA3AF; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">LabTech Medical Center</div>
        <div class="report-title">${report.testName}</div>
    </div>
    
    <div class="info-section">
        <div class="info-row">
            <span class="label">Patient Name:</span>
            <span class="value">${report.patientName}</span>
        </div>
        <div class="info-row">
            <span class="label">Sample ID:</span>
            <span class="value">${report.sampleId}</span>
        </div>
        <div class="info-row">
            <span class="label">Report Date:</span>
            <span class="value">${report.date}</span>
        </div>
        <div class="info-row">
            <span class="label">Status:</span>
            <span class="value">${report.status}</span>
        </div>
    </div>
    
    <div class="results">
        <h3>Test Results</h3>
        <p>This is a sample medical report for ${report.testName}. In a real application, this would contain actual test results, reference ranges, and medical interpretations.</p>
        
        <div style="margin-top: 20px;">
            <strong>Sample Results:</strong><br>
            • Parameter 1: Normal Range<br>
            • Parameter 2: Within Limits<br>
            • Parameter 3: Satisfactory<br>
        </div>
    </div>
    
    <div class="footer">
        <p>This report was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>LabTech Medical Center - Professional Healthcare Services</p>
    </div>
</body>
</html>
    `;
  };

  const handlePrintReport = async (reportId) => {
    try {
      // Find the report
      const report = reports.find(r => r.id === reportId);
      if (!report) {
        Alert.alert('Error', 'Report not found');
        return;
      }

      // Generate HTML content
      const htmlContent = generatePDFContent(report);
      
      // Create PDF using expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 24,
          top: 24,
          right: 24,
          bottom: 24,
        },
      });
      
      if (uri) {
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Share ${report.testName} Report`,
          });
        } else {
          Alert.alert('Success', 'PDF report generated successfully!');
        }
      } else {
        throw new Error('Failed to generate PDF file');
      }
      
    } catch (error) {
      console.error('Error generating PDF report:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Reports</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.markAllButton}
          onPress={async () => {
            if (unreadCount > 0 && !isMarkingAllRead) {
              setIsMarkingAllRead(true);
              markAllAsRead();
              setTimeout(() => {
                setIsMarkingAllRead(false);
              }, 200);
            }
          }}
          disabled={unreadCount === 0 || isMarkingAllRead}
        >
          <Ionicons 
            name="checkmark-done" 
            size={20} 
            color={unreadCount > 0 && !isMarkingAllRead ? "#3B82F6" : "#6B7280"} 
          />
        </TouchableOpacity>
      </View>

      {/* Report Filters (match Appointments style) */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterScrollContent}
        >
          {['All', 'Upcoming', 'Past'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.activeFilterButton,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyStateTitle}>No reports found</Text>
            <Text style={styles.emptyStateText}>
              Try changing the filter or check back later for new reports.
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <TouchableOpacity 
              key={`report-${report.id}-${report.isNew}`}
              style={[
                styles.reportCard,
                report.isNew && styles.newReportCard
              ]}
              activeOpacity={0.7}
              underlayColor="transparent"
              onPress={() => {
                if (report.isNew) {
                  setTimeout(() => {
                    markAsViewed(report.id);
                  }, 50);
                }
              }}
            >
              <View style={styles.reportContent}>
                <View style={styles.reportInfo}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportDate}>{report.date}</Text>
                    {report.isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.reportTitle}>{report.testName}</Text>
                  <Text style={styles.reportDetails}>
                    {report.patientName} | Sample ID: {report.sampleId} |{'\n'}
                    Status: {report.status}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.printButton}
                    onPress={() => handlePrintReport(report.id)}
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.printButtonText}>Download</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.reportImageContainer}>
                  <View style={styles.reportImagePlaceholder}>
                    <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/home')}
        >
          <Ionicons name="home-outline" size={24} color="#6B7280" style={styles.navIcon} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/appointments')}
        >
          <Ionicons name="calendar-outline" size={24} color="#6B7280" style={styles.navIcon} />
          <Text style={styles.navLabel}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Ionicons name="document-text" size={24} color="#3B82F6" style={styles.navIcon} />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#6B7280" style={styles.navIcon} />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',

  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  unreadBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterScrollView: {
    paddingLeft: 20,
  },
  filterScrollContent: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  reportContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportInfo: {
    flex: 1,
    paddingRight: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  newBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  newReportCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  reportDetails: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  printButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  reportImageContainer: {
    width: 80,
    height: 80,
  },
  reportImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    // Active state styling handled by text color
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeNavLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
