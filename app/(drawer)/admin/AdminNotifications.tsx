import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, TextInput, ScrollView, ActivityIndicator,
    KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header4 from '@/components/Header4Admin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyAll, notifyProfessionalsInCity, notifyCustomers } from '../../../api/notifications';

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

type Tab = 'all' | 'professionals' | 'customers';

const TAB_CONFIG: { key: Tab; label: string; icon: string; description: string }[] = [
    {
        key: 'all',
        label: 'All Users',
        icon: 'globe-outline',
        description: 'Send to ALL app users — customers, professionals & admins.',
    },
    {
        key: 'professionals',
        label: 'Professionals',
        icon: 'construct-outline',
        description: 'Target professionals by their service type and city.',
    },
    {
        key: 'customers',
        label: 'Customers',
        icon: 'people-outline',
        description: 'Send only to customers who have booked services.',
    },
];

function MultiSelectDropdown({ label, options, selected, onChange, placeholder }: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (items: string[]) => void;
    placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const [temp, setTemp] = useState<string[]>([]);
    const insets = useSafeAreaInsets();

    const handleOpen = () => {
        setTemp([...selected]);
        setOpen(true);
    };

    const toggle = (item: string) => {
        setTemp(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    const handleConfirm = () => {
        onChange(temp);
        setOpen(false);
    };

    const removeOne = (item: string) => {
        onChange(selected.filter(i => i !== item));
    };

    return (
        <>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity style={styles.dropdownBtn} onPress={handleOpen} activeOpacity={0.8}>
                <Text style={selected.length > 0 ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
                    {selected.length > 0 ? `${selected.length} selected` : placeholder}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9BBAB8" />
            </TouchableOpacity>

            {selected.length > 0 && (
                <View style={styles.chipsRow}>
                    {selected.map(item => (
                        <View key={item} style={styles.chip}>
                            <Text style={styles.chipText}>{item}</Text>
                            <TouchableOpacity onPress={() => removeOne(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Ionicons name="close" size={12} color="#295C59" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <Ionicons name="close" size={22} color="#1C2B2A" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={item => item}
                            style={{ maxHeight: hp('50%') }}
                            renderItem={({ item }) => {
                                const checked = temp.includes(item);
                                return (
                                    <TouchableOpacity
                                        style={styles.optionRow}
                                        onPress={() => toggle(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                            {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                                        </View>
                                        <Text style={[styles.optionText, checked && styles.optionTextChecked]}>{item}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        <View style={[styles.modalFooter, { paddingBottom: hp('1.5%') + insets.bottom }]}>
                            <TouchableOpacity style={styles.clearBtn} onPress={() => setTemp([])}>
                                <Text style={styles.clearBtnText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                                <Text style={styles.confirmBtnText}>Confirm ({temp.length})</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

export default function AdminNotifications() {
    const [tab, setTab] = useState<Tab>('all');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

    const resetFields = () => {
        setTitle('');
        setMessage('');
        setSelectedServices([]);
        setSelectedCities([]);
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
            : `${title}\n\n${message}`;

        Alert.alert('Confirm Send', preview, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Send Now', onPress: async () => {
                    setSending(true);
                    try {
                        if (tab === 'all') {
                            await notifyAll(title.trim(), message.trim());
                        } else if (tab === 'professionals') {
                            await notifyProfessionalsInCity(selectedServices, selectedCities, message.trim());
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

    if (!isSuperAdmin) return null;

    const activeTab = TAB_CONFIG.find(t => t.key === tab)!;

    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Send Notification</Text>
            </View>

            <View style={styles.tabs}>
                {TAB_CONFIG.map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tab, tab === t.key && styles.tabActive]}
                        onPress={() => { setTab(t.key); resetFields(); }}
                    >
                        <Ionicons name={t.icon as any} size={16} color={tab === t.key ? '#295C59' : '#9BBAB8'} />
                        <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    <View style={styles.infoBanner}>
                        <Ionicons name={activeTab.icon as any} size={18} color="#295C59" />
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
                                placeholderTextColor="#B0BEC5"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                textAlignVertical="top"
                            />
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>TITLE</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Notification title"
                                placeholderTextColor="#B0BEC5"
                                value={title}
                                onChangeText={setTitle}
                            />
                            <Text style={styles.label}>MESSAGE</Text>
                            <TextInput
                                style={[styles.input, styles.textarea]}
                                placeholder={
                                    tab === 'all'
                                        ? 'Type your announcement or notice...'
                                        : 'Type your offer or message to customers...'
                                }
                                placeholderTextColor="#B0BEC5"
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
    tab: {
        flex: 1, paddingVertical: hp('1.5%'),
        alignItems: 'center', flexDirection: 'row',
        justifyContent: 'center', gap: 4,
    },
    tabActive: { borderBottomWidth: 3, borderBottomColor: '#295C59' },
    tabText: { fontSize: 11, fontWeight: '600', color: '#9BBAB8' },
    tabTextActive: { color: '#295C59', fontWeight: '700' },
    content: { padding: wp('4%'), paddingBottom: hp('20%') },
    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#E8F4F3', borderRadius: 14,
        padding: wp('4%'), marginBottom: hp('2.5%'),
    },
    infoText: { flex: 1, fontSize: 13, color: '#295C59', fontWeight: '500', lineHeight: 20 },
    label: {
        fontSize: 11, fontWeight: '800', color: '#295C59',
        textTransform: 'uppercase', letterSpacing: 0.6,
        marginBottom: 8, marginTop: hp('2%'),
    },
    input: {
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
        fontSize: 14, color: '#1C2B2A',
    },
    textarea: { minHeight: hp('16%'), paddingTop: hp('1.5%') },

    // Dropdown
    dropdownBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.8%'),
    },
    dropdownValue: { fontSize: 14, color: '#1C2B2A', fontWeight: '500', flex: 1 },
    dropdownPlaceholder: { fontSize: 14, color: '#B0BEC5', flex: 1 },

    // Chips
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#E8F4F3', borderRadius: 20,
        paddingVertical: 5, paddingHorizontal: 10,
    },
    chipText: { fontSize: 12, color: '#295C59', fontWeight: '600' },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 8, maxHeight: hp('75%'),
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: wp('5%'), paddingVertical: hp('1.8%'),
        borderBottomWidth: 1, borderBottomColor: '#F0F4F3',
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#1C2B2A' },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: hp('1.5%'), paddingHorizontal: wp('5%'),
        borderBottomWidth: 1, borderBottomColor: '#F5F9F8',
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: '#D6E8E7',
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: '#295C59', borderColor: '#295C59' },
    optionText: { fontSize: 14, color: '#4B5563', flex: 1 },
    optionTextChecked: { color: '#1C2B2A', fontWeight: '600' },
    modalFooter: {
        flexDirection: 'row', gap: 12,
        padding: wp('4%'), borderTopWidth: 1, borderTopColor: '#F0F4F3',
    },
    clearBtn: {
        flex: 1, paddingVertical: hp('1.5%'), borderRadius: 14,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        alignItems: 'center',
    },
    clearBtnText: { fontSize: 14, fontWeight: '700', color: '#9BBAB8' },
    confirmBtn: {
        flex: 2, paddingVertical: hp('1.5%'), borderRadius: 14,
        backgroundColor: '#295C59', alignItems: 'center',
    },
    confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

    sendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#295C59', borderRadius: 16,
        paddingVertical: hp('2%'), marginTop: hp('3%'), gap: 8,
        elevation: 3,
    },
    sendBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
