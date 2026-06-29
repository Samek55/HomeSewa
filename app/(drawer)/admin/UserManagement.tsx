import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, TextInput, FlatList,
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
    status: string;
};

type Customer = {
    phone: string;
    full_name: string;
    blocked: boolean;
};

export default function UserManagement() {
    const [tab, setTab] = useState<'professionals' | 'customers'>('professionals');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
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

    const loadProfessionals = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('workforce')
            .select('uin, full_name, phone, positions, preferred_city, status')
            .order('full_name');
        if (data) setProfessionals(data as Professional[]);
        setLoading(false);
    }, []);

    const loadCustomers = useCallback(async () => {
        setLoading(true);
        const { data: bookings } = await supabase.from('booking').select('full_name, phone');
        const { data: blocked } = await supabase.from('blocked_customers').select('phone');
        const blockedPhones = new Set((blocked || []).map((b: any) => b.phone));
        const unique = [...new Map((bookings || []).map((item: any) => [item.phone, item])).values()];
        setCustomers(unique.map((c: any) => ({ ...c, blocked: blockedPhones.has(c.phone) })));
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!isSuperAdmin) return;
        if (tab === 'professionals') loadProfessionals();
        else loadCustomers();
    }, [tab, isSuperAdmin]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (!isSuperAdmin) return;
            if (tab === 'professionals') loadProfessionals();
            else loadCustomers();
        });
        return unsubscribe;
    }, [navigation, tab, isSuperAdmin]);

    const toggleProfessional = async (uin: string, phone: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        const { error } = await supabase.from('workforce').update({ status: newStatus }).eq('uin', uin);
        if (error) return Alert.alert('Error', error.message);
        // Also sync the admins table so login is blocked immediately
        await supabase.from('admins').update({ status: newStatus }).eq('phone', phone);
        setProfessionals(prev => prev.map(p => p.uin === uin ? { ...p, status: newStatus } : p));
    };

    const toggleCustomer = async (phone: string, blocked: boolean) => {
        if (blocked) {
            await supabase.from('blocked_customers').delete().eq('phone', phone);
        } else {
            await supabase.from('blocked_customers').insert([{ phone }]);
        }
        setCustomers(prev => prev.map(c => c.phone === phone ? { ...c, blocked: !blocked } : c));
    };

    const filteredProfessionals = professionals.filter(p =>
        p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)
    );
    const filteredCustomers = customers.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
    );

    if (!isSuperAdmin) return null;

    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>User Management</Text>
            </View>

            <View style={styles.tabs}>
                {(['professionals', 'customers'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, tab === t && styles.tabActive]}
                        onPress={() => { setTab(t); setSearch(''); }}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t === 'professionals' ? 'Professionals' : 'Customers'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9BBAB8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or phone"
                    placeholderTextColor="#B0BEC5"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={16} color="#B0BEC5" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#295C59" style={{ marginTop: hp('5%') }} />
            ) : (
                <FlatList
                    data={tab === 'professionals' ? filteredProfessionals : filteredCustomers as any[]}
                    keyExtractor={(item: any) => item.uin || item.phone}
                    contentContainerStyle={{ paddingHorizontal: wp('4%'), paddingBottom: hp('10%') }}
                    renderItem={({ item }: any) => (
                        <View style={styles.card}>
                            <View style={styles.cardLeft}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>
                                        {(item.full_name || '?')[0].toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.name}>{item.full_name || 'Unknown'}</Text>
                                    <Text style={styles.sub}>+977 {item.phone}</Text>
                                    {tab === 'professionals' && (
                                        <Text style={styles.sub}>
                                            {(item.positions || []).join(', ')} · {item.preferred_city}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.cardRight}>
                                {tab === 'professionals' && (
                                    <View style={[styles.statusPill, item.status === 'Active' ? styles.pillActive : item.status === 'Pending' ? styles.pillPending : styles.pillInactive]}>
                                        <Text style={[styles.statusText, { color: item.status === 'Active' ? '#16a34a' : item.status === 'Pending' ? '#d97706' : '#ef4444' }]}>
                                            {item.status}
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={[styles.toggleBtn,
                                        tab === 'professionals'
                                            ? item.status === 'Active' ? styles.btnDisable : styles.btnEnable
                                            : item.blocked ? styles.btnEnable : styles.btnDisable
                                    ]}
                                    onPress={() => {
                                        if (tab === 'professionals') {
                                            Alert.alert(
                                                item.status === 'Active' ? 'Disable Account' : 'Enable Account',
                                                `${item.status === 'Active' ? 'Disable' : 'Enable'} ${item.full_name}?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Confirm', onPress: () => toggleProfessional(item.uin, item.phone, item.status) },
                                                ]
                                            );
                                        } else {
                                            Alert.alert(
                                                item.blocked ? 'Unblock Customer' : 'Block Customer',
                                                `${item.blocked ? 'Unblock' : 'Block'} ${item.full_name}?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Confirm', onPress: () => toggleCustomer(item.phone, item.blocked) },
                                                ]
                                            );
                                        }
                                    }}
                                >
                                    <Text style={styles.toggleBtnText}>
                                        {tab === 'professionals'
                                            ? item.status === 'Active' ? 'Disable' : 'Enable'
                                            : item.blocked ? 'Unblock' : 'Block'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={44} color="#D6E8E7" />
                            <Text style={styles.emptyText}>No {tab} found</Text>
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
    tabs: {
        flexDirection: 'row', backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#E8F4F3',
    },
    tab: { flex: 1, paddingVertical: hp('1.5%'), alignItems: 'center' },
    tabActive: { borderBottomWidth: 3, borderBottomColor: '#295C59' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#9BBAB8' },
    tabTextActive: { color: '#295C59', fontWeight: '700' },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', margin: wp('4%'), marginBottom: wp('2%'),
        borderRadius: 14, borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('4%'), height: hp('5.5%'),
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1C2B2A' },
    card: {
        backgroundColor: '#fff', borderRadius: 16,
        padding: wp('3.5%'), marginBottom: hp('1.2%'),
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: wp('3%') },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#E8F4F3', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '800', color: '#295C59' },
    cardInfo: { flex: 1 },
    name: { fontSize: 14, fontWeight: '700', color: '#1C2B2A', marginBottom: 2 },
    sub: { fontSize: 11, color: '#9BBAB8', marginTop: 1 },
    cardRight: { alignItems: 'flex-end', gap: 6 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    pillActive: { backgroundColor: '#dcfce7' },
    pillPending: { backgroundColor: '#fef3c7' },
    pillInactive: { backgroundColor: '#fee2e2' },
    statusText: { fontSize: 11, fontWeight: '700' },
    toggleBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
    btnDisable: { backgroundColor: '#fee2e2' },
    btnEnable: { backgroundColor: '#dcfce7' },
    toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#1C2B2A' },
    empty: { alignItems: 'center', paddingVertical: hp('8%'), gap: 12 },
    emptyText: { fontSize: 15, color: '#9BBAB8', fontWeight: '500' },
});
