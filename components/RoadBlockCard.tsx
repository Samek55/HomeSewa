import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

// Dims the screen behind the popup (used by RoadBlockPopup's modal backdrop).
// Same teal-black tone as the overlays used on Home/Service screens, not a
// generic dark — keeps the popup feeling like part of the app, not a paste-in.
export const ROAD_BLOCK_BACKDROP_COLOR = 'rgba(18, 46, 44, 0.82)';

// HomeSewa's real palette (see Header1.tsx, Home.tsx, CustomDrawer.tsx) — no
// separate accent color exists app-wide, so the popup stays teal-on-white too.
const SURFACE = '#FFFFFF';
const INK = '#1C2B2A';
const BRAND = '#295C59';
const BRAND_DEEP = '#1E4542';
const LINE = '#D6E8E7';

export type RoadBlockCardData = {
  title: string;
  imageUrl: string;
  message: string;
  buttonLabel: string;
  // Seconds the close (×) button shows a countdown before it becomes tappable —
  // a "skippable ad" style delay, not a flash-sale deadline. Null/0 = closable right away.
  countdownSeconds?: number | null;
};

// Close button that shows a numeric countdown (like a website's "skip in 10s"
// button) and only turns into a tappable × once that countdown reaches zero.
function CloseButton({ seconds, onClose, running }: { seconds: number; onClose?: () => void; running: boolean }) {
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const startedFrom = useRef(seconds);

  useEffect(() => {
    setSecondsLeft(seconds);
    startedFrom.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (!running || !startedFrom.current) return;
    const id = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const counting = startedFrom.current > 0 && secondsLeft > 0;

  return (
    <TouchableOpacity
      style={styles.closeBtn}
      onPress={counting ? undefined : onClose}
      disabled={counting}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {counting
        ? <Text style={styles.closeBtnCountText}>{secondsLeft}</Text>
        : <Ionicons name="close" size={16} color="#fff" />}
    </TouchableOpacity>
  );
}

export default function RoadBlockCard({
  data,
  onPressButton,
  onClose,
  runCountdown = true,
}: {
  data: RoadBlockCardData;
  onPressButton?: () => void;
  onClose?: () => void;
  runCountdown?: boolean;
}) {
  return (
    <View style={styles.ticket}>
      <View style={styles.hero}>
        <Image source={{ uri: data.imageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(30,69,66,0.45)']}
          style={StyleSheet.absoluteFillObject}
        />
        <CloseButton seconds={data.countdownSeconds || 0} onClose={onClose} running={runCountdown} />
      </View>

      <View style={styles.seam} />

      <View style={styles.body}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.message}>{data.message}</Text>

        <TouchableOpacity onPress={onPressButton} activeOpacity={0.85}>
          <LinearGradient colors={[BRAND, BRAND_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            <Text style={styles.ctaText}>{data.buttonLabel.toUpperCase()}</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: SURFACE,
    overflow: 'visible',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  hero: {
    width: '100%',
    aspectRatio: 1, // banner artwork is exported square (1080x1080)
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: BRAND, // shows briefly while the image loads
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(30,69,66,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnCountText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  seam: {
    height: 0,
    marginHorizontal: wp('5%'),
    borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: LINE,
  },

  body: { paddingHorizontal: wp('5%'), paddingTop: hp('2.2%'), paddingBottom: hp('2.2%') },

  title: { fontSize: 18, lineHeight: 23, fontWeight: '800', color: INK, marginBottom: hp('1%') },
  message: { fontSize: 13.5, lineHeight: 20, color: INK, fontWeight: '500', marginBottom: hp('1.8%') },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: hp('1.7%'),
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
});
