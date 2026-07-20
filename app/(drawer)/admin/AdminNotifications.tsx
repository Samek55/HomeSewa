import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, TextInput, ScrollView, ActivityIndicator,
    Platform, Modal, FlatList,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header4 from '@/components/Header4Admin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyAll, notifyProfessionalsInCity, notifyCustomers, notifyCustomersByService, notifyAdminsBroadcast, notifyPublic } from '../../../api/notifications';
import { supabase } from '../../../lib/supabase';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const SERVICES = [
    'Deep Cleaning', 'Garden Care', 'Masonry Repair', 'Plumbing Repair',
    'Electrical Repair', 'Carpentry', 'Washing Machine Repair', 'EV Charger Installation',
    'AC Services', 'Painting', 'Packing & Moving', 'AirBnB Maintenance',
    'Bridal Makeup', 'RO Water Purifying', 'Refrigerator Repair', 'CCTV Services',
    'Modular Kitchen', 'Home Renovation', 'Pest Control', 'Drywall Repair',
    'Salon at Home', 'Tiling', 'Chef at Home', 'Home Automation',
    'Parqueting', 'Indoor Planting', 'Spa at Home', 'Physiotherapy',
    'Handyman', 'Massage Therapy', 'Water Tank Cleaning', 'Aluminum Fabrication',
    'False Ceiling', 'Computer Repair', 'Geyser Repair', 'Chimney Repair',
    'Tree Cutting & Pruning', 'Septic Tank Cleaning', 'Pet Grooming', 'Lift / Elevator Repair',
];

const CITIES = ['Kathmandu', 'Bhaktapur', 'Lalitpur'];

type Tab = 'admin' | 'customers' | 'professionals' | 'public' | 'all' | 'history';

const TAB_CONFIG: { key: Tab; label: string; icon: string; description: string }[] = [
    {
        key: 'admin',
        label: 'Admin',
        icon: 'shield-checkmark-outline',
        description: 'Flash a notification to Admin and Super Admin accounts only.',
    },
    {
        key: 'customers',
        label: 'Customer',
        icon: 'people-outline',
        description: 'Send to all customers, or target only those who booked a specific service.',
    },
    {
        key: 'professionals',
        label: 'Professional',
        icon: 'construct-outline',
        description: 'Target professionals by their service type and city.',
    },
    {
        key: 'public',
        label: 'Public',
        icon: 'megaphone-outline',
        description: 'Reach installs that have not registered as a customer or professional yet.',
    },
    {
        key: 'all',
        label: 'All',
        icon: 'globe-outline',
        description: 'Send to every app install — customers, professionals, admins & public.',
    },
    {
        key: 'history',
        label: 'All Notifications',
        icon: 'time-outline',
        description: 'Every notification sent so far, across every category.',
    },
];

type NotificationRow = {
    id: number;
    created_at: string;
    title: string;
    body: string;
    audience: string;
};

const formatDate = (iso: string) => {
    try {
        const d = new Date(iso);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `${day} ${month} ${d.getFullYear()}, ${time}`;
    } catch {
        return '';
    }
};

