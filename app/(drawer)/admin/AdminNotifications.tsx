import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, TextInput, ScrollView, ActivityIndicator,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyAll, notifyProfessionalsInCity, notifyCustomers } from '../../../api/notifications';

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

export default function AdminNotifications() {
    const [tab, setTab] = useState<Tab>('all');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [service, setService] = useState('');
    const [city, setCity] = useState('');
    const [sending, setSending] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

    const resetFields = () => {
        setTitle('');
        setMessage('');
        setService('');
        setCity('');
    };

    const handleSend = async () => {
        if (tab === 'professionals') {
            if (!service.trim()) return Alert.alert('Missing Field', 'Please enter a service type.');
            if (!city.trim()) return Alert.alert('Missing Field', 'Please enter a city.');
            if (!message.trim()) return Alert.alert('Missing Field', 'Please enter a message.');
        } else {
            if (!title.trim()) return Alert.alert('Missing Field', 'Please enter a title.');
            if (!message.trim()) return Alert.alert('Missing Field', 'Please enter a message.');
        }

        const preview = tab === 'professionals'
            ? `To: ${service} professionals in ${city}\n\n${message}`
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
                            await notifyProfessionalsInCity(service.trim(), city.trim());
                        } else {
                            await notifyCustomers(title.trim(), message.trim());
                        }
                        Alert.alert('Sent!', 'Notification sent successfully.');
                        resetFields();
                    } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to send notification.');
                    }
                    setSending(false);
                }
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

            {/* Tabs */}
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

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                    {/* Info banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name={activeTab.icon as any} size={18} color="#295C59" />
                        <Text style={styles.infoText}>{activeTab.description}</Text>
                    </View>

                    {tab === 'professionals' ? (
                        <>
                            <Text style={styles.label}>Service Type</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Plumber, Carpenter, Electrician"
                                placeholderTextColor="#B0BEC5"
                                value={service}
                                onChangeText={setService}
                            />
                            <Text style={styles.label}>City</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Kathmandu, Pokhara, Lalitpur"
                                placeholderTextColor="#B0BEC5"
                                value={city}
                                onChangeText={setCity}
                            />
                            <Text style={styles.label}>Message</Text>
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
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Notification title"
                                placeholderTextColor="#B0BEC5"
                                value={title}
                                onChangeText={setTitle}
                            />
                            <Text style={styles.label}>Message</Text>
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
    content: { padding: wp('4%'), paddingBottom: hp('12%') },
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
    sendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#295C59', borderRadius: 16,
        paddingVertical: hp('2%'), marginTop: hp('3%'), gap: 8,
        elevation: 3,
    },
    sendBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
