import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, TextInput, FlatList, RefreshControl,
    Modal, ScrollView, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import Header4 from '@/components/Header4Admin';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Professional = {
    id: number;
    full_name: string;
    phone: string;
    positions: string[];
    preferred_city: string;
    status: string;
    modified_at?: string;
    created_at?: string;
};

type Customer = {
    phone: string;
    full_name: string;
    blocked: boolean;
    city?: string;
    area?: string;
};

type AdminAccount = {
    id: number;
    full_name: string;
    phone: string;
    role: string;
    status: string;
    allowed_cities?: string[] | null;
};

const CITIES = ['Kathmandu', 'Bhaktapur', 'Lalitpur'];

// `professional` is the source of truth for who actually has login access —
// it's what Professional Verification promotes an applicant into once
// approved. `workforce` holds the richer profile (services, working areas)
// but includes ~180 legacy migrated rows that were never verified/never had
// login credentials, so it must not be used to decide who shows up here.
const normalizePhone = (raw: string) => {
    if (!raw) return raw;
    const digits = String(raw).replace(/\D/g, '');
    return digits.length > 10 && digits.startsWith('977') ? digits.slice(-10) : digits;
};

const isPendingStatus = (status: string) => /pending|waiting/i.test(status || '');

const PAGE_SIZE = 15;

