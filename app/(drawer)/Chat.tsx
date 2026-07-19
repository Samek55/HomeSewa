import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import leftArrowIcon from '../../assets/icons/admin/leftarrow.png';
import { fetchBookings } from '@/api/helper/fetchBookingData';
import { fetchWorkforceByPhones } from '@/api/favorites';
import { listMessages, sendMessage, ChatMessage, SenderRole } from '@/api/chat';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemeColors } from '@/theme/colors';

const normalizePhone = (phone?: string | null) => (phone || '').replace(/\D/g, '').replace(/^977/, '');
const POLL_MS = 4000;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [viewerRole, setViewerRole] = useState<SenderRole | null>(null);
  const [viewerPhone, setViewerPhone] = useState<string | null>(null);
  const [otherName, setOtherName] = useState('');
  const [otherPhone, setOtherPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList>(null);
  const pollRef = useRef<any>(null);

  const setup = useCallback(async () => {
    setLoading(true);
    try {
      const [bookings, adminPhone] = await Promise.all([
        fetchBookings(),
        AsyncStorage.getItem('adminPhone'),
      ]);
      const found = bookings.find((b: any) => b.id === id);
      setBooking(found || null);
      if (!found?.acceptedByPhone) return;

      const isProfessional = !!adminPhone && normalizePhone(adminPhone) === normalizePhone(found.acceptedByPhone);
      if (isProfessional) {
        setViewerRole('professional');
        setViewerPhone(adminPhone);
        setOtherName(found.fullName || 'Customer');
        setOtherPhone(found.phone);
      } else {
        setViewerRole('customer');
        setViewerPhone(found.phone);
        setOtherPhone(found.acceptedByPhone);
        const professionals = await fetchWorkforceByPhones([found.acceptedByPhone]);
        setOtherName(professionals[0]?.fullName || 'HomeSewa Professional');
      }
    } catch (err) {
      console.log('Chat setup error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const poll = useCallback(async () => {
    if (!id) return;
    try {
      const data = await listMessages(id);
      setMessages(data);
    } catch (err) {
      console.log('Chat poll error:', err);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setup();
      poll();
      pollRef.current = setInterval(poll, POLL_MS);
      return () => clearInterval(pollRef.current);
    }, [setup, poll])
  );

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !viewerRole || !viewerPhone || sending) return;
    setSending(true);
    setDraft('');
    try {
      await sendMessage(id, viewerRole, viewerPhone, body);
      await poll();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.log('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    if (!otherPhone) return;
    Linking.openURL(`tel:+977${otherPhone}`);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_role === viewerRole;
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Image source={leftArrowIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{otherName}</Text>
        <TouchableOpacity onPress={handleCall} style={styles.callBtn} disabled={!otherPhone}>
          <Ionicons name="call-outline" size={20} color={colors.brand} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : !booking || !viewerRole ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('chat.notFound')}</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('chat.typeMessagePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendBtn, (!draft.trim() || sending) && { opacity: 0.5 }]}
              disabled={!draft.trim() || sending}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: wp('3.6%'), color: colors.textSecondary, marginTop: hp('1.5%') },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  backBtn: { padding: 4 },
  backIcon: { width: hp('3%'), height: hp('3%'), tintColor: colors.brand },
  headerTitle: { flex: 1, fontSize: hp('2.1%'), fontWeight: '700', color: colors.textPrimary, marginLeft: wp('2%') },
  callBtn: { padding: 6 },
  listContent: { padding: wp('4%'), paddingBottom: hp('2%') },
  bubbleRow: { flexDirection: 'row', marginBottom: hp('1%') },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surfaceMuted, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: wp('3.6%'), color: colors.textPrimary },
  bubbleTextMine: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: wp('3%'),
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
