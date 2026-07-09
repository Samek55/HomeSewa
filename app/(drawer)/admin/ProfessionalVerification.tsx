import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSignedDocumentUrl } from '@/api/uploadToStorage';

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;
const sendSparrowSms = async (phone: string, text: string) => {
    const to = '977' + phone.replace(/\D/g, '').slice(-10);
    await fetch('https://api.sparrowsms.com/v2/sms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
    });
};

type Professional = {
    uin: number;
    full_name: string;
    phone: string;
    email: string | null;
    gender: string | null;
    positions: string[];
    working_areas: string[];
    headshot: string | null;
    id_proof: string | null;
    application_date: string;
    years_of_experience: string | null;
    emergency_contact_number: string | null;
    referral_phone_number: string | null;
    message: string | null;
};

// `workforce` was migrated from a legacy system — real columns are
// first_name/middle_name/last_name, profile_status, services, working_areas,
// headshot_url, government_issued_id_url, created_date, years_experience,
// emergency_contact, referred_by, issues. PIN lives on `admins`, not workforce.
const normalizePhone = (raw: string) => {
    if (!raw) return raw;
    const digits = String(raw).replace(/\D/g, '');
    return digits.length > 10 && digits.startsWith('977') ? digits.slice(-10) : digits;
};

const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