function FilterDropdown({ label, value, options, isOpen, onToggle, onChange, zIndex }: {
    label: string;
    value: string;
    options: string[];
    isOpen: boolean;
    onToggle: () => void;
    onChange: (v: string) => void;
    zIndex: number;
}) {
    return (
        <View style={[styles.filterGroup, { zIndex }]}>
            <Text style={styles.filterLabel}>{label}</Text>
            <TouchableOpacity style={styles.dropBtn} onPress={onToggle} activeOpacity={0.8}>
                <Text style={styles.dropBtnText} numberOfLines={1}>{value}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#295C59" />
            </TouchableOpacity>
            {isOpen && (
                <ScrollView style={styles.dropMenu} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {options.map(opt => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.dropItem, value === opt && styles.dropItemActive]}
                            onPress={() => onChange(opt)}
                        >
                            <Text style={[styles.dropItemText, value === opt && styles.dropItemTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

function CitySelector({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
    const allSelected = selected.length === 0;
    return (
        <View style={styles.cityChipsWrap}>
            <TouchableOpacity
                style={[styles.cityChip, allSelected && styles.cityChipActive]}
                onPress={() => onChange([])}
            >
                <Text style={[styles.cityChipText, allSelected && styles.cityChipTextActive]}>All Cities</Text>
            </TouchableOpacity>
            {CITIES.map(c => {
                const active = selected.includes(c);
                return (
                    <TouchableOpacity
                        key={c}
                        style={[styles.cityChip, active && styles.cityChipActive]}
                        onPress={() => onChange(active ? selected.filter(x => x !== c) : [...selected, c])}
                    >
                        <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export default function UserManagement() {
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState<'professionals' | 'customers' | 'admins'>('professionals');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [admins, setAdmins] = useState<AdminAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isSuperAdminRole, setIsSuperAdminRole] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [detailData, setDetailData] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Filters
    const [cityFilter, setCityFilter] = useState('All');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [customerCityFilter, setCustomerCityFilter] = useState('All');
    const [customerAreaFilter, setCustomerAreaFilter] = useState('All');
    const [openFilter, setOpenFilter] = useState<'city' | 'service' | 'area' | null>(null);
    const [page, setPage] = useState(1);

    // Add Admin form
    const [showAddAdmin, setShowAddAdmin] = useState(false);
    const [newAdminName, setNewAdminName] = useState('');
    const [newAdminPhone, setNewAdminPhone] = useState('');
    const [newAdminPin, setNewAdminPin] = useState('');
    const [addingAdmin, setAddingAdmin] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<{ type: 'professional' | 'customer'; full_name: string; phone: string }[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [pickedUserType, setPickedUserType] = useState<'professional' | 'customer' | null>(null);
    const [newAdminCities, setNewAdminCities] = useState<string[]>([]); // empty = all cities

    // Edit an existing admin's city access
    const [editingCitiesAdmin, setEditingCitiesAdmin] = useState<AdminAccount | null>(null);
    const [editCitiesSelection, setEditCitiesSelection] = useState<string[]>([]);
    const [savingCities, setSavingCities] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('adminTable').then(table => {
            if (table !== 'admins') {
                Alert.alert('Access Denied', 'Admin access only.');
                router.back();
                return;
            }
            setIsSuperAdmin(true);
        });
        // Only Super Admin (not plain Admin) can manage other Admin accounts.
        AsyncStorage.getItem('adminRole').then(role => setIsSuperAdminRole(role === 'super_admin'));
    }, []);

    const loadProfessionals = useCallback(async () => {
        setLoading(true);
        const { data: proRows } = await supabase
            .from('professional')
            .select('id, full_name, phone, status, created_at, modified_at')
            .neq('status', 'Pending')
            .order('full_name');

        if (!proRows) { setProfessionals([]); setLoading(false); return; }

        // Best-effort enrichment with profile info (services/city) from workforce.
        const { data: wfRows } = await supabase
            .from('workforce')
            .select('phone, services, preferred_city');
        const wfByPhone = new Map<string, any>();
        (wfRows || []).forEach(w => wfByPhone.set(normalizePhone(w.phone), w));

        setProfessionals(proRows.map(a => {
            const wf = wfByPhone.get(normalizePhone(a.phone));
            return {
                ...a,
                phone: normalizePhone(a.phone),
                positions: wf?.services || [],
                preferred_city: wf?.preferred_city || '—',
            };
        }));
        setLoading(false);
    }, []);

    const loadCustomers = useCallback(async () => {
        setLoading(true);
        // Ordered so the Map dedupe below keeps each customer's most recent booking
        // (and therefore their most recent city/area) rather than an arbitrary one.
        const { data: bookings } = await supabase
            .from('booking')
            .select('full_name, phone, city, area')
            .order('service_booking_datetime', { ascending: false });
        const { data: blocked } = await supabase.from('blocked_customers').select('phone');
        const blockedPhones = new Set((blocked || []).map((b: any) => b.phone));
        const unique = [...new Map((bookings || []).map((item: any) => [item.phone, item])).values()];
        setCustomers(unique.map((c: any) => ({ ...c, blocked: blockedPhones.has(c.phone) })));
        setLoading(false);
    }, []);

    const loadAdmins = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('admin')
            .select('id, full_name, phone, role, status, allowed_cities')
            .in('role', ['admin', 'super_admin'])
            .order('full_name');
        setAdmins(data || []);
        setLoading(false);
    }, []);

    // Reload whenever the screen is focused OR the tab changes
    useFocusEffect(
        useCallback(() => {
            if (!isSuperAdmin) return;
            if (tab === 'professionals') loadProfessionals();
            else if (tab === 'customers') loadCustomers();
            else loadAdmins();
        }, [tab, isSuperAdmin])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (tab === 'professionals') await loadProfessionals();
        else if (tab === 'customers') await loadCustomers();
        else await loadAdmins();
        setRefreshing(false);
    }, [tab]);

    // Realtime: reflect Supabase deletions/updates instantly in the UI
    useEffect(() => {
        if (!isSuperAdmin) return;

        // Clear any stale channel left over from a Fast Refresh / remount —
        // calling .on() on an already-subscribed channel throws at runtime.
        const stale = supabase.getChannels().find(c => c.topic === 'realtime:um-changes');
        if (stale) supabase.removeChannel(stale);

        const channel = supabase
            .channel('um-changes')
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'professional' },
                (payload) => {
                    if (payload.old?.id) {
                        setProfessionals(prev => prev.filter(p => p.id !== payload.old.id));
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'professional' },
                (payload) => {
                    if (payload.new?.id) {
                        setProfessionals(prev => prev.map(p =>
                            p.id === payload.new.id
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
                .or(`phone.eq.${item.phone},phone.eq.977${item.phone}`)
                .maybeSingle();
            setDetailData(data
                ? {
                    ...data,
                    positions: data.services || [],
                    preferred_city: data.preferred_city || '—',
                    ...item, // professional table fields (full_name, phone, status, id) are the source of truth
                }
                : item);
            setLoadingDetail(false);
        } else {
            setDetailData(item);
        }
    };

    const closeDetail = () => { setSelectedItem(null); setDetailData(null); };

    const toggleProfessional = async (id: number, phone: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        const now = new Date().toISOString();
        const { error } = await supabase.from('professional').update({ status: newStatus, modified_at: now }).eq('id', id);
        if (error) return Alert.alert('Error', error.message);
        await supabase.from('workforce').update({ profile_status: newStatus, updated_at: now })
            .or(`phone.eq.${phone},phone.eq.977${phone}`);
        setProfessionals(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, modified_at: now } : p));
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

    const toggleAdmin = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        const { error } = await supabase.from('admin').update({ status: newStatus }).eq('id', id);
        if (error) return Alert.alert('Error', error.message);
        setAdmins(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    };

    const openEditCities = (account: AdminAccount) => {
        setEditingCitiesAdmin(account);
        setEditCitiesSelection(account.allowed_cities || []);
    };

    const saveEditCities = async () => {
        if (!editingCitiesAdmin) return;
        setSavingCities(true);
        const cities = editCitiesSelection.length > 0 ? editCitiesSelection : null;
        const { data: updated, error } = await supabase
            .from('admin')
            .update({ allowed_cities: cities })
            .eq('id', editingCitiesAdmin.id)
            .select();
        setSavingCities(false);
        if (error) return Alert.alert('Error', error.message);
        if (!updated || updated.length === 0) return Alert.alert('Error', 'No admin record matched.');
        setAdmins(prev => prev.map(a => a.id === editingCitiesAdmin.id ? { ...a, allowed_cities: cities } : a));
        setEditingCitiesAdmin(null);
    };

    // Debounced phone lookup across Professionals and Customers, so a super admin can
    // find an existing user and pre-fill the Add Admin form instead of retyping their
    // details from memory.
    useEffect(() => {
        const digits = userSearchQuery.replace(/\D/g, '');
        if (digits.length < 3) { setUserSearchResults([]); return; }

        let cancelled = false;
        setSearchingUsers(true);
        const timer = setTimeout(async () => {
            const [{ data: proRows }, { data: bookingRows }] = await Promise.all([
                supabase.from('professional').select('full_name, phone').ilike('phone', `%${digits}%`).limit(5),
                supabase.from('booking').select('full_name, phone').ilike('phone', `%${digits}%`).limit(5),
            ]);
            if (cancelled) return;
            const results: { type: 'professional' | 'customer'; full_name: string; phone: string }[] = [
                ...(proRows || []).map(p => ({ type: 'professional' as const, full_name: p.full_name, phone: normalizePhone(p.phone) })),
                ...[...new Map((bookingRows || []).map((b: any) => [normalizePhone(b.phone), b])).values()]
                    .map((b: any) => ({ type: 'customer' as const, full_name: b.full_name, phone: normalizePhone(b.phone) })),
            ];
            setUserSearchResults(results);
            setSearchingUsers(false);
        }, 350);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [userSearchQuery]);

    const pickSearchResult = (r: { type: 'professional' | 'customer'; full_name: string; phone: string }) => {
        setNewAdminName(r.full_name || '');
        setNewAdminPhone(r.phone);
        setPickedUserType(r.type);
        setUserSearchQuery('');
        setUserSearchResults([]);
    };

    const handleAddAdmin = async () => {
        const cleanPhone = newAdminPhone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) return Alert.alert('Validation', 'Enter a valid 10-digit phone number.');

        setAddingAdmin(true);
        try {
            // Professionals live in their own table now, so promoting one to Admin
            // means moving the row across tables, not just flipping a role field.
            const [{ data: existingAdmin }, { data: existingPro }] = await Promise.all([
                supabase.from('admin').select('id').eq('phone', cleanPhone).maybeSingle(),
                supabase.from('professional').select('id, full_name, pin').eq('phone', cleanPhone).maybeSingle(),
            ]);

            if (existingAdmin) {
                Alert.alert('Already an Admin', 'This phone number already has Admin access.');
                return;
            }

            const citiesToSave = newAdminCities.length > 0 ? newAdminCities : null;

            if (existingPro) {
                const { error: insertErr } = await supabase.from('admin').insert([{
                    full_name: existingPro.full_name,
                    phone: cleanPhone,
                    pin: existingPro.pin,
                    role: 'admin',
                    status: 'Active',
                    allowed_cities: citiesToSave,
                }]);
                if (insertErr) throw insertErr;
                const { error: deleteErr } = await supabase.from('professional').delete().eq('id', existingPro.id);
                if (deleteErr) throw deleteErr;
                // Their workforce profile stays behind and would otherwise keep matching
                // "profile_status = Active" lead-notification queries even though they're an Admin now.
                await supabase.from('workforce').update({ profile_status: 'Inactive' }).eq('phone', cleanPhone);
                Alert.alert('Promoted', 'Existing Professional account upgraded to Admin.');
            } else {
                if (!newAdminName.trim()) { Alert.alert('Validation', 'Enter a full name.'); return; }
                if (newAdminPin.length !== 4) { Alert.alert('Validation', 'Enter a 4-digit PIN.'); return; }
                const { error } = await supabase.from('admin').insert([{
                    full_name: newAdminName.trim(),
                    phone: cleanPhone,
                    pin: newAdminPin,
                    role: 'admin',
                    status: 'Active',
                    allowed_cities: citiesToSave,
                }]);
                if (error) throw error;
                Alert.alert('Added', 'New Admin account created.');
            }

            setShowAddAdmin(false);
            setNewAdminName('');
            setNewAdminPhone('');
            setNewAdminPin('');
            setNewAdminCities([]);
            setUserSearchQuery('');
            setUserSearchResults([]);
            setPickedUserType(null);
            loadAdmins();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Could not save.');
        } finally {
            setAddingAdmin(false);
        }
    };

    const professionalCities = [...new Set(professionals.map(p => p.preferred_city).filter(c => c && c !== '—'))].sort();
    const professionalServices = [...new Set(professionals.flatMap(p => p.positions || []))].sort();
    const customerCities = [...new Set(customers.map(c => c.city).filter((c): c is string => !!c))].sort();
    const customerAreas = [...new Set(customers.map(c => c.area).filter((a): a is string => !!a))].sort();

    const filteredProfessionals = professionals.filter(p =>
        (p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)) &&
        (cityFilter === 'All' || p.preferred_city === cityFilter) &&
        (serviceFilter === 'All' || (p.positions || []).includes(serviceFilter))
    );
    const filteredCustomers = customers.filter(c =>
        (c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)) &&
        (customerCityFilter === 'All' || c.city === customerCityFilter) &&
        (customerAreaFilter === 'All' || c.area === customerAreaFilter)
    );
    const filteredAdmins = admins.filter(a =>
        a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.phone?.includes(search)
    );

    const currentList = tab === 'professionals' ? filteredProfessionals : tab === 'customers' ? filteredCustomers : filteredAdmins;
    const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
    const paginatedList = currentList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [tab, search, cityFilter, serviceFilter, customerCityFilter, customerAreaFilter]);

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
                {(isSuperAdminRole
                    ? (['professionals', 'customers', 'admins'] as const)
                    : (['professionals', 'customers'] as const)
                ).map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, tab === t && styles.tabActive]}
                        onPress={() => {
                            setTab(t); setSearch('');
                            setCityFilter('All'); setServiceFilter('All');
                            setCustomerCityFilter('All'); setCustomerAreaFilter('All');
                            setOpenFilter(null);
                        }}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t === 'professionals' ? 'Professionals' : t === 'customers' ? 'Customers' : 'Admins'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'admins' && (
                <TouchableOpacity style={styles.addAdminBtn} onPress={() => setShowAddAdmin(true)} activeOpacity={0.85}>
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.addAdminBtnText}>Add Admin</Text>
                </TouchableOpacity>
            )}

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

            {tab !== 'admins' && (
                <View style={styles.filtersRow}>
                    {tab === 'professionals' ? (
                        <>
                            <FilterDropdown
                                label="City" value={cityFilter} options={['All', ...professionalCities]}
                                isOpen={openFilter === 'city'} onToggle={() => setOpenFilter(f => f === 'city' ? null : 'city')}
                                onChange={(v) => { setCityFilter(v); setOpenFilter(null); }} zIndex={30}
                            />
                            <FilterDropdown
                                label="Service" value={serviceFilter} options={['All', ...professionalServices]}
                                isOpen={openFilter === 'service'} onToggle={() => setOpenFilter(f => f === 'service' ? null : 'service')}
                                onChange={(v) => { setServiceFilter(v); setOpenFilter(null); }} zIndex={20}
                            />
                        </>
                    ) : (
                        <>
                            <FilterDropdown
                                label="City" value={customerCityFilter} options={['All', ...customerCities]}
                                isOpen={openFilter === 'city'} onToggle={() => setOpenFilter(f => f === 'city' ? null : 'city')}
                                onChange={(v) => { setCustomerCityFilter(v); setOpenFilter(null); }} zIndex={30}
                            />
                            <FilterDropdown
                                label="Area" value={customerAreaFilter} options={['All', ...customerAreas]}
                                isOpen={openFilter === 'area'} onToggle={() => setOpenFilter(f => f === 'area' ? null : 'area')}
                                onChange={(v) => { setCustomerAreaFilter(v); setOpenFilter(null); }} zIndex={20}
                            />
                        </>
                    )}
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#295C59" style={{ marginTop: hp('5%') }} />
            ) : (
                <FlatList
                    data={paginatedList as any[]}
                    keyExtractor={(item: any) => String(item.id ?? item.phone)}
                    contentContainerStyle={{ paddingHorizontal: wp('4%'), paddingBottom: hp('10%') }}
                    ListFooterComponent={totalPages > 1 ? (
                        <View style={styles.paginationRow}>
                            <TouchableOpacity
                                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                                onPress={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <Ionicons name="chevron-back" size={18} color={page === 1 ? '#B9CFCD' : '#295C59'} />
                            </TouchableOpacity>
                            <Text style={styles.pageIndicator}>Page {page} of {totalPages}</Text>
                            <TouchableOpacity
                                style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <Ionicons name="chevron-forward" size={18} color={page === totalPages ? '#B9CFCD' : '#295C59'} />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#295C59']}
                            tintColor="#295C59"
                        />
                    }
                    renderItem={({ item }: any) => tab === 'admins' ? (
                        <View style={styles.card}>
                            <View style={styles.cardLeft}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{(item.full_name || '?')[0].toUpperCase()}</Text>
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.name}>{item.full_name || 'Unknown'}</Text>
                                    <Text style={styles.sub}>+977 {item.phone}</Text>
                                    <Text style={styles.sub}>{item.role === 'super_admin' ? 'Super Admin' : 'Admin'}</Text>
                                    {item.role !== 'super_admin' && (
                                        <Text style={styles.sub} numberOfLines={1}>
                                            {item.allowed_cities?.length ? `Cities: ${item.allowed_cities.join(', ')}` : 'All Cities'}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.cardRight}>
                                <View style={[styles.statusPill, item.status === 'Active' ? styles.pillActive : styles.pillInactive]}>
                                    <Text style={[styles.statusText, { color: item.status === 'Active' ? '#16a34a' : '#ef4444' }]}>
                                        {item.status}
                                    </Text>
                                </View>
                                {item.role !== 'super_admin' && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, styles.btnCities]}
                                            onPress={() => openEditCities(item)}
                                        >
                                            <Text style={styles.toggleBtnText}>Cities</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, item.status === 'Active' ? styles.btnDisable : styles.btnEnable]}
                                            onPress={() => Alert.alert(
                                                item.status === 'Active' ? 'Disable Admin' : 'Enable Admin',
                                                `${item.status === 'Active' ? 'Disable' : 'Enable'} ${item.full_name}?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Confirm', onPress: () => toggleAdmin(item.id, item.status) },
                                                ]
                                            )}
                                        >
                                            <Text style={styles.toggleBtnText}>{item.status === 'Active' ? 'Disable' : 'Enable'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
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
                                    <View style={[styles.statusPill, item.status === 'Active' ? styles.pillActive : isPendingStatus(item.status) ? styles.pillPending : styles.pillInactive]}>
                                        <Text style={[styles.statusText, { color: item.status === 'Active' ? '#16a34a' : isPendingStatus(item.status) ? '#d97706' : '#ef4444' }]}>
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
                                                        { text: 'Confirm', onPress: () => toggleProfessional(item.id, item.phone, item.status) },
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
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: hp('4%') + insets.bottom }}>

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
                                            : isPendingStatus(detailData.status) ? styles.pillPending
                                            : styles.pillInactive
                                        ]}>
                                            <Text style={[styles.statusText, {
                                                color: detailData.status === 'Active' ? '#16a34a'
                                                    : isPendingStatus(detailData.status) ? '#d97706' : '#ef4444'
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
                                                            await toggleProfessional(detailData.id, detailData.phone, detailData.status);
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

            {/* ── Add Admin Modal ── */}
            <Modal
                visible={showAddAdmin}
                animationType="slide"
                transparent
                onRequestClose={() => setShowAddAdmin(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.handleBar} />
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => {
                                setShowAddAdmin(false);
                                setUserSearchQuery(''); setUserSearchResults([]); setPickedUserType(null);
                                setNewAdminCities([]);
                            }}
                        >
                            <Ionicons name="close" size={22} color="#295C59" />
                        </TouchableOpacity>

                        <Text style={styles.modalName}>Add Admin</Text>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ marginTop: hp('2%'), paddingBottom: hp('2%') + insets.bottom }}
                        >
                            <Text style={styles.detailLabel}>Find Existing Professional or Customer</Text>
                            <View style={styles.userSearchBox}>
                                <Ionicons name="search-outline" size={16} color="#9BBAB8" />
                                <TextInput
                                    style={styles.userSearchInput}
                                    value={userSearchQuery}
                                    onChangeText={t => { setUserSearchQuery(t); setPickedUserType(null); }}
                                    placeholder="Search by phone number"
                                    placeholderTextColor="#B0BEC5"
                                    keyboardType="number-pad"
                                />
                                {searchingUsers && <ActivityIndicator size="small" color="#295C59" />}
                            </View>
                            {userSearchResults.length > 0 && (
                                <View style={styles.userSearchResults}>
                                    {userSearchResults.map(r => (
                                        <TouchableOpacity
                                            key={`${r.type}-${r.phone}`}
                                            style={styles.userSearchItem}
                                            onPress={() => pickSearchResult(r)}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.userSearchItemName}>{r.full_name || 'Unknown'}</Text>
                                                <Text style={styles.userSearchItemPhone}>+977 {r.phone}</Text>
                                            </View>
                                            <View style={[styles.userTypeTag, r.type === 'professional' ? styles.userTypeTagPro : styles.userTypeTagCust]}>
                                                <Text style={styles.userTypeTagText}>{r.type === 'professional' ? 'Professional' : 'Customer'}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            {pickedUserType && (
                                <Text style={styles.addAdminHint}>
                                    {pickedUserType === 'professional'
                                        ? 'Existing Professional selected — their current PIN carries over, the PIN field below is ignored.'
                                        : 'Existing Customer selected — they have no login yet, so set a PIN below to create their Admin access.'}
                                </Text>
                            )}

                            <Text style={[styles.detailLabel, { marginTop: hp('1.8%') }]}>Full Name</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newAdminName}
                                onChangeText={setNewAdminName}
                                placeholder="Enter full name"
                                placeholderTextColor="#B0BEC5"
                            />

                            <Text style={[styles.detailLabel, { marginTop: hp('1.8%') }]}>Phone Number</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newAdminPhone}
                                onChangeText={t => { setNewAdminPhone(t.replace(/[^0-9]/g, '').slice(0, 10)); setPickedUserType(null); }}
                                placeholder="98XXXXXXXX"
                                placeholderTextColor="#B0BEC5"
                                keyboardType="number-pad"
                                maxLength={10}
                            />

                            <Text style={styles.addAdminHint}>
                                If this phone number already has an account (e.g. a Professional), it'll be upgraded to Admin — name and PIN below are only used when creating a brand-new account.
                            </Text>

                            <Text style={[styles.detailLabel, { marginTop: hp('1.8%') }]}>4-Digit PIN</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newAdminPin}
                                onChangeText={t => setNewAdminPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                                placeholder="1234"
                                placeholderTextColor="#B0BEC5"
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                            />

                            <Text style={[styles.detailLabel, { marginTop: hp('1.8%') }]}>City Access</Text>
                            <Text style={styles.addAdminHint}>
                                Choose which cities this admin can operate in, or leave "All Cities" for unrestricted access.
                            </Text>
                            <CitySelector selected={newAdminCities} onChange={setNewAdminCities} />

                            <TouchableOpacity
                                style={[styles.modalActionBtn, styles.btnEnableLarge, addingAdmin && { opacity: 0.6 }]}
                                onPress={handleAddAdmin}
                                disabled={addingAdmin}
                            >
                                {addingAdmin
                                    ? <ActivityIndicator color="#16a34a" />
                                    : <Text style={styles.modalActionText}>Create Admin Account</Text>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Edit City Access Modal ── */}
            <Modal
                visible={!!editingCitiesAdmin}
                animationType="slide"
                transparent
                onRequestClose={() => setEditingCitiesAdmin(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.handleBar} />
                        <TouchableOpacity style={styles.modalClose} onPress={() => setEditingCitiesAdmin(null)}>
                            <Ionicons name="close" size={22} color="#295C59" />
                        </TouchableOpacity>

                        <Text style={styles.modalName}>{editingCitiesAdmin?.full_name}</Text>
                        <Text style={[styles.detailLabel, { marginTop: hp('2%') }]}>City Access</Text>
                        <Text style={styles.addAdminHint}>
                            Choose which cities this admin can operate in, or leave "All Cities" for unrestricted access.
                        </Text>
                        <CitySelector selected={editCitiesSelection} onChange={setEditCitiesSelection} />

                        <TouchableOpacity
                            style={[styles.modalActionBtn, styles.btnEnableLarge, savingCities && { opacity: 0.6 }, { marginBottom: hp('2%') + insets.bottom }]}
                            onPress={saveEditCities}
                            disabled={savingCities}
                        >
                            {savingCities
                                ? <ActivityIndicator color="#16a34a" />
                                : <Text style={styles.modalActionText}>Save City Access</Text>
                            }
                        </TouchableOpacity>
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
    addAdminBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#295C59', borderRadius: 14,
        marginHorizontal: wp('4%'), marginTop: hp('1.5%'),
        paddingVertical: hp('1.5%'),
    },
    addAdminBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    addAdminHint: { fontSize: 11.5, color: '#9BBAB8', marginTop: 8, lineHeight: 16 },
    userSearchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('3.5%'), height: hp('5.8%'), marginTop: 6,
    },
    userSearchInput: { flex: 1, fontSize: 14, color: '#1C2B2A' },
    userSearchResults: {
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        marginTop: 6, overflow: 'hidden',
    },
    userSearchItem: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: wp('3.5%'), paddingVertical: hp('1.3%'),
        borderBottomWidth: 1, borderBottomColor: '#F0F4F3',
    },
    userSearchItemName: { fontSize: 13.5, fontWeight: '700', color: '#1C2B2A' },
    userSearchItemPhone: { fontSize: 11.5, color: '#9BBAB8', marginTop: 1 },
    userTypeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    userTypeTagPro: { backgroundColor: '#dcfce7' },
    userTypeTagCust: { backgroundColor: '#E8F4F3' },
    userTypeTagText: { fontSize: 10.5, fontWeight: '700', color: '#295C59' },
    formInput: {
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('4%'), height: hp('6%'),
        fontSize: 14, color: '#1C2B2A', marginTop: 6,
    },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', margin: wp('4%'), marginBottom: wp('2%'),
        borderRadius: 14, borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('4%'), height: hp('5.5%'),
    },
    searchInput: { flex: 1, fontSize: 14, color: '#1C2B2A' },

    filtersRow: {
        flexDirection: 'row', gap: wp('4%'),
        paddingHorizontal: wp('4%'), marginBottom: hp('1.5%'),
    },
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
        marginTop: 4, zIndex: 999, maxHeight: hp('30%'),
        elevation: 8, shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8,
    },
    dropItem: { paddingHorizontal: wp('3%'), paddingVertical: hp('1.3%') },
    dropItemActive: { backgroundColor: '#E8F4F3' },
    dropItemText: { fontSize: 14, fontWeight: '500', color: '#1C2B2A' },
    dropItemTextActive: { color: '#295C59', fontWeight: '700' },

    paginationRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: wp('4%'), marginTop: hp('1%'), marginBottom: hp('2%'),
    },
    pageBtn: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D6E8E7',
    },
    pageBtnDisabled: { backgroundColor: '#F5F9F8', borderColor: '#EAF2F1' },
    pageIndicator: { fontSize: 13, fontWeight: '700', color: '#295C59', minWidth: wp('28%'), textAlign: 'center' },
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
    btnCities: { backgroundColor: '#E8F4F3' },
    cityChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: hp('1%') },
    cityChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D6E8E7',
    },
    cityChipActive: { backgroundColor: '#295C59', borderColor: '#295C59' },
    cityChipText: { fontSize: 13, fontWeight: '600', color: '#1C2B2A' },
    cityChipTextActive: { color: '#fff' },
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
