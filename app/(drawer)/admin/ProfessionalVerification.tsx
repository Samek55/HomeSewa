import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Professional = {
    uin: string;
    full_name: string;
    phone: string;
    positions: string[];
    preferred_city: string;
    working_areas: string[];
    headshot: string | null;
    application_date: string;
    years_of_experience: string | null;
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
            .select('uin, full_name, phone, positions, preferred_city, working_areas, headshot, application_date, years_of_experience')
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

    const handleApprove = (uin: string, phone: string, name: string) => {
        Alert.alert('Approve', `Approve ${name} as a professional?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve', onPress: async () => {
                    await supabase.from('workforce').update({ status: 'Active' }).eq('uin', uin);
                    await supabase.from('admins').update({ status: 'Active' }).eq('phone', phone);
                    setPending(prev => prev.filter(p => p.uin !== uin));
                    Alert.alert('Approved', `${name} is now active.`);
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
                                    <Text style={styles.sub}>+977 {item.phone}</Text>
                                    <Text style={styles.sub}>{(item.positions || []).join(', ')}</Text>
                                    <Text style={styles.sub}>{item.preferred_city}</Text>
                                    {item.years_of_experience && (
                                        <Text style={styles.sub}>{item.years_of_experience} yrs experience</Text>
                                    )}
                                </View>
                                {item.application_date && (
                                    <Text style={styles.date}>{item.application_date}</Text>
                                )}
                            </View>

                            {(item.working_areas || []).length > 0 && (
                                <View style={styles.areasRow}>
                                    {(item.working_areas || []).map((area, i) => (
                                        <View key={i} style={styles.areaChip}>
                                            <Text style={styles.areaChipText}>{area}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

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
                                    onPress={() => handleApprove(item.uin, item.phone, item.full_name)}
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
    cardTop: { flexDirection: 'row', gap: wp('3%'), marginBottom: hp('1.5%') },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#E8F4F3', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 22, fontWeight: '800', color: '#295C59' },
    cardInfo: { flex: 1 },
    name: { fontSize: 15, fontWeight: '700', color: '#1C2B2A', marginBottom: 3 },
    sub: { fontSize: 12, color: '#9BBAB8', marginTop: 2 },
    date: { fontSize: 11, color: '#B0BEC5' },
    areasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: hp('1.5%') },
    areaChip: {
        backgroundColor: '#E8F4F3', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    areaChipText: { fontSize: 11, color: '#295C59', fontWeight: '600' },
    btnRow: { flexDirection: 'row', gap: 10 },
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
