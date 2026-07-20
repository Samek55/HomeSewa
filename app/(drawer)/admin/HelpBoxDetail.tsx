import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, ScrollView, DeviceEventEmitter, Linking,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const ISSUE_OPTIONS = [
    'Professional Membership',
    'Service Enquiry',
    'Partnership',
    'Complain of Pro',
    'Work Dispute',
    'Advertising',
    'Other',
];

export default function HelpBoxDetail() {
    const { entry } = useLocalSearchParams<{ entry: string }>();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    let item: any = {};
    try { item = JSON.parse(entry || '{}'); } catch {}

    const [reply, setReply] = useState(item.reply || '');
    const [status, setStatus] = useState<'open' | 'solved'>(item.status || 'open');
    const [issue, setIssue] = useState<string>(item.issue || '');
    const [showIssueDrop, setShowIssueDrop] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('adminTable').then(table => {
            if (table !== 'admins') {
                Alert.alert('Access Denied', 'Admin access only.');
                router.back();
            }
        });
    }, []);

    const formatDate = (iso: string) => {
        try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return iso; }
    };

    const persist = async (newStatus: 'solved' | 'open') => {
        const now = new Date().toISOString();
        const { data: updated, error } = await supabase
            .from('helpbox')
            .update({ reply: reply.trim(), status: newStatus, issue: issue || null, modified_at: now })
            .eq('id', item.id)
            .select();
        if (error) throw error;
        if (!updated || updated.length === 0) throw new Error(`No row updated — id: ${item.id}`);
        setStatus(newStatus);
        DeviceEventEmitter.emit('helpbox:update', {
            id: item.id, status: newStatus, modified_at: now,
            reply: reply.trim(), issue: issue || null,
        });
    };

    const handleSaveNote = async () => {
        setSaving(true);
        try {
            await persist('open');
            Alert.alert('Saved', 'Note saved successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not save.');
        }
        setSaving(false);
    };

    const handleMarkSolved = async () => {
        setSaving(true);
        try {
            await persist('solved');
            Alert.alert('Saved', 'Ticket marked as solved.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not save.');
        }
        setSaving(false);
    };

    const isSolved = status === 'solved';

    return (
        <View style={styles.screen}>
            <Header4 />

            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={isDark ? colors.brand : '#fff'} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>
                        H{String(item.ticket_no ?? '').padStart(4, '0')}
                    </Text>
                    {item.created_at ? <Text style={styles.headerSub}>{formatDate(item.created_at)}</Text> : null}
                </View>
                <View style={[styles.statusPill, { backgroundColor: isSolved ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.statusPillText, { color: isSolved ? colors.success : colors.danger }]}>
                        {isSolved ? 'Solved' : 'Open'}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: hp('10%') }} showsVerticalScrollIndicator={false}>

                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Phone Number</Text>
                    <View style={styles.phoneRow}>
                        <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:+977${item.phone}`)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.phoneText, styles.phoneLink]}>+977 {item.phone}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.whatsappBtn}
                            onPress={() => Linking.openURL(`whatsapp://send?phone=977${item.phone}`)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="logo-whatsapp" size={30} color="#25D366" />
                        </TouchableOpacity>
                    </View>
                </View>

                {item.created_at && (
                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Request Date</Text>
                        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                    </View>
                )}

                {item.modified_at && (
                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Last Updated</Text>
                        <Text style={styles.dateText}>{formatDate(item.modified_at)}</Text>
                    </View>
                )}

                <View style={[styles.card, { zIndex: 10 }]}>
                    <Text style={styles.sectionLabel}>Issue</Text>
                    <TouchableOpacity
                        style={styles.issueBtn}
                        onPress={() => !isSolved && setShowIssueDrop(v => !v)}
                        activeOpacity={0.7}
                        disabled={isSolved}
                    >
                        <Text style={issue ? styles.issueBtnText : styles.issueBtnPlaceholder}>
                            {issue || 'Select issue type'}
                        </Text>
                        <Ionicons name={showIssueDrop ? 'chevron-up' : 'chevron-down'} size={16} color={colors.brand} />
                    </TouchableOpacity>
                    {showIssueDrop && (
                        <View style={styles.issueDropMenu}>
                            {ISSUE_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[styles.issueDropItem, issue === opt && styles.issueDropItemActive]}
                                    onPress={() => { setIssue(opt); setShowIssueDrop(false); }}
                                >
                                    <Text style={[styles.issueDropItemText, issue === opt && styles.issueDropItemTextActive]}>
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Note</Text>
                    <TextInput
                        style={styles.replyInput}
                        value={reply}
                        onChangeText={setReply}
                        placeholder="Add a note or reply…"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        textAlignVertical="top"
                        editable={!isSolved}
                    />
                </View>

                {!isSolved && (
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnOutline, saving && { opacity: 0.6 }]}
                            onPress={handleSaveNote}
                            disabled={saving}
                        >
                            <Text style={styles.btnOutlineText}>Save Note</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnSolve, saving && { opacity: 0.6 }]}
                            onPress={() =>
                                Alert.alert(
                                    'Mark as Solved',
                                    'Are you sure you want to close this request?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Confirm', onPress: handleMarkSolved },
                                    ]
                                )
                            }
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                    <Text style={styles.btnSolveText}>Mark as Solved</Text>
                                </>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {isSolved && (
                    <View style={styles.solvedNote}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        <Text style={styles.solvedNoteText}>This request has been resolved.</Text>
                    </View>
                )}
            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },

    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: isDark ? colors.surface : colors.brand,
        borderBottomWidth: isDark ? 1 : 0, borderBottomColor: colors.divider,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'), gap: wp('3%'),
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: isDark ? colors.textPrimary : '#fff' },
    headerSub: { fontSize: 11, color: isDark ? colors.textMuted : 'rgba(255,255,255,0.7)', marginTop: 2 },
    statusPill: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    },
    statusPillText: { fontSize: 12, fontWeight: '700' },

    content: { flex: 1, padding: wp('4%') },

    card: {
        backgroundColor: colors.surface, borderRadius: 16,
        padding: wp('4%'), marginBottom: hp('1.5%'),
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    sectionLabel: {
        fontSize: 11, fontWeight: '800', color: colors.brand,
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
    },
    phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    phoneText: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    phoneLink: { textDecorationLine: 'underline', color: colors.brand },
    whatsappBtn: { padding: 4 },
    dateText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

    issueBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.background, borderRadius: 10,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('3%'), paddingVertical: hp('1.5%'),
    },
    issueBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    issueBtnPlaceholder: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
    issueDropMenu: {
        backgroundColor: colors.surface, borderRadius: 10,
        borderWidth: 1.5, borderColor: colors.border,
        marginTop: 6, overflow: 'hidden',
    },
    issueDropItem: { paddingHorizontal: wp('3%'), paddingVertical: hp('1.3%') },
    issueDropItemActive: { backgroundColor: colors.surfaceMuted },
    issueDropItemText: { fontSize: 13.5, fontWeight: '500', color: colors.textPrimary },
    issueDropItemTextActive: { color: colors.brand, fontWeight: '700' },

    replyInput: {
        fontSize: 14, color: colors.textPrimary, lineHeight: 22,
        minHeight: hp('12%'), backgroundColor: colors.background,
        borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
        padding: wp('3%'),
    },

    btnRow: { flexDirection: 'row', gap: 12 },
    btn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', borderRadius: 14,
        paddingVertical: hp('1.8%'), gap: 6,
    },
    btnOutline: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    btnOutlineText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    btnSolve: { backgroundColor: colors.brand, elevation: 3 },
    btnSolveText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    solvedNote: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#dcfce7', borderRadius: 12, padding: wp('4%'),
    },
    solvedNoteText: { fontSize: 14, fontWeight: '600', color: colors.success },
});
