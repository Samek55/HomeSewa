import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';

type HelpEntry = {
    id: string;
    phone: string;
    created_at: string;
    modified_at?: string;
    status: 'open' | 'solved';
};

const formatDate = (iso: string) => {
    try {
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return '—'; }
};

const DURATIONS = ['Today', 'Yesterday', 'This Week', 'This Month', '3 Months', '6 Months', '1 Year', 'All'] as const;
type Duration = typeof DURATIONS[number];

function filterByDuration(data: HelpEntry[], duration: Duration): HelpEntry[] {
    if (duration === 'All') return data;
    // created_at may not exist in the table yet — skip date filtering if missing
    if (!data[0]?.created_at) return data;
    const now = new Date();
    const startOf = (unit: 'day' | 'week' | 'month') => {
        const d = new Date(now);
        if (unit === 'day') d.setHours(0, 0, 0, 0);
        else if (unit === 'week') { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); }
        else if (unit === 'month') { d.setHours(0, 0, 0, 0); d.setDate(1); }
        return d;
    };
    return data.filter(item => {
        if (!item.created_at) return true;
        const d = new Date(item.created_at);
        const todayStart = startOf('day');
        if (duration === 'Today') { const end = new Date(todayStart); end.setDate(end.getDate() + 1); return d >= todayStart && d < end; }
        if (duration === 'Yesterday') { const y = new Date(todayStart); y.setDate(y.getDate() - 1); return d >= y && d < todayStart; }
        if (duration === 'This Week') return d >= startOf('week');
        if (duration === 'This Month') return d >= startOf('month');
        if (duration === '3 Months') { const c = new Date(now); c.setMonth(c.getMonth() - 3); return d >= c; }
        if (duration === '6 Months') { const c = new Date(now); c.setMonth(c.getMonth() - 6); return d >= c; }
        if (duration === '1 Year') { const c = new Date(now); c.setFullYear(c.getFullYear() - 1); return d >= c; }
        return true;
    });
}

export default function HelpBox() {
    const [entries, setEntries] = useState<HelpEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [duration, setDuration] = useState<Duration>('All');
    const [statusFilter, setStatusFilter] = useState<'All' | 'open' | 'solved'>('All');
    const [showDurationDrop, setShowDurationDrop] = useState(false);
    const [showStatusDrop, setShowStatusDrop] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('helpbox')
                .select('*');
            if (error) throw error;
            if (data) setEntries(data as HelpEntry[]);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not load help requests.');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        let data = filterByDuration(entries, duration);
        if (statusFilter !== 'All') data = data.filter(e => e.status === statusFilter);
        if (search.trim()) data = data.filter(e => e.phone?.includes(search.trim()));
        return data;
    }, [entries, duration, statusFilter, search]);

    return (
        <View style={styles.screen}>
            <Header4 />


            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: hp('10%') }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* SEARCH */}
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={18} color="#9BBAB8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by phone number"
                        placeholderTextColor="#B0BEC5"
                        value={search}
                        onChangeText={setSearch}
                        keyboardType="number-pad"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color="#B0BEC5" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* FILTERS */}
                <View style={styles.filtersRow}>
                    {/* Duration */}
                    <View style={[styles.filterGroup, { zIndex: 20 }]}>
                        <Text style={styles.filterLabel}>Duration</Text>
                        <TouchableOpacity
                            style={styles.dropBtn}
                            onPress={() => { setShowDurationDrop(v => !v); setShowStatusDrop(false); }}
                        >
                            <Text style={styles.dropBtnText}>{duration}</Text>
                            <Ionicons name={showDurationDrop ? 'chevron-up' : 'chevron-down'} size={16} color="#295C59" />
                        </TouchableOpacity>
                        {showDurationDrop && (
                            <View style={styles.dropMenu}>
                                {DURATIONS.map(d => (
                                    <TouchableOpacity
                                        key={d}
                                        style={[styles.dropItem, duration === d && styles.dropItemActive]}
                                        onPress={() => { setDuration(d); setShowDurationDrop(false); }}
                                    >
                                        <Text style={[styles.dropItemText, duration === d && styles.dropItemTextActive]}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Status */}
                    <View style={[styles.filterGroup, { zIndex: 20 }]}>
                        <Text style={styles.filterLabel}>Status</Text>
                        <TouchableOpacity
                            style={styles.dropBtn}
                            onPress={() => { setShowStatusDrop(v => !v); setShowDurationDrop(false); }}
                        >
                            <Text style={styles.dropBtnText}>
                                {statusFilter === 'All' ? 'All' : statusFilter === 'solved' ? 'Solved' : 'Open'}
                            </Text>
                            <Ionicons name={showStatusDrop ? 'chevron-up' : 'chevron-down'} size={16} color="#295C59" />
                        </TouchableOpacity>
                        {showStatusDrop && (
                            <View style={styles.dropMenu}>
                                {(['All', 'open', 'solved'] as const).map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.dropItem, statusFilter === s && styles.dropItemActive]}
                                        onPress={() => { setStatusFilter(s); setShowStatusDrop(false); }}
                                    >
                                        <Text style={[styles.dropItemText, statusFilter === s && styles.dropItemTextActive]}>
                                            {s === 'All' ? 'All' : s === 'solved' ? 'Solved' : 'Open'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {/* TABLE */}
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#295C59" />
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="chatbox-ellipses-outline" size={44} color="#D6E8E7" />
                        <Text style={styles.emptyText}>No help requests found</Text>
                    </View>
                ) : (
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colHeader, { flex: 0.6 }]}>UID</Text>
                            <Text style={[styles.colHeader, { flex: 1.8 }]}>Phone</Text>
                            <Text style={[styles.colHeader, { flex: 1.4, textAlign: 'center' }]}>Date</Text>
                            <Text style={[styles.colHeader, { flex: 0.8, textAlign: 'center' }]}>Status</Text>
                        </View>

                        {filtered.map((item, idx) => (
                            <TouchableOpacity
                                key={`${item.phone}-${idx}`}
                                style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}
                                onPress={() => router.push({
                                    pathname: '/admin/HelpBoxDetail',
                                    params: { entry: JSON.stringify(item) },
                                } as any)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.cell, { flex: 0.6 }]} numberOfLines={1}>
                                    {idx + 1}
                                </Text>
                                <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>
                                    {item.phone}
                                </Text>
                                <Text style={[styles.cell, { flex: 1.4, textAlign: 'center' }]} numberOfLines={1}>
                                    {item.created_at ? formatDate(item.created_at) : '—'}
                                </Text>
                                <View style={{ flex: 0.8, alignItems: 'center' }}>
                                    {item.status === 'solved' ? (
                                        <Text style={styles.solvedText}>✓</Text>
                                    ) : (
                                        <Text style={styles.openText}>!?</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {!loading && filtered.length > 0 && (
                    <Text style={styles.countText}>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F9F8' },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: hp('8%'), gap: 12 },
    emptyText: { fontSize: 15, color: '#9BBAB8', fontWeight: '500' },

    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#295C59',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
    },
    backBtn: { padding: 4, marginRight: wp('3%') },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
    refreshBtn: { padding: 4 },

    content: { flex: 1, paddingHorizontal: wp('4%'), paddingTop: hp('2%') },

    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('4%'), height: hp('6%'),
        marginBottom: hp('2%'),
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1C2B2A', fontWeight: '500' },

    filtersRow: { flexDirection: 'row', gap: wp('4%'), marginBottom: hp('2%') },
    filterGroup: { flex: 1 },
    filterLabel: {
        fontSize: 12, fontWeight: '700', color: '#295C59',
        marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4,
    },
    dropBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('3%'), paddingVertical: hp('1.2%'),
    },
    dropBtnText: { fontSize: 14, fontWeight: '600', color: '#1C2B2A', flex: 1 },
    dropMenu: {
        position: 'absolute', top: '100%', left: 0, right: 0,
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        marginTop: 4, zIndex: 999,
        elevation: 8, shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8,
    },
    dropItem: { paddingHorizontal: wp('3%'), paddingVertical: hp('1.3%') },
    dropItemActive: { backgroundColor: '#E8F4F3' },
    dropItemText: { fontSize: 14, fontWeight: '500', color: '#1C2B2A' },
    dropItemTextActive: { color: '#295C59', fontWeight: '700' },

    table: {
        backgroundColor: '#fff', borderRadius: 16,
        overflow: 'hidden', borderWidth: 1, borderColor: '#E8F4F3',
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
        marginTop: hp('1%'),
    },
    tableHeader: {
        flexDirection: 'row', backgroundColor: '#295C59',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.3%'),
    },
    colHeader: { fontSize: 12, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
        borderBottomWidth: 1, borderBottomColor: '#F0F7F6',
    },
    tableRowAlt: { backgroundColor: '#FAFEFE' },
    cell: { fontSize: 13, fontWeight: '500', color: '#1C2B2A' },

    solvedText: {
        fontSize: 18, fontWeight: '800', color: '#22c55e',
    },
    openText: {
        fontSize: 15, fontWeight: '800', color: '#f59e0b',
    },

    countText: {
        textAlign: 'center', fontSize: 13, color: '#9BBAB8',
        fontWeight: '500', marginTop: hp('2%'),
    },
});
