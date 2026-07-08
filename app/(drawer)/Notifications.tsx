import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { supabase } from '../../lib/supabase';

type NotificationRow = {
    id: number;
    created_at: string;
    title: string;
    body: string;
    screen: string | null;
    link_id: string | null;
    audience: string;
    audience_service: string | null;
    audience_city: string | null;
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

export default function Notifications() {
    const [notifications, setNotifications] = useState<NotificationRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [adminPhone, adminTable, adminRole] = await Promise.all([
                AsyncStorage.getItem('adminPhone'),
                AsyncStorage.getItem('adminTable'),
                AsyncStorage.getItem('adminRole'),
            ]);

            if (!adminPhone) {
                // Logged out — general HomeSewa updates/announcements only, no
                // personal leads or admin-only content.
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .in('audience', ['all', 'customer_all'])
                    .order('created_at', { ascending: false });
                setNotifications(data || []);
                return;
            }

            if (adminTable === 'workforce') {
                // Professional — open leads matching their own services/city, plus general
                // broadcasts to everyone. Admin-only categories never show up here.
                const { data: wf } = await supabase
                    .from('workforce')
                    .select('services, preferred_city')
                    .or(`phone.eq.${adminPhone},phone.eq.977${adminPhone}`)
                    .maybeSingle();

                const myServices: string[] = wf?.services || [];
                const myCity = wf?.preferred_city || '';

                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .in('audience', ['professional_open', 'all'])
                    .order('created_at', { ascending: false });

                const filtered = (data || []).filter((n: NotificationRow) =>
                    n.audience === 'all' || (
                        (!n.audience_city || !myCity || n.audience_city === myCity) &&
                        (!n.audience_service || myServices.length === 0 || myServices.some(s => n.audience_service!.includes(s)))
                    )
                );
                setNotifications(filtered);
            } else if (adminTable === 'admins') {
                const audiences = adminRole === 'super_admin'
                    ? ['admin_all', 'super_admin', 'all']
                    : ['admin_all', 'all'];

                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .in('audience', audiences)
                    .order('created_at', { ascending: false });
                setNotifications(data || []);
            } else {
                setNotifications([]);
            }
        } catch (e) {
            console.error('Failed to load notifications:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const handlePress = (item: NotificationRow) => {
        if (!item.screen) return;
        router.push({
            pathname: item.screen as any,
            params: item.link_id ? { id: item.link_id } : undefined,
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f6f7fb' }}>
            <Header4 />
            <View style={styles.headerRow}>
                <Text style={styles.title}>Notifications</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#295C59" />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="notifications-off-outline" size={40} color="#9BBAB8" />
                    <Text style={styles.emptyText}>No notifications yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: wp('4%'), paddingBottom: hp('5%') }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={item.screen ? 0.7 : 1}
                            onPress={() => handlePress(item)}
                        >
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardBody}>{item.body}</Text>
                            <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        paddingHorizontal: wp('4%'),
        paddingTop: hp('2%'),
        paddingBottom: hp('1.5%'),
    },
    title: {
        fontSize: hp('2.3%'),
        fontWeight: '700',
        color: '#295C59',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    emptyText: {
        fontSize: hp('1.8%'),
        color: '#9BBAB8',
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E8F4F3',
        padding: wp('4%'),
        marginBottom: hp('1.5%'),
    },
    cardTitle: {
        fontSize: hp('1.8%'),
        fontWeight: '700',
        color: '#1C2B2A',
        marginBottom: 4,
    },
    cardBody: {
        fontSize: hp('1.6%'),
        fontWeight: '500',
        color: '#5A7270',
        lineHeight: hp('2.1%'),
        marginBottom: 6,
    },
    cardDate: {
        fontSize: hp('1.3%'),
        fontWeight: '600',
        color: '#9BBAB8',
    },
});
