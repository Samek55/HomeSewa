import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, FlatList, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    uin: string;
    full_name: string;
    phone: string;
    email: string | null;
    gender: string | null;
    positions: string[];
    preferred_city: string;
    working_areas: string[];
    headshot: string | null;
    id_proof: string | null;
    application_date: string;
    years_of_experience: string | null;
    emergency_contact_number: string | null;
    referral_phone_number: string | null;
    message: string | null;
    pin: string | null;
};

export default function ProfessionalVerification() {
    const [pending, setPending] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        AsyncStorage.getItem('adminTable').then(table => {
            if (table !== 'admins') {
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
            .select('uin, full_name, phone, email, gender, positions, preferred_city, working_areas, headshot, id_proof, application_date, years_of_experience, emergency_contact_number, referral_phone_number, message, pin')
            .eq('status', 'Pending')
            .order('application_date', { ascending: false });
        if (data) setPending(data as Professional[]);
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
                    // Remove from pending list if status is no longer Pending
                    if (payload.new?.uin && payload.new?.status !== 'Pending') {
                        setPending(prev => prev.filter(p => p.uin !== payload.new.uin));
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [isSuperAdmin]);

    const handleApprove = (uin: string, phone: string, name: string, pin: string | null) => {
        Alert.alert('Approve', `Approve ${name} as a professional?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve', onPress: async () => {
                    await supabase.from('workforce').update({ status: 'Active' }).eq('uin', uin);
                    await supabase.from('admins').update({ status: 'Active' }).eq('phone', phone);
                    setPending(prev => prev.filter(p => p.uin !== uin));

                    // Send login details SMS now that they're approved
                    const firstName = name.split(' ')[0] || 'Professional';
                    const approvalText =
                        `Dear ${firstName}, congratulations! Your HomeSewa Professional application has been approved.\n\nYour Login Details:\nPhone: ${phone}\nPIN: ${pin || 'Contact support'}\n\nDownload the HomeSewa app and login using the details above.\n\nYou can change your PIN after logging in.\n\nWelcome to HomeSewa!\n( www.homesewa.app )`;
                    sendSparrowSms(phone, approvalText).catch(() => {});

                    Alert.alert('Approved', `${name} has been approved. Login details sent via SMS.`);
                }
            },
        ]);
    };

    const handleReject = (uin: string, name: string) => {
        Alert.alert('Reject', `Reject ${name}'s application?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject', style: 'destructive', onPress: async () => {
                    await supabase.from('workforce').update({ status: 'Rejected' }).eq('uin', uin);
                    setPending(prev => prev.filter(p => p.uin !== uin));
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
                    keyExtractor={item => item.uin}
                    contentContainerStyle={{ padding: wp('4%'), paddingBottom: hp('10%') }}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            {/* Header row — photo + name + date */}
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
                                        <Text style={styles.appliedDate}>Applied: {item.application_date}</Text>
                                    )}
                                </View>
                            </View>

                            {/* Details grid */}
                            <View style={styles.detailsGrid}>
                                <InfoRow icon="call-outline" label="Phone" value={`+977 ${item.phone}`} />
                                {item.email && <InfoRow icon="mail-outline" label="Email" value={item.email} />}
                                {item.gender && <InfoRow icon="person-outline" label="Gender" value={item.gender} />}
                                {item.years_of_experience && <InfoRow icon="time-outline" label="Experience" value={`${item.years_of_experience} years`} />}
                                <InfoRow icon="location-outline" label="City" value={item.preferred_city} />
                                {item.emergency_contact_number && <InfoRow icon="alert-circle-outline" label="Emergency Contact" value={`+977 ${item.emergency_contact_number}`} />}
                                {item.referral_phone_number && <InfoRow icon="people-outline" label="Referred By" value={`+977 ${item.referral_phone_number}`} />}
                            </View>

                            {/* Expertise */}
                            {(item.positions || []).length > 0 && (
                                <View style={styles.chipSection}>
                                    <Text style={styles.chipSectionLabel}>Expertise</Text>
                                    <View style={styles.chipsRow}>
                                        {(item.positions || []).map((p, i) => (
                                            <View key={i} style={[styles.chip, styles.chipGreen]}>
                                                <Text style={styles.chipTextGreen}>{p}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Working areas */}
                            {(item.working_areas || []).length > 0 && (
                                <View style={styles.chipSection}>
                                    <Text style={styles.chipSectionLabel}>Working Areas</Text>
                                    <View style={styles.chipsRow}>
                                        {(item.working_areas || []).map((area, i) => (
                                            <View key={i} style={[styles.chip, styles.chipBlue]}>
                                                <Text style={styles.chipTextBlue}>{area}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Message / note */}
                            {item.message && (
                                <View style={styles.messageBox}>
                                    <Text style={styles.chipSectionLabel}>Note from Applicant</Text>
                                    <Text style={styles.messageText}>{item.message}</Text>
                                </View>
                            )}

                            {/* ID proof */}
                            {item.id_proof && (
                                <TouchableOpacity
                                    style={styles.idProofBtn}
                                    onPress={() => Linking.openURL(item.id_proof!)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="document-text-outline" size={16} color="#295C59" />
                                    <Text style={styles.idProofText}>View ID / Document</Text>
                                    <Ionicons name="open-outline" size={14} color="#9BBAB8" />
                                </TouchableOpacity>
                            )}

                            {/* Action buttons */}
                            <View style={styles.btnRow}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.rejectBtn]}
                                    onPress={() => handleReject(item.uin, item.full_name)}
                                >
                                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                                    <Text style={styles.rejectText}>Reject</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.approveBtn]}
                                    onPress={() => handleApprove(item.uin, item.phone, item.full_name, item.pin)}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                                    <Text style={styles.approveText}>Approve</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
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
