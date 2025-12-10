import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, Animated, useWindowDimensions, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const IMAGES = [
  require('../../../assets/images/booktesthome.jpg'),
  require('../../../assets/images/onboard2.jpg'),
  require('../../../assets/images/onboard3.jpg'),
];

const HEADINGS = [
  'Book Your Lab Tests From Home',
  'Get Instant Digital Report',
  'Connect With Trusted Labs',
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  const isLandscape = width > height;
  const isSmall = width < 360 || height < 700;
  const isTablet = Math.max(width, height) >= 900;

  // Dynamic layout values
  const heroHeight = isLandscape
    ? Math.max(320, Math.min(600, height * 0.9))
    : isTablet
    ? Math.min(700, height * 0.66)
    : Math.min(620, height * 0.62);

  const horizontal = 0;
  const headingSize = isTablet ? 30 : isSmall ? 20 : 24;
  const subtextSize = isTablet ? 18 : isSmall ? 13 : 14;
  const dotSize = isTablet ? 8 : isSmall ? 5 : 6;
  const activeDotWidth = isTablet ? 24 : isSmall ? 14 : 18;
  const ctaPaddingV = isTablet ? 18 : isSmall ? 12 : 14;
  const contentSide = isTablet ? 32 : isSmall ? 12 : 20; // responsive text side padding
  const contentBottom = isTablet ? 12 : isSmall ? 8 : 10; // reduce gap to CTA
  const ctaSide = isTablet ? 48 : isSmall ? 16 : 24; // responsive CTA side margin
  const ctaBottom = isTablet ? 64 : isSmall ? 24 : 56; // raise button higher from bottom

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 0, useNativeDriver: true }).start(() => {
        setIndex((prev) => (prev + 1) % IMAGES.length);
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      fade.stopAnimation();
    };
  }, [fade]);

  return (
    <SafeAreaView style={[styles.container, { paddingHorizontal: horizontal }]}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <ScrollView style={styles.main} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Animated.Image
            key={index}
            source={IMAGES[index]}
            style={[styles.hero, { height: heroHeight, opacity: fade }]}
            resizeMode="cover"
            onLoad={() => {
              Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
            }}
          />
        </View>

        <View style={styles.dotsRow}>
          {IMAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
                i === index && [styles.dotActive, { width: activeDotWidth, borderRadius: dotSize / 2 }],
              ]}
            />
          ))}
        </View>

        <View style={[styles.content, { paddingHorizontal: contentSide }]}>
          <Text style={[styles.heading, { fontSize: headingSize }]}>
            {HEADINGS[index % HEADINGS.length]}
          </Text>
          <Text style={[styles.subtext, { fontSize: subtextSize }]}>
            Book your lab tests from the comfort of your home with our efficient home sampling service.
          </Text>
        </View>
      </ScrollView>

      <Pressable
        style={[
          styles.cta,
          { paddingVertical: ctaPaddingV, marginHorizontal: ctaSide, marginBottom: ctaBottom },
        ]}
        onPress={() => router.push('/login')}
      >
        <Text style={styles.ctaText}>Get Started</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
     },
  main: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderBottomLeftRadius:24,
    borderBottomRightRadius:24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 20,
  },
  hero: {
    width: '100%',
    height: 450,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D6DBE8',
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2B5C',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#556080',
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 40,
    marginBottom: 40,
  },
  ctaText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