export default function ProfessionalVerification() {
    const insets = useSafeAreaInsets();
    const [pending, setPending] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [selected, setSelected] = useState<Professional | null>(null);
    const [openingDoc, setOpeningDoc] = useState(false);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const navigation = useNavigation();

    // ID documents are stored in a private bucket — resolve a short-lived signed URL right
    // before previewing rather than storing/using a permanent public link. Old records created
    // before this fix still hold a full public URL, which we can just preview directly.
    // Rendered in an in-app Modal (not Linking.openURL) so it never leaves the app or lands
    // in a browser tab/history where the signed link could linger.
    const handleViewIdProof = async (idProof: string) => {
        if (openingDoc) return;
        setOpeningDoc(true);
        try {
            const url = idProof.startsWith('http') ? idProof : await getSignedDocumentUrl(idProof);
            setPreviewUri(url);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not open document.');
        } finally {
            setOpeningDoc(false);
        }
    };

    useEffect(() => {
        AsyncStorage.getItem('adminRole').then(role => {
            if (role !== 'super_admin') {
                Alert.alert('Access Denied', 'Super Admin only.');
                router.back();
                return;
            }
            setIsSuperAdmin(true);
        });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('workforce')
            .select('uin, first_name, middle_name, last_name, phone, email, gender, services, working_areas, headshot_url, government_issued_id_url, created_date, years_experience, emergency_contact, referred_by, issues')
            .eq('profile_status', 'Waiting for Verification')
            .order('created_date', { ascending: false });
        if (data) setPending(data.map(row => ({
            uin: row.uin,
            full_name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ') || 'Unknown',
            phone: normalizePhone(row.phone),
            email: row.email,
            gender: row.gender,
            positions: row.services || [],
            working_areas: row.working_areas || [],
            headshot: row.headshot_url,
            id_proof: row.government_issued_id_url,
            application_date: row.created_date,
            years_of_experience: row.years_experience,
            emergency_contact_number: row.emergency_contact,
            referral_phone_number: row.referred_by,
            message: row.issues,
        })));
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isSuperAdmin) load();
    }, [isSuperAdmin]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => { if (isSuperAdmin) load(); });
        return unsubscribe;
    }, [navigation, isSuperAdmin]);

    // Realtime: instantly remove rows deleted or status-changed in Supabase
    useEffect(() => {
        if (!isSuperAdmin) return;

        // Clear any stale channel left over from a Fast Refresh / remount —
        // calling .on() on an already-subscribed channel throws at runtime.
        const stale = supabase.getChannels().find(c => c.topic === 'realtime:pv-workforce');
        if (stale) supabase.removeChannel(stale);

        const channel = supabase
            .channel('pv-workforce')
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'workforce' },
                (payload) => {
                    if (payload.old?.uin) {
                        setPending(prev => prev.filter(p => p.uin !== payload.old.uin));
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workforce' },
                (payload) => {
                    // Remove from pending list once it's no longer awaiting verification
                    if (payload.new?.uin && payload.new?.profile_status !== 'Waiting for Verification') {
                        setPending(prev => prev.filter(p => p.uin !== payload.new.uin));
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [isSuperAdmin]);

    const handleApprove = (uin: number, phone: string, name: string) => {
        Alert.alert('Approve', `Approve ${name} as a professional?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve', onPress: async () => {
                    const { error: wfError } = await supabase.from('workforce').update({ profile_status: 'Active' }).eq('uin', uin);
                    // The professional row (with login PIN) was created at signup with status 'Pending' — activate it now.
                    const { data: proRow, error: proError } = await supabase
                        .from('professional')
                        .update({ status: 'Active' })
                        .eq('phone', phone)
                        .select('pin')
                        .single();

                    if (wfError || proError || !proRow) {
                        console.error('Approval failed:', wfError || proError);
                        Alert.alert('Approval Failed', `Could not activate ${name}'s account. Please try again.`);
                        return;
                    }

                    setPending(prev => prev.filter(p => p.uin !== uin));
                    setSelected(null);

                    // Send login details SMS now that they're approved
                    const firstName = name.split(' ')[0] || 'Professional';
                    const approvalText =
                        `Dear ${firstName}, congratulations! Your HomeSewa Professional application has been approved.\n\nYour Login Details:\nPhone: ${phone}\nPIN: ${proRow.pin}\n\nDownload the HomeSewa app and login using the details above.\n\nYou can change your PIN after logging in.\n\nWelcome to HomeSewa!\n( www.homesewa.app )`;
                    sendSparrowSms(phone, approvalText).catch(() => {});

                    Alert.alert('Approved', `${name} has been approved. Login details sent via SMS.`);
                }
            },
        ]);
    };

    const handleReject = (uin: number, phone: string, name: string) => {
        Alert.alert('Reject', `Reject ${name}'s application?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject', style: 'destructive', onPress: async () => {
                    await supabase.from('workforce').update({ profile_status: 'Rejected' }).eq('uin', uin);
                    await supabase.from('professional').update({ status: 'Rejected' }).eq('phone', phone);
                    setPending(prev => prev.filter(p => p.uin !== uin));
                    setSelected(null);

                    const firstName = name.split(' ')[0] || 'Applicant';
                    const rejectionText =
                        `Dear ${firstName}, your request for joining HomeSewa App as a professional has been rejected. Please contact our call center on 9852024365.`;
                    sendSparrowSms(phone, rejectionText).catch(() => {});
                }
            },
        ]);
    };

    if (!isSuperAdmin) return null;

    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Professional Verification</Text>
                {pending.length > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pending.length}</Text>
                    </View>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#295C59" style={{ marginTop: hp('5%') }} />
            ) : (
                <FlatList
                    data={pending}
                    keyExtractor={item => String(item.uin)}
                    contentContainerStyle={{ padding: wp('4%'), paddingBottom: hp('10%') }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.75}>
                            <View style={styles.cardTop}>
                                {item.headshot ? (
                                    <Image source={{ uri: item.headshot }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {(item.full_name || '?')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.cardInfo}>
                                    <Text style={styles.name}>{item.full_name}</Text>
                                    {item.application_date && (
                                        <Text style={styles.appliedDate}>Applied: {formatDate(item.application_date)}</Text>
                                    )}
                                    {(item.positions?.length > 0) && (
                                        <Text style={styles.summarySub} numberOfLines={1}>{item.positions.join(', ')}</Text>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#D6E8E7" />
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="checkmark-done-circle-outline" size={54} color="#D6E8E7" />
                            <Text style={styles.emptyText}>No pending applications</Text>
                            <Text style={styles.emptySubText}>All professionals have been reviewed</Text>
                        </View>
                    }
                />
            )}

            {/* ── Detail Modal ── */}
            <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.handleBar} />
                        <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
                            <Ionicons name="close" size={22} color="#295C59" />
                        </TouchableOpacity>

                        {selected && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: hp('4%') + insets.bottom }}>
                                <View style={styles.cardTop}>
                                    {selected.headshot ? (
                                        <Image source={{ uri: selected.headshot }} style={styles.avatar} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarText}>
                                                {(selected.full_name || '?')[0].toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.name}>{selected.full_name}</Text>
                                        {selected.application_date && (
                                            <Text style={styles.appliedDate}>Applied: {formatDate(selected.application_date)}</Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.detailsGrid}>
                                    <InfoRow icon="call-outline" label="Phone" value={`+977 ${selected.phone}`} />
                                    {selected.email && <InfoRow icon="mail-outline" label="Email" value={selected.email} />}
                                    {selected.gender && <InfoRow icon="person-outline" label="Gender" value={selected.gender} />}
                                    {selected.years_of_experience && <InfoRow icon="time-outline" label="Experience" value={`${selected.years_of_experience} years`} />}
                                    {selected.emergency_contact_number && <InfoRow icon="alert-circle-outline" label="Emergency Contact" value={`+977 ${selected.emergency_contact_number}`} />}
                                    {selected.referral_phone_number && <InfoRow icon="people-outline" label="Referred By" value={`+977 ${selected.referral_phone_number}`} />}
                                </View>

                                {(selected.positions || []).length > 0 && (
                                    <View style={styles.chipSection}>
                                        <Text style={styles.chipSectionLabel}>Expertise</Text>
                                        <View style={styles.chipsRow}>
                                            {(selected.positions || []).map((p, i) => (
                                                <View key={i} style={[styles.chip, styles.chipGreen]}>
                                                    <Text style={styles.chipTextGreen}>{p}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {(selected.working_areas || []).length > 0 && (
                                    <View style={styles.chipSection}>
                                        <Text style={styles.chipSectionLabel}>Working Areas</Text>
                                        <View style={styles.chipsRow}>
                                            {(selected.working_areas || []).map((area, i) => (
                                                <View key={i} style={[styles.chip, styles.chipBlue]}>
                                                    <Text style={styles.chipTextBlue}>{area}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {selected.message && (
                                    <View style={styles.messageBox}>
                                        <Text style={styles.chipSectionLabel}>Note from Applicant</Text>
                                        <Text style={styles.messageText}>{selected.message}</Text>
                                    </View>
                                )}

                                {selected.id_proof && (
                                    <TouchableOpacity
                                        style={[styles.idProofBtn, openingDoc && { opacity: 0.6 }]}
                                        onPress={() => handleViewIdProof(selected.id_proof!)}
                                        disabled={openingDoc}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="document-text-outline" size={16} color="#295C59" />
                                        <Text style={styles.idProofText}>{openingDoc ? 'Loading…' : 'View ID / Document'}</Text>
                                        <Ionicons name="eye-outline" size={14} color="#9BBAB8" />
                                    </TouchableOpacity>
                                )}

                                <View style={styles.btnRow}>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.rejectBtn]}
                                        onPress={() => handleReject(selected.uin, selected.phone, selected.full_name)}
                                    >
                                        <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                                        <Text style={styles.rejectText}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.approveBtn]}
                                        onPress={() => handleApprove(selected.uin, selected.phone, selected.full_name)}
                                    >
                                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                                        <Text style={styles.approveText}>Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── ID/Document Preview — in-app only, never a browser tab or public link ── */}
            <Modal
                visible={!!previewUri}
                animationType="fade"
                transparent
                onRequestClose={() => setPreviewUri(null)}
            >
                <View style={styles.previewOverlay}>
                    <TouchableOpacity
                        style={[styles.previewClose, { top: insets.top + 12 }]}
                        onPress={() => setPreviewUri(null)}
                    >
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>
                    {previewUri && (
                        <ScrollView
                            style={{ flex: 1, width: '100%' }}
                            contentContainerStyle={styles.previewScrollContent}
                            maximumZoomScale={4}
                            minimumZoomScale={1}
                            centerContent
                        >
                            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </View>
    );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <View style={infoStyles.row}>
            <Ionicons name={icon} size={13} color="#9BBAB8" />
            <Text style={infoStyles.label}>{label}:</Text>
            <Text style={infoStyles.value} numberOfLines={1}>{value}</Text>
        </View>
    );
}

const infoStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
    label: { fontSize: 11, fontWeight: '700', color: '#9BBAB8', minWidth: 80 },
    value: { fontSize: 12, color: '#1C2B2A', fontWeight: '500', flex: 1 },
});

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F9F8' },
    previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    previewClose: {
        position: 'absolute', right: 16, zIndex: 10,
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    previewScrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    previewImage: { width: wp('100%'), height: hp('90%') },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#295C59',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'), gap: wp('3%'),
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 },
    badge: {
        backgroundColor: '#fff', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    badgeText: { fontSize: 13, fontWeight: '800', color: '#295C59' },
    card: {
        backgroundColor: '#fff', borderRadius: 16,
        padding: wp('4%'), marginBottom: hp('1.5%'),
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: wp('3%'), marginBottom: hp('1.5%') },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#E8F4F3', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 22, fontWeight: '800', color: '#295C59' },
    cardInfo: { flex: 1 },
    name: { fontSize: 15, fontWeight: '800', color: '#1C2B2A', marginBottom: 2 },
    appliedDate: { fontSize: 11, color: '#B0BEC5' },
    summarySub: { fontSize: 12, color: '#9BBAB8', marginTop: 2 },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#F5F9F8', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: wp('5%'), paddingTop: hp('1.5%'),
        maxHeight: hp('88%'),
    },
    handleBar: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#D6E8E7', alignSelf: 'center', marginBottom: hp('1%'),
    },
    modalClose: {
        alignSelf: 'flex-end', padding: 6,
        backgroundColor: '#E8F4F3', borderRadius: 20, marginBottom: hp('1%'),
    },

    detailsGrid: {
        backgroundColor: '#F8FFFE', borderRadius: 10, padding: wp('3%'),
        marginBottom: hp('1.2%'), borderWidth: 1, borderColor: '#E8F4F3',
    },

    chipSection: { marginBottom: hp('1.2%') },
    chipSectionLabel: { fontSize: 11, fontWeight: '800', color: '#295C59', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    chipGreen: { backgroundColor: '#dcfce7' },
    chipBlue: { backgroundColor: '#E8F4F3' },
    chipTextGreen: { fontSize: 11, color: '#16a34a', fontWeight: '700' },
    chipTextBlue: { fontSize: 11, color: '#295C59', fontWeight: '600' },

    messageBox: {
        backgroundColor: '#FFFBEB', borderRadius: 10, padding: wp('3%'),
        borderWidth: 1, borderColor: '#FEF3C7', marginBottom: hp('1.2%'),
    },
    messageText: { fontSize: 13, color: '#92400E', lineHeight: 18 },

    idProofBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#E8F4F3', borderRadius: 10,
        paddingHorizontal: wp('3.5%'), paddingVertical: hp('1.2%'),
        marginBottom: hp('1.5%'), borderWidth: 1, borderColor: '#C9E8E6',
    },
    idProofText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#295C59' },

    btnRow: { flexDirection: 'row', gap: 10, marginTop: hp('0.5%') },
    btn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', borderRadius: 12,
        paddingVertical: hp('1.4%'), gap: 6,
    },
    rejectBtn: { borderWidth: 1.5, borderColor: '#fee2e2', backgroundColor: '#fff' },
    approveBtn: { backgroundColor: '#295C59', elevation: 2 },
    rejectText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
    approveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    empty: { alignItems: 'center', paddingVertical: hp('10%'), gap: 8 },
    emptyText: { fontSize: 16, color: '#9BBAB8', fontWeight: '700' },
    emptySubText: { fontSize: 13, color: '#B0BEC5' },
});
