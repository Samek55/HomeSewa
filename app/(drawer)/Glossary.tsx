import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

import { AlphabetKey, GlossaryData2 } from '../../src/data/GlossaryData2';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Header3 from '@/components/Header3drawer';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const alphabet: AlphabetKey[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
];

export default function GlossaryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedLetter, setSelectedLetter] = useState<AlphabetKey>('A');

  const filteredData = GlossaryData2[selectedLetter] || [];



  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header3 goHome />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        <View style={styles.container}>
          <Text style={styles.subtitle}>
            Explore common handyman, repair, maintenance, installation, and home improvement terms from A to Z.
          </Text>

          {/* ALPHABET */}
          <View style={styles.alphabetBox}>
            <View style={styles.alphabetGrid}>
              {alphabet.map(letter => (
                <Pressable
                  key={letter}
                  onPress={() => setSelectedLetter(letter)}
                  style={[
                    styles.letterButton,
                    selectedLetter === letter && styles.activeLetter,
                  ]}
                >
                  <Text
                    style={[
                      styles.letterText,
                      selectedLetter === letter && styles.activeLetterText,
                    ]}
                  >
                    {letter}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* SELECTED LETTER */}
          <View style={styles.selectedBox}>
            <Text style={styles.selectedText}>{selectedLetter}</Text>
          </View>

          {/* RESULTS */}
          <View style={styles.resultContainer}>
            {filteredData.length > 0 ? (
              filteredData.map(item => (
                <View key={item.title} style={styles.card}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>{item.words}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>
                {`No items found for "${selectedLetter}"`}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },


  container: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('2%'),
  },

  subtitle: {
    fontSize: wp('3.8%'),
    marginTop: 15,
    marginBottom: hp('4%'),
    textAlign: 'center',
    lineHeight: hp('2.5%'),
    color: colors.textSecondary,
  },

  alphabetBox: {
    backgroundColor: colors.surface,
    padding: 10,
    paddingVertical: 20,
    borderRadius: 15,
    borderColor: colors.border,
    borderWidth: 2,
    elevation: 2,
  },

  alphabetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center'
  },

  letterButton: {
    width: '12%',
    aspectRatio: 1,
    marginVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeLetter: {
    backgroundColor: colors.brand,
  },

  letterText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },

  activeLetterText: {
    color: '#fff',
  },

  selectedBox: {
    marginTop: 15,
  },

  selectedText: {
    fontSize: wp('7%'),
    fontWeight: '900',
    color: colors.brand,
    textAlign: 'center',
  },

  resultContainer: {
    marginTop: 15,
  },

  card: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: colors.surface,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardTitle: {
    fontSize: wp('4.3%'),
    fontWeight: '800',
    color: colors.textPrimary,
  },

  cardText: {
    marginTop: hp('1%'),
    fontSize: wp('3.5%'),
    color: colors.textSecondary,
    lineHeight: hp('2.2%'),
  },

  noData: {
    marginTop: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
});