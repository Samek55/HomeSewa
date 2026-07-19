import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, ScrollView, Alert, DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

type HelpEntry = {
    id: string;
    ticket_no?: number;
    phone: string;
    created_at: string;
    modified_at?: string;
    status: 'open' | 'solved';
    issue?: string;
    reply?: string;
};

const formatDate = (iso: string) => {
    try {
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return '—'; }
};

const DURATIONS = ['Today', 'Yesterday', 'This Week', 'This Month', '3 Months', '6 Months', '1 Year', 'All'] as const;
type Duration = typeof DURATIONS[number];

const PAGE_SIZE = 15;

// Shared per-column layout so the header and body cells can never drift out of alignment.
const COL = {
    uid: { flex: 1.3 },
    phone: { flex: 2.1, marginLeft: wp('3%') },
    date: { flex: 1.5, textAlign: 'center' as const },
    status: { flex: 0.8, textAlign: 'center' as const },
};

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
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [entries, setEntries] = useState<HelpEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [duration, setDuration] = useState<Duration>('All');
    const [statusFilter, setStatusFilter] = useState<'All' | 'open' | 'solved'>('All');
    const [showDurationDrop, setShowDurationDrop] = useState(false);
    const [showStatusDrop, setShowStatusDrop] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        AsyncStorage.getItem('adminTable').then(table => {
            if (table !== 'admins') {
                Alert.alert('Access Denied', 'Admin access only.');
                router.back();
            }
        });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('helpbox')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setEntries(data as HelpEntry[]);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not load help requests.');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        const sub = DeviceEventEmitter.addListener(
            'helpbox:update',
            ({ id, status, modified_at, reply, issue }: { id: string; status: 'open' | 'solved'; modified_at?: string; reply?: string; issue?: string }) => {
                setEntries(prev => prev.map(e => e.id === id ? { ...e, status, modified_at, reply, issue } : e));
            }
        );
        return () => sub.remove();
    }, [load]);

    const filtered = useMemo(() => {
        let data = filterByDuration(entries, duration);
        if (statusFilter !== 'All') data = data.filter(e => e.status === statusFilter);
        if (search.trim()) data = data.filter(e => e.phone?.includes(search.trim()));
        return data;
    }, [entries, duration, statusFilter, search]);

    useEffect(() => {
        setPage(1);
    }, [duration, statusFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page]
    );

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
                    <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by phone number"
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                        keyboardType="number-pad"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
                            <Ionicons name={showDurationDrop ? 'chevron-up' : 'chevron-down'} size={16} color={colors.brand} />
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
                            <Ionicons name={showStatusDrop ? 'chevron-up' : 'chevron-down'} size={16} color={colors.brand} />
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
                        <ActivityIndicator size="large" color={colors.brand} />
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="chatbox-ellipses-outline" size={44} color={colors.border} />
                        <Text style={styles.emptyText}>No help requests found</Text>
                    </View>
                ) : (
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colHeader, COL.uid]}>UID</Text>
                            <Text style={[styles.colHeader, COL.phone]}>Phone</Text>
                            <Text style={[styles.colHeader, COL.date]}>Date</Text>
                            <Text style={[styles.colHeader, COL.status]}>Status</Text>
                        </View>

                        {paginated.map((item, idx) => {
                            const globalIdx = (page - 1) * PAGE_SIZE + idx;
                            return (
                                <TouchableOpacity
                                    key={`${item.phone}-${globalIdx}`}
                                    style={[styles.tableRow, globalIdx % 2 === 0 && styles.tableRowAlt]}
                                    onPress={() => router.push({
                                        pathname: '/admin/HelpBoxDetail',
                                        params: { entry: JSON.stringify(item) },
                                    } as any)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.cell, styles.uidCell, COL.uid]}>
                                        H{String(item.ticket_no ?? globalIdx + 1).padStart(4, '0')}
                                    </Text>
                                    <Text style={[styles.cell, COL.phone]} numberOfLines={1}>
                                        {item.phone}
                                    </Text>
                                    <Text style={[styles.cell, COL.date]} numberOfLines={1}>
                                        {item.created_at ? formatDate(item.created_at) : '—'}
                                    </Text>
                                    <View style={[{ flex: COL.status.flex }, styles.statusCell]}>
                                        {item.status === 'solved' ? (
                                            <Text style={styles.solvedText}>✓</Text>
                                        ) : (
                                            <Text style={styles.openText}>!?</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {!loading && filtered.length > 0 && (
                    <>
                        <Text style={styles.countText}>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</Text>

                        {totalPages > 1 && (
                            <View style={styles.paginationRow}>
                                <TouchableOpacity
                                    style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                                    onPress={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <Ionicons name="chevron-back" size={18} color={page === 1 ? colors.textMuted : colors.brand} />
                                </TouchableOpacity>

                                <Text style={styles.pageIndicator}>Page {page} of {totalPages}</Text>

                                <TouchableOpacity
                                    style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                                    onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    <Ionicons name="chevron-forward" size={18} color={page === totalPages ? colors.textMuted : colors.brand} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: hp('8%'), gap: 12 },
    emptyText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },

    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.brand,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
    },
    backBtn: { padding: 4, marginRight: wp('3%') },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
    refreshBtn: { padding: 4 },

    content: { flex: 1, paddingHorizontal: wp('4%'), paddingTop: hp('2%') },

    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.surface, borderRadius: 14,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('4%'), height: hp('6%'),
        marginBottom: hp('2%'),
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },

    filtersRow: { flexDirection: 'row', gap: wp('4%'), marginBottom: hp('2%') },
    filterGroup: { flex: 1 },
    filterLabel: {
        fontSize: 12, fontWeight: '700', color: colors.brand,
        marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4,
    },
    dropBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface, borderRadius: 12,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('3%'), paddingVertical: hp('1.2%'),
    },
    dropBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1 },
    dropMenu: {
        position: 'absolute', top: '100%', left: 0, right: 0,
        backgroundColor: colors.surface, borderRadius: 12,
        borderWidth: 1.5, borderColor: colors.border,
        marginTop: 4, zIndex: 999,
        elevation: 8, shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8,
    },
    dropItem: { paddingHorizontal: wp('3%'), paddingVertical: hp('1.3%') },
    dropItemActive: { backgroundColor: colors.surfaceMuted },
    dropItemText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    dropItemTextActive: { color: colors.brand, fontWeight: '700' },

    table: {
        backgroundColor: colors.surface, borderRadius: 16,
        overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
        marginTop: hp('1%'),
    },
    tableHeader: {
        flexDirection: 'row', backgroundColor: colors.brand,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.3%'),
    },
    colHeader: { fontSize: 12, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    tableRowAlt: { backgroundColor: colors.surfaceMuted },
    cell: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
    uidCell: { fontWeight: '700', letterSpacing: 0.5 },
    statusCell: { alignItems: 'center' },

    solvedText: {
        fontSize: 18, fontWeight: '800', color: colors.success,
    },
    openText: {
        fontSize: 15, fontWeight: '800', color: colors.warning,
    },

    countText: {
        textAlign: 'center', fontSize: 13, color: colors.textMuted,
        fontWeight: '500', marginTop: hp('2%'),
    },

    paginationRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: wp('4%'), marginTop: hp('1.5%'),
    },
    pageBtn: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    },
    pageBtnDisabled: { backgroundColor: colors.background, borderColor: colors.divider },
    pageIndicator: { fontSize: 13, fontWeight: '700', color: colors.brand, minWidth: wp('28%'), textAlign: 'center' },
});
