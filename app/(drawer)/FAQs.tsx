import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FaqsData } from '../../src/data/FAQsData';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header3 from '@/components/Header3drawer';

type FaqItem = { id: number; question: string; answer: string };

export default function FaqsScreen() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const toggleItem = (id: number) => setExpandedId(prev => prev === id ? null : id);

  return (
    <View style={styles.screen}>
      <Header3 />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>FAQs</Text>
          <Text style={styles.heroSub}>Everything you need to know about HomeSewa</Text>
        </View>

        {/* ACCORDION */}
        <View style={styles.list}>
          {(FaqsData as FaqItem[]).map((item) => {
            const isOpen = expandedId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => toggleItem(item.id)}
                style={[styles.card, isOpen && styles.cardOpen]}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.numBadge, isOpen && styles.numBadgeOpen]}>
                    <Text style={[styles.num, isOpen && styles.numOpen]}>{item.id}</Text>
                  </View>
                  <Text style={[styles.question, isOpen && styles.questionOpen]} numberOfLines={isOpen ? undefined : 2}>
                    {item.question}
                  </Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={isOpen ? '#295C59' : '#9CA3AF'}
                  />
                </View>
                {isOpen && (
                  <View style={styles.answerBox}>
                    <View style={styles.answerLine} />
                    <Text style={styles.answer}>{item.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Still have questions?</Text>
          <Text style={styles.footerSub}>Contact us at homesewa@sriyog.com</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F9F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: hp('5%') },

  hero: {
    backgroundColor: '#F5F9F8',
    paddingHorizontal: wp('6%'),
    paddingTop: hp('3%'),
    paddingBottom: hp('1.5%'),
  },
  heroTitle: {
    fontSize: wp('7%'),
    fontWeight: '800',
    color: '#1C2B2A',
    letterSpacing: 0.3,
  },
  heroSub: {
    fontSize: wp('3.5%'),
    color: '#5A7270',
    marginTop: 6,
    fontWeight: '400',
  },

  list: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('2.5%'),
    gap: 10,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E0ECEB',
    elevation: 1,
    shadowColor: '#295C59',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardOpen: {
    borderColor: '#295C59',
    backgroundColor: '#FAFFFE',
    elevation: 3,
  },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E8F4F3',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numBadgeOpen: { backgroundColor: '#295C59' },

  num: {
    fontSize: wp('3%'),
    fontWeight: '700',
    color: '#295C59',
  },
  numOpen: { color: '#fff' },

  question: {
    flex: 1,
    fontSize: wp('3.7%'),
    fontWeight: '600',
    color: '#1C2B2A',
    lineHeight: 20,
  },
  questionOpen: { color: '#295C59' },

  answerBox: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8F4F3',
    gap: 10,
  },
  answerLine: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#295C59',
    flexShrink: 0,
  },
  answer: {
    flex: 1,
    fontSize: wp('3.5%'),
    color: '#5A7270',
    lineHeight: 21,
    fontWeight: '400',
  },

  footer: {
    margin: wp('4%'),
    backgroundColor: '#E8F4F3',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: hp('2%'),
  },
  footerText: {
    fontSize: wp('4%'),
    fontWeight: '700',
    color: '#295C59',
  },
  footerSub: {
    fontSize: wp('3.3%'),
    color: '#5A7270',
    marginTop: 4,
  },
});
