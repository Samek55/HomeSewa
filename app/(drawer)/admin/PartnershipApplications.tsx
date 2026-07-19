import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, TextInput, FlatList, Modal, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

type Partnership = {
    partner_id: number;
    display_id?: string | null;
    full_name: string;
    phone_number: string;
    email: string | null;
    name_of_organisation: string | null;
    city: string | null;
    number_of_employees: number | null;
    business_type: string | null;
    partnership_interests: string | null;
    how_did_you_hear: string | null;
    message: string | null;
    services: string[] | null;
    company_photos: string | null;
    company_reg_certs: string | null;
};

const PAGE_SIZE = 15;

const parseUrls = (raw: string | null): string[] => {
    if (!raw) return [];
    try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; }
    catch { return []; }
};

export default function PartnershipApplications() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [partners, setPartners] = useState<Partnership[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Partnership | null>(null);

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
        try {
            const { data, error } = await supabase
                .from('partnership')
                .select('*')
                .order('partner_id', { ascending: false });
            if (error) throw error;
            setPartners(data || []);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not load partnership applications.');
        }
        setLoading(false);
    }, []);

    useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin, load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return partners;
        return partners.filter(p =>
            p.full_name?.toLowerCase().includes(q) ||
            p.phone_number?.includes(q) ||
            p.name_of_organisation?.toLowerCase().includes(q) ||
            p.display_id?.toLowerCase().includes(q)
        );
    }, [partners, search]);

    useEffect(() => { setPage(1); }, [search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const idFor = (p: Partnership) => p.display_id || `P${p.partner_id}`;

    if (!isSuperAdmin) return null;

    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Partnership Applications</Text>
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, phone, or organisation"
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.brand} style={{ marginTop: hp('5%') }} />
            ) : (
                <FlatList
                    data={paginated}
                    keyExtractor={item => String(item.partner_id)}
                    contentContainerStyle={{ paddingHorizontal: wp('4%'), paddingBottom: hp('10%') }}
                    ListFooterComponent={totalPages > 1 ? (
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
                    ) : null}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={44} color={colors.border} />
                            <Text style={styles.emptyText}>No partnership applications found</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.75}>
                            <View style={styles.cardLeft}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{(item.full_name || '?')[0].toUpperCase()}</Text>
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.name}>{item.full_name || 'Unknown'}</Text>
                                    <Text style={styles.sub}>+977 {item.phone_number}</Text>
                                    <Text style={styles.sub} numberOfLines={1}>
                                        {item.name_of_organisation || 'No organisation'} · {item.city || '—'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.idPill}>
                                <Text style={styles.idPillText}>{idFor(item)}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* ── Detail Modal ── */}
            <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.handleBar} />
                        <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
                            <Ionicons name="close" size={22} color={colors.brand} />
                        </TouchableOpacity>

                        {selected && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: hp('4%') + insets.bottom }}>
                                <View style={styles.modalAvatarRow}>
                                    <View style={styles.modalAvatar}>
                                        <Text style={styles.modalAvatarText}>{(selected.full_name || '?')[0].toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.modalName}>{selected.full_name}</Text>
                                    <View style={styles.idPillLarge}>
                                        <Text style={styles.idPillText}>{idFor(selected)}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailCard}>
                                    <Text style={styles.detailLabel}>Phone Number</Text>
                                    <TouchableOpacity onPress={() => Linking.openURL(`tel:+977${selected.phone_number}`)}>
                                        <Text style={[styles.detailValue, styles.phoneLink]}>+977 {selected.phone_number}</Text>
                                    </TouchableOpacity>
                                </View>

                                {selected.email && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Email</Text>
                                        <Text style={styles.detailValue}>{selected.email}</Text>
                                    </View>
                                )}

                                {selected.name_of_organisation && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Organisation</Text>
                                        <Text style={styles.detailValue}>{selected.name_of_organisation}</Text>
                                    </View>
                                )}

                                <View style={styles.detailCard}>
                                    <Text style={styles.detailLabel}>City</Text>
                                    <Text style={styles.detailValue}>{selected.city || '—'}</Text>
                                </View>

                                {selected.business_type && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Business Type</Text>
                                        <Text style={styles.detailValue}>{selected.business_type}</Text>
                                    </View>
                                )}

                                {selected.number_of_employees != null && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Number of Employees</Text>
                                        <Text style={styles.detailValue}>{selected.number_of_employees}</Text>
                                    </View>
                                )}

                                {selected.partnership_interests && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Partnership Interest</Text>
                                        <Text style={styles.detailValue}>{selected.partnership_interests}</Text>
                                    </View>
                                )}

                                {(selected.services?.length ?? 0) > 0 && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Services</Text>
                                        <View style={styles.tagWrap}>
                                            {selected.services!.map((s, i) => (
                                                <View key={i} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {selected.how_did_you_hear && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>How They Heard About Us</Text>
                                        <Text style={styles.detailValue}>{selected.how_did_you_hear}</Text>
                                    </View>
                                )}

                                {selected.message && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Message</Text>
                                        <Text style={styles.detailValue}>{selected.message}</Text>
                                    </View>
                                )}

                                {parseUrls(selected.company_photos).length > 0 && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Company Photos</Text>
                                        {parseUrls(selected.company_photos).map((url, i) => (
                                            <TouchableOpacity key={i} onPress={() => Linking.openURL(url)}>
                                                <Text style={[styles.detailValue, styles.phoneLink]}>Photo {i + 1}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {parseUrls(selected.company_reg_certs).length > 0 && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailLabel}>Registration Certificates</Text>
                                        {parseUrls(selected.company_reg_certs).map((url, i) => (
                                            <TouchableOpacity key={i} onPress={() => Linking.openURL(url)}>
                                                <Text style={[styles.detailValue, styles.phoneLink]}>Certificate {i + 1}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.brand,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'), gap: wp('3%'),
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 },

    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.surface, margin: wp('4%'), marginBottom: wp('2%'),
        borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('4%'), height: hp('5.5%'),
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },

    card: {
        backgroundColor: colors.surface, borderRadius: 16,
        padding: wp('3.5%'), marginBottom: hp('1.2%'),
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: wp('3%') },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '800', color: colors.brand },
    cardInfo: { flex: 1 },
    name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    sub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    idPill: { backgroundColor: colors.surfaceMuted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    idPillLarge: { backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 6 },
    idPillText: { fontSize: 12, fontWeight: '800', color: colors.brand },

    empty: { alignItems: 'center', paddingVertical: hp('8%'), gap: 12 },
    emptyText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },

    paginationRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: wp('4%'), marginTop: hp('1%'), marginBottom: hp('2%'),
    },
    pageBtn: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    },
    pageBtnDisabled: { backgroundColor: colors.background, borderColor: colors.divider },
    pageIndicator: { fontSize: 13, fontWeight: '700', color: colors.brand, minWidth: wp('28%'), textAlign: 'center' },

    // Detail Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: wp('5%'), paddingTop: hp('1.5%'), maxHeight: hp('88%'),
    },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: hp('1%') },
    modalClose: { alignSelf: 'flex-end', padding: 6, backgroundColor: colors.surfaceMuted, borderRadius: 20, marginBottom: hp('1%') },
    modalAvatarRow: { alignItems: 'center', gap: 8, marginBottom: hp('2%') },
    modalAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    modalAvatarText: { fontSize: 30, fontWeight: '800', color: colors.brand },
    modalName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },

    detailCard: {
        backgroundColor: colors.surface, borderRadius: 16,
        padding: wp('4%'), marginBottom: hp('1.2%'),
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    detailLabel: { fontSize: 11, fontWeight: '800', color: colors.brand, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
    detailValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    phoneLink: { textDecorationLine: 'underline', color: colors.brand },

    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tag: { backgroundColor: colors.surfaceMuted, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    tagText: { fontSize: 12, fontWeight: '600', color: colors.brand },
});
