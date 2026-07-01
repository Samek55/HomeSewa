import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, ScrollView, DeviceEventEmitter, Linking, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';

export default function HelpBoxDetail() {
    const { entry } = useLocalSearchParams<{ entry: string }>();
    let item: any = {};
    try { item = JSON.parse(entry || '{}'); } catch {}

    const [reply, setReply] = useState(item.reply || '');
    const [status, setStatus] = useState<'open' | 'solved'>(item.status || 'open');
    const [saving, setSaving] = useState(false);

    const formatDate = (iso: string) => {
        try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return iso; }
    };

    const handleSave = async (newStatus: 'solved' | 'open') => {
        setSaving(true);
        const now = new Date().toISOString();
        try {
            const { data: updated, error } = await supabase
                .from('helpbox')
                .update({ reply: reply.trim(), status: newStatus, modified_at: now })
                .eq('id', item.id)
                .select();
            if (error) throw error;
            if (!updated || updated.length === 0) throw new Error(`No row updated — id: ${item.id}`);
            setStatus(newStatus);
            DeviceEventEmitter.emit('helpbox:update', { id: item.id, status: newStatus, modified_at: now });
            Alert.alert('Saved', `Ticket marked as ${newStatus}.`, [
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
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>#{item.id?.slice(0, 6).toUpperCase()}</Text>
                    {item.created_at ? <Text style={styles.headerSub}>{formatDate(item.created_at)}</Text> : null}
                </View>
                <View style={[styles.statusPill, { backgroundColor: isSolved ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.statusPillText, { color: isSolved ? '#16a34a' : '#ef4444' }]}>
                        {isSolved ? 'Solved' : 'Open'}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
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

                {item.modified_at && (
                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Last Updated</Text>
                        <Text style={styles.dateText}>{formatDate(item.modified_at)}</Text>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Note</Text>
                    <TextInput
                        style={styles.replyInput}
                        value={reply}
                        onChangeText={setReply}
                        placeholder="Add a note or reply…"
                        placeholderTextColor="#B0BEC5"
                        multiline
                        textAlignVertical="top"
                        editable={!isSolved}
                    />
                </View>

                {!isSolved && (
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnOutline, saving && { opacity: 0.6 }]}
                            onPress={() => handleSave('open')}
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
                                        { text: 'Confirm', onPress: () => handleSave('solved') },
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
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={styles.solvedNoteText}>This request has been resolved.</Text>
                    </View>
                )}
            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F9F8' },

    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#295C59',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'), gap: wp('3%'),
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    statusPill: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    },
    statusPillText: { fontSize: 12, fontWeight: '700' },

    content: { flex: 1, padding: wp('4%') },

    card: {
        backgroundColor: '#fff', borderRadius: 16,
        padding: wp('4%'), marginBottom: hp('1.5%'),
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    sectionLabel: {
        fontSize: 11, fontWeight: '800', color: '#295C59',
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
    },
    phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    phoneText: { fontSize: 20, fontWeight: '700', color: '#1C2B2A' },
    phoneLink: { textDecorationLine: 'underline', color: '#295C59' },
    whatsappBtn: { padding: 4 },
    dateText: { fontSize: 14, fontWeight: '600', color: '#1C2B2A' },

    replyInput: {
        fontSize: 14, color: '#1C2B2A', lineHeight: 22,
        minHeight: hp('12%'), backgroundColor: '#F5F9F8',
        borderRadius: 10, borderWidth: 1.5, borderColor: '#D6E8E7',
        padding: wp('3%'),
    },

    btnRow: { flexDirection: 'row', gap: 12 },
    btn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', borderRadius: 14,
        paddingVertical: hp('1.8%'), gap: 6,
    },
    btnOutline: { borderWidth: 1.5, borderColor: '#D6E8E7', backgroundColor: '#fff' },
    btnOutlineText: { fontSize: 14, fontWeight: '700', color: '#1C2B2A' },
    btnSolve: { backgroundColor: '#295C59', elevation: 3 },
    btnSolveText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    solvedNote: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#dcfce7', borderRadius: 12, padding: wp('4%'),
    },
    solvedNoteText: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
});