function TabDropdown({ value, onChange, styles, colors }: { value: Tab; onChange: (tab: Tab) => void; styles: ReturnType<typeof createStyles>; colors: ThemeColors }) {
    const [open, setOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const active = TAB_CONFIG.find(t => t.key === value)!;

    return (
        <>
            <TouchableOpacity style={styles.tabDropdownBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
                <Ionicons name={active.icon as any} size={18} color={colors.brand} />
                <Text style={styles.tabDropdownValue}>{active.label}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Send To</Text>
                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <Ionicons name="close" size={22} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {TAB_CONFIG.map(t => {
                            const selected = t.key === value;
                            return (
                                <TouchableOpacity
                                    key={t.key}
                                    style={styles.optionRow}
                                    onPress={() => { onChange(t.key); setOpen(false); }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={t.icon as any} size={18} color={selected ? colors.brand : colors.textMuted} />
                                    <Text style={[styles.optionText, selected && styles.optionTextChecked]}>{t.label}</Text>
                                    {selected && <Ionicons name="checkmark" size={18} color={colors.brand} />}
                                </TouchableOpacity>
                            );
                        })}
                        <View style={{ height: Math.max(insets.bottom, hp('1.5%')) }} />
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

export default function AdminNotifications() {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [tab, setTab] = useState<Tab>('all');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedCustomerServices, setSelectedCustomerServices] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [history, setHistory] = useState<NotificationRow[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('adminRole').then(role => {
            if (role !== 'super_admin') {
                Alert.alert('Access Denied', 'Super Admin access only.');
                router.back();
                return;
            }
            setHasAccess(true);
        });
    }, []);

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const { data } = await supabase
                .from('notifications')
                .select('id, created_at, title, body, audience')
                .order('created_at', { ascending: false })
                .limit(200);
            setHistory(data || []);
        } catch (e) {
            console.error('Failed to load notification history:', e);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'history') loadHistory();
    }, [tab]);

    const resetFields = () => {
        setTitle('');
        setMessage('');
        setSelectedServices([]);
        setSelectedCities([]);
        setSelectedCustomerServices([]);
    };

    const handleSend = async () => {
        if (tab === 'professionals') {
            if (!selectedServices.length) return Alert.alert('Missing Field', 'Please select at least one service type.');
            if (!selectedCities.length) return Alert.alert('Missing Field', 'Please select at least one city.');
            if (!message.trim()) return Alert.alert('Missing Field', 'Please enter a message.');
        } else {
            if (!title.trim()) return Alert.alert('Missing Field', 'Please enter a title.');
            if (!message.trim()) return Alert.alert('Missing Field', 'Please enter a message.');
        }

        const preview = tab === 'professionals'
            ? `To: ${selectedServices.join(', ')} professionals in ${selectedCities.join(', ')}\n\n${message}`
            : tab === 'customers' && selectedCustomerServices.length > 0
            ? `${title}\nTo: customers who booked ${selectedCustomerServices.join(', ')}\n\n${message}`
            : `${title}\n\n${message}`;

        Alert.alert('Confirm Send', preview, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Send Now', onPress: async () => {
                    setSending(true);
                    try {
                        if (tab === 'all') {
                            await notifyAll(title.trim(), message.trim());
                        } else if (tab === 'admin') {
                            await notifyAdminsBroadcast(title.trim(), message.trim());
                        } else if (tab === 'public') {
                            await notifyPublic(title.trim(), message.trim());
                        } else if (tab === 'professionals') {
                            await notifyProfessionalsInCity(selectedServices, selectedCities, message.trim());
                        } else if (tab === 'customers' && selectedCustomerServices.length > 0) {
                            await notifyCustomersByService(selectedCustomerServices, title.trim(), message.trim());
                        } else {
                            await notifyCustomers(title.trim(), message.trim());
                        }
                        Alert.alert('Sent!', 'Notification sent successfully.');
                        resetFields();
                    } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to send notification.');
                    }
                    setSending(false);
                },
            },
        ]);
    };

    if (!hasAccess) return null;

    const activeTab = TAB_CONFIG.find(t => t.key === tab)!;

    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={isDark ? colors.brand : '#fff'} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Send Notification</Text>
            </View>

            <View style={styles.tabDropdownWrap}>
                <TabDropdown value={tab} onChange={(t) => { setTab(t); resetFields(); }} styles={styles} colors={colors} />
            </View>

            {tab === 'history' ? (
                historyLoading ? (
                    <View style={styles.historyCenter}>
                        <ActivityIndicator size="large" color={colors.brand} />
                    </View>
                ) : history.length === 0 ? (
                    <View style={styles.historyCenter}>
                        <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No notifications sent yet.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={history}
                        keyExtractor={item => String(item.id)}
                        contentContainerStyle={styles.historyList}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={styles.historyCard}>
                                <Text style={styles.historyCardTitle}>{item.title}</Text>
                                <Text style={styles.historyCardBody}>{item.body}</Text>
                                <Text style={styles.historyCardDate}>{formatDate(item.created_at)}</Text>
                            </View>
                        )}
                    />
                )
            ) : (
            <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    <View style={styles.infoBanner}>
                        <Ionicons name={activeTab.icon as any} size={18} color={colors.brand} />
                        <Text style={styles.infoText}>{activeTab.description}</Text>
                    </View>

                    {tab === 'professionals' ? (
                        <>
                            <MultiSelectDropdown
                                label="SERVICE TYPE"
                                options={SERVICES}
                                selected={selectedServices}
                                onChange={setSelectedServices}
                                placeholder="Select service types..."
                            />
                            <MultiSelectDropdown
                                label="CITY"
                                options={CITIES}
                                selected={selectedCities}
                                onChange={setSelectedCities}
                                placeholder="Select cities..."
                            />
                            <Text style={styles.label}>MESSAGE</Text>
                            <TextInput
                                style={[styles.input, styles.textarea]}
                                placeholder="Type your message to professionals..."
                                placeholderTextColor={colors.textMuted}
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                textAlignVertical="top"
                            />
                        </>
                    ) : (
                        <>
                            {tab === 'customers' && (
                                <MultiSelectDropdown
                                    label="SERVICE TYPE (OPTIONAL)"
                                    options={SERVICES}
                                    selected={selectedCustomerServices}
                                    onChange={setSelectedCustomerServices}
                                    placeholder="All customers, or select service types..."
                                />
                            )}
                            <Text style={styles.label}>TITLE</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Notification title"
                                placeholderTextColor={colors.textMuted}
                                value={title}
                                onChangeText={setTitle}
                            />
                            <Text style={styles.label}>MESSAGE</Text>
                            <TextInput
                                style={[styles.input, styles.textarea]}
                                placeholder={
                                    tab === 'customers'
                                        ? 'Type your offer or message to customers...'
                                        : tab === 'admin'
                                        ? 'Type your message to admins...'
                                        : tab === 'public'
                                        ? 'Type your message to public installs...'
                                        : 'Type your announcement or notice...'
                                }
                                placeholderTextColor={colors.textMuted}
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                textAlignVertical="top"
                            />
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                        onPress={handleSend}
                        disabled={sending}
                    >
                        {sending ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="send" size={18} color="#fff" />
                                <Text style={styles.sendBtnText}>Send Notification</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
            )}
        </View>
    );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: isDark ? colors.surface : colors.brand,
        borderBottomWidth: isDark ? 1 : 0, borderBottomColor: colors.divider,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'), gap: wp('3%'),
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: isDark ? colors.textPrimary : '#fff', flex: 1 },
    tabDropdownWrap: {
        backgroundColor: colors.surface, paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    tabDropdownBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.surface, borderRadius: 14,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.6%'),
    },
    tabDropdownValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '700', flex: 1 },
    content: { padding: wp('4%'), paddingBottom: hp('20%') },
    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: colors.surfaceMuted, borderRadius: 14,
        padding: wp('4%'), marginBottom: hp('2.5%'),
    },
    infoText: { flex: 1, fontSize: 13, color: colors.brand, fontWeight: '500', lineHeight: 20 },
    label: {
        fontSize: 11, fontWeight: '800', color: colors.brand,
        textTransform: 'uppercase', letterSpacing: 0.6,
        marginBottom: 8, marginTop: hp('2%'),
    },
    input: {
        backgroundColor: colors.surface, borderRadius: 14,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
        fontSize: 14, color: colors.textPrimary,
    },
    textarea: { minHeight: hp('16%'), paddingTop: hp('1.5%') },

    // History (All Notifications)
    historyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
    historyList: { padding: wp('4%'), paddingBottom: hp('5%') },
    historyCard: {
        backgroundColor: colors.surface, borderRadius: 14,
        borderWidth: 1, borderColor: colors.border,
        padding: wp('4%'), marginBottom: hp('1.5%'),
    },
    historyCardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
    historyCardBody: { fontSize: 13.5, fontWeight: '500', color: colors.textSecondary, lineHeight: 19, marginBottom: 6 },
    historyCardDate: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 8, maxHeight: hp('75%'),
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: wp('5%'), paddingVertical: hp('1.8%'),
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: hp('1.5%'), paddingHorizontal: wp('5%'),
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    optionText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
    optionTextChecked: { color: colors.textPrimary, fontWeight: '600' },

    sendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.brand, borderRadius: 16,
        paddingVertical: hp('2%'), marginTop: hp('3%'), gap: 8,
        elevation: 3,
    },
    sendBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
