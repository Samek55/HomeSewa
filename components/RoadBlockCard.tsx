import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

// Matches whatever sits behind the card (the dimmed modal backdrop) so the two
// "notch" circles at the seam read as real die-cut holes in the ticket stub.
export const ROAD_BLOCK_BACKDROP_COLOR = 'rgba(10, 20, 18, 0.72)';

const PAPER = '#FBF3E4';
const INK = '#17332F';
const MUTED_INK = '#6E6250';
const MARIGOLD = ['#EFA341', '#DD831F'];
const AMBER = '#F2C36B';
const TILE_DARK = '#0C1917';
const LINE = 'rgba(23,51,47,0.18)';

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
  } catch {
    return '';
  }
};

const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, '0');

function CountdownBoard({ seconds }: { seconds: number }) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const digits = `${pad2(hrs)}${pad2(mins)}${pad2(secs)}`.split('');

  return (
    <View style={styles.boardWrap}>
      <Text style={styles.boardLabel}>OFFER ENDS IN</Text>
      <View style={styles.board}>
        {digits.map((d, i) => (
          <React.Fragment key={i}>
            <View style={styles.tile}>
              <Text style={styles.tileText}>{d}</Text>
            </View>
            {(i === 1 || i === 3) && (
              <View style={styles.colon}>
                <View style={styles.colonDot} />
                <View style={styles.colonDot} />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export type RoadBlockCardData = {
  title: string;
  imageUrl: string;
  message: string;
  buttonLabel: string;
  countdownSeconds?: number | null;
  startAt?: string;
  endAt?: string;
};

export default function RoadBlockCard({
  data,
  onPressButton,
  onDismiss,
  onClose,
  runCountdown = true,
}: {
  data: RoadBlockCardData;
  onPressButton?: () => void;
  onDismiss?: () => void;
  onClose?: () => void;
  runCountdown?: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(data.countdownSeconds || 0);
  const startedFrom = useRef(data.countdownSeconds || 0);

  useEffect(() => {
    setSecondsLeft(data.countdownSeconds || 0);
    startedFrom.current = data.countdownSeconds || 0;
  }, [data.countdownSeconds]);

  useEffect(() => {
    if (!runCountdown || !startedFrom.current) return;
    const id = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [runCountdown]);

  const showCountdown = !!data.countdownSeconds;
  const showValidity = !!(data.startAt && data.endAt);

  return (
    <View style={styles.ticket}>
      <View style={styles.hero}>
        <Image source={{ uri: data.imageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(12,25,23,0.35)']}
          style={StyleSheet.absoluteFillObject}
        />
        {onClose && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.perfLine} />
      <View style={[styles.notch, styles.notchLeft]} />
      <View style={[styles.notch, styles.notchRight]} />

      <View style={styles.body}>
        <Text style={styles.title}>{data.title}</Text>

        {showCountdown && <CountdownBoard seconds={secondsLeft} />}

        <Text style={styles.message}>{data.message}</Text>

        <View style={styles.tear} />

        <TouchableOpacity style={styles.cta} onPress={onPressButton} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{data.buttonLabel.toUpperCase()}</Text>
          <Ionicons name="arrow-forward" size={15} color={PAPER} />
        </TouchableOpacity>

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.dismiss}>Maybe later</Text>
          </TouchableOpacity>
        )}

        {showValidity && (
          <Text style={styles.fine}>
            VALID {formatDate(data.startAt!)} – {formatDate(data.endAt!)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: PAPER,
    overflow: 'visible',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  hero: {
    height: hp('19%'),
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: MARIGOLD[1],
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(12,25,23,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  perfLine: {
    borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: LINE,
    marginHorizontal: wp('5%'),
  },
  notch: {
    position: 'absolute', top: hp('19%') - 11,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: ROAD_BLOCK_BACKDROP_COLOR,
  },
  notchLeft: { left: -11 },
  notchRight: { right: -11 },
  body: { paddingHorizontal: wp('5%'), paddingTop: hp('2%'), paddingBottom: hp('2.2%') },

  title: { fontSize: 18, lineHeight: 23, fontWeight: '800', color: INK, marginBottom: hp('1.4%') },

  boardWrap: { marginBottom: hp('1.8%') },
  boardLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, color: MUTED_INK, marginBottom: 8 },
  board: { flexDirection: 'row', alignItems: 'center' },
  tile: {
    width: 32, height: 40, borderRadius: 6, marginRight: 4,
    backgroundColor: TILE_DARK, alignItems: 'center', justifyContent: 'center',
  },
  tileText: { color: AMBER, fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  colon: { marginRight: 4, gap: 4 },
  colonDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: AMBER, opacity: 0.85 },

  message: { fontSize: 13.5, lineHeight: 20, color: INK, fontWeight: '500', marginBottom: hp('1.8%') },
  tear: { borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: LINE, marginBottom: hp('1.6%') },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: INK, borderRadius: 12, paddingVertical: hp('1.7%'),
    marginBottom: hp('1.2%'),
  },
  ctaText: { color: PAPER, fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },

  dismiss: { textAlign: 'center', fontSize: 12.5, fontWeight: '700', color: MUTED_INK, marginBottom: hp('1.4%') },
  fine: {
    textAlign: 'center', fontSize: 9.5, color: MUTED_INK, fontWeight: '600',
    letterSpacing: 0.3, borderTopWidth: 1, borderTopColor: LINE, paddingTop: hp('1%'),
  },
});
