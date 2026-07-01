import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, TextInput, FlatList, RefreshControl,
    Modal, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
    modified_at?: string;
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
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [detailData, setDetailData] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

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

    // Reload whenever the screen is focused OR the tab changes
    useFocusEffect(
        useCallback(() => {
            if (!isSuperAdmin) return;
            if (tab === 'professionals') loadProfessionals();
            else loadCustomers();
        }, [tab, isSuperAdmin])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (tab === 'professionals') await loadProfessionals();
        else await loadCustomers();
        setRefreshing(false);
    }, [tab]);

    // Realtime: reflect Supabase deletions/updates instantly in the UI
    useEffect(() => {
        if (!isSuperAdmin) return;
        const channel = supabase
            .channel('um-changes')
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'workforce' },
                (payload) => {
                    if (payload.old?.uin) {
                        setProfessionals(prev => prev.filter(p => p.uin !== payload.old.uin));
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workforce' },
                (payload) => {
                    if (payload.new?.uin) {
                        setProfessionals(prev => prev.map(p =>
                            p.uin === payload.new.uin
                                ? { ...p, status: payload.new.status, modified_at: payload.new.modified_at }
                                : p
                        ));
                    }
                }
            )
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blocked_customers' },
                (payload) => {
                    if (payload.old?.phone) {
                        setCustomers(prev => prev.map(c =>
                            c.phone === payload.old.phone ? { ...c, blocked: false } : c
                        ));
                    }
                }
            )
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blocked_customers' },
                (payload) => {
                    if (payload.new?.phone) {
                        setCustomers(prev => prev.map(c =>
                            c.phone === payload.new.phone ? { ...c, blocked: true } : c
                        ));
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [isSuperAdmin]);

    const formatDate = (iso?: string) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return iso; }
    };

    const openDetail = async (item: any, type: 'professionals' | 'customers') => {
        setSelectedItem({ ...item, _type: type });
        setDetailData(null);
        if (type === 'professionals') {
            setLoadingDetail(true);
            const { data } = await supabase
                .from('workforce')
                .select('*')
                .eq('uin', item.uin)
                .single();
            setDetailData(data || item);
            setLoadingDetail(false);
        } else {
            setDetailData(item);
        }
    };

    const closeDetail = () => { setSelectedItem(null); setDetailData(null); };

    const toggleProfessional = async (uin: string, phone: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        const now = new Date().toISOString();
        const { error } = await supabase.from('workforce').update({ status: newStatus, modified_at: now }).eq('uin', uin);
        if (error) return Alert.alert('Error', error.message);
        await supabase.from('admins').update({ status: newStatus, modified_at: now }).eq('phone', phone);
        setProfessionals(prev => prev.map(p => p.uin === uin ? { ...p, status: newStatus, modified_at: now } : p));
    };

    const toggleCustomer = async (phone: string, blocked: boolean) => {
        if (blocked) {
            const { error } = await supabase.from('blocked_customers').delete().eq('phone', phone);
            if (error) return Alert.alert('Error', error.message);
        } else {
            const { error } = await supabase.from('blocked_customers').insert([{ phone }]);
            if (error) return Alert.alert('Error', error.message);
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
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#295C59']}
                            tintColor="#295C59"
                        />
                    }
                    renderItem={({ item }: any) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => openDetail(item, tab)}
                            activeOpacity={0.75}
                        >
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
                                        <Text style={styles.sub} numberOfLines={2}>
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
                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn,
                                            tab === 'professionals'
                                                ? item.status === 'Active' ? styles.btnDisable : styles.btnEnable
                                                : item.blocked ? styles.btnEnable : styles.btnDisable
                                        ]}
                                        onPress={(e) => {
                                            e.stopPropagation();
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
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={44} color="#D6E8E7" />
                            <Text style={styles.emptyText}>No {tab} found</Text>
                        </View>
                    }
                />
            )}

            {/* ── Detail Modal ── */}
            <Modal
                visible={!!selectedItem}
                animationType="slide"
                transparent
                onRequestClose={closeDetail}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        {/* Handle bar */}
                        <View style={styles.handleBar} />

                        {/* Close */}
                        <TouchableOpacity style={styles.modalClose} onPress={closeDetail}>
                            <Ionicons name="close" size={22} color="#295C59" />
                        </TouchableOpacity>

                        {loadingDetail ? (
                            <ActivityIndicator size="large" color="#295C59" style={{ marginVertical: hp('5%') }} />
                        ) : detailData ? (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: hp('4%') }}>

                                {/* Avatar + name */}
                                <View style={styles.modalAvatarRow}>
                                    <View style={styles.modalAvatar}>
                                        <Text style={styles.modalAvatarText}>
                                            {(detailData.full_name || '?')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.modalName}>{detailData.full_name || 'Unknown'}</Text>
                                    {selectedItem?._type === 'professionals' && (
                                        <View style={[styles.statusPill,
                                            detailData.status === 'Active' ? styles.pillActive
                                            : detailData.status === 'Pending' ? styles.pillPending
                                            : styles.pillInactive
                                        ]}>
                                            <Text style={[styles.statusText, {
                                                color: detailData.status === 'Active' ? '#16a34a'
                                                    : detailData.status === 'Pending' ? '#d97706' : '#ef4444'
                                            }]}>{detailData.status}</Text>
                                        </View>
                                    )}
                                    {selectedItem?._type === 'customers' && (
                                        <View style={[styles.statusPill, detailData.blocked ? styles.pillInactive : styles.pillActive]}>
                                            <Text style={[styles.statusText, { color: detailData.blocked ? '#ef4444' : '#16a34a' }]}>
                                                {detailData.blocked ? 'Blocked' : 'Active'}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Phone row */}
                                <View style={styles.detailCard}>
                                    <Text style={styles.detailLabel}>Phone Number</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <TouchableOpacity onPress={() => Linking.openURL(`tel:+977${detailData.phone}`)}>
                                            <Text style={[styles.detailValue, styles.phoneLink]}>+977 {detailData.phone}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => Linking.openURL(`whatsapp://send?phone=977${detailData.phone}`)}>
                                            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {selectedItem?._type === 'professionals' && (<>
                                    {detailData.preferred_city && (
                                        <View style={styles.detailCard}>
                                            <Text style={styles.detailLabel}>City</Text>
                                            <Text style={styles.detailValue}>{detailData.preferred_city}</Text>
                                        </View>
                                    )}
                                    {(detailData.positions?.length > 0) && (
                                        <View style={styles.detailCard}>
                                            <Text style={styles.detailLabel}>Services</Text>
                                            <View style={styles.tagWrap}>
                                                {detailData.positions.map((pos: string, i: number) => (
                                                    <View key={i} style={styles.tag}>
                                                        <Text style={styles.tagText}>{pos}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                    {detailData.email && (
                                        <View style={styles.detailCard}>
                                            <Text style={styles.detailLabel}>Email</Text>
                                            <Text style={styles.detailValue}>{detailData.email}</Text>
                                        </View>
                                    )}
                                    {detailData.created_at && (
                                        <View style={styles.detailCard}>
                                            <Text style={styles.detailLabel}>Joined</Text>
                                            <Text style={styles.detailValue}>{formatDate(detailData.created_at)}</Text>
                                        </View>
                                    )}
                                    {detailData.modified_at && (
                                        <View style={styles.detailCard}>
                                            <Text style={styles.detailLabel}>Last Status Change</Text>
                                            <Text style={styles.detailValue}>{formatDate(detailData.modified_at)}</Text>
                                        </View>
                                    )}

                                    {/* Action button */}
                                    <TouchableOpacity
                                        style={[styles.modalActionBtn,
                                            detailData.status === 'Active' ? styles.btnDisableLarge : styles.btnEnableLarge
                                        ]}
                                        onPress={() =>
                                            Alert.alert(
                                                detailData.status === 'Active' ? 'Disable Account' : 'Enable Account',
                                                `${detailData.status === 'Active' ? 'Disable' : 'Enable'} ${detailData.full_name}?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: 'Confirm', onPress: async () => {
                                                            await toggleProfessional(detailData.uin, detailData.phone, detailData.status);
                                                            const newStatus = detailData.status === 'Active' ? 'Inactive' : 'Active';
                                                            setDetailData((d: any) => ({ ...d, status: newStatus }));
                                                            setSelectedItem((s: any) => ({ ...s, status: newStatus }));
                                                        }
                                                    },
                                                ]
                                            )
                                        }
                                    >
                                        <Text style={styles.modalActionText}>
                                            {detailData.status === 'Active' ? 'Disable Account' : 'Enable Account'}
                                        </Text>
                                    </TouchableOpacity>
                                </>)}

                                {selectedItem?._type === 'customers' && (
                                    <TouchableOpacity
                                        style={[styles.modalActionBtn,
                                            detailData.blocked ? styles.btnEnableLarge : styles.btnDisableLarge
                                        ]}
                                        onPress={() =>
                                            Alert.alert(
                                                detailData.blocked ? 'Unblock Customer' : 'Block Customer',
                                                `${detailData.blocked ? 'Unblock' : 'Block'} ${detailData.full_name}?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: 'Confirm', onPress: async () => {
                                                            await toggleCustomer(detailData.phone, detailData.blocked);
                                                            setDetailData((d: any) => ({ ...d, blocked: !d.blocked }));
                                                        }
                                                    },
                                                ]
                                            )
                                        }
                                    >
                                        <Text style={styles.modalActionText}>
                                            {detailData.blocked ? 'Unblock Customer' : 'Block Customer'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
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
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    toggleBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
    btnDisable: { backgroundColor: '#fee2e2' },
    btnEnable: { backgroundColor: '#dcfce7' },
    toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#1C2B2A' },
    empty: { alignItems: 'center', paddingVertical: hp('8%'), gap: 12 },
    emptyText: { fontSize: 15, color: '#9BBAB8', fontWeight: '500' },

    // Detail Modal
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
    modalAvatarRow: { alignItems: 'center', gap: 8, marginBottom: hp('2%') },
    modalAvatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#E8F4F3', alignItems: 'center', justifyContent: 'center',
    },
    modalAvatarText: { fontSize: 30, fontWeight: '800', color: '#295C59' },
    modalName: { fontSize: 20, fontWeight: '800', color: '#1C2B2A', textAlign: 'center' },

    detailCard: {
        backgroundColor: '#fff', borderRadius: 16,
        padding: wp('4%'), marginBottom: hp('1.2%'),
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    detailLabel: {
        fontSize: 11, fontWeight: '800', color: '#295C59',
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
    },
    detailValue: { fontSize: 15, fontWeight: '600', color: '#1C2B2A' },
    phoneLink: { textDecorationLine: 'underline', color: '#295C59', fontSize: 18, fontWeight: '700' },

    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tag: {
        backgroundColor: '#E8F4F3', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    tagText: { fontSize: 12, fontWeight: '600', color: '#295C59' },

    modalActionBtn: {
        borderRadius: 16, paddingVertical: hp('2%'),
        alignItems: 'center', marginTop: hp('1%'),
    },
    btnDisableLarge: { backgroundColor: '#fee2e2' },
    btnEnableLarge: { backgroundColor: '#dcfce7' },
    modalActionText: { fontSize: 15, fontWeight: '700', color: '#1C2B2A' },
});
