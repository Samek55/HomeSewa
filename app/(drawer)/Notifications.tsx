import React, { useCallback, useMemo, useState } from 'react';
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

const READ_IDS_KEY = 'readNotificationIds';

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
    audience_phone: string | null;
};

const ICONS_BY_AUDIENCE: Record<string, keyof typeof Ionicons.glyphMap> = {
    professional_open: 'briefcase-outline',
    customer_specific: 'checkmark-done-circle-outline',
    customer_all: 'megaphone-outline',
    admin_all: 'shield-outline',
    super_admin: 'shield-checkmark-outline',
    public_all: 'megaphone-outline',
    all: 'notifications-outline',
};

const formatRelative = (iso: string) => {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return `${day} ${month} ${d.getFullYear()}`;
};

export default function Notifications() {
    const [notifications, setNotifications] = useState<NotificationRow[]>([]);
    const [readIds, setReadIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [adminPhone, adminTable, adminRole, customerPhone, storedReadIds] = await Promise.all([
                AsyncStorage.getItem('adminPhone'),
                AsyncStorage.getItem('adminTable'),
                AsyncStorage.getItem('adminRole'),
                AsyncStorage.getItem('customerPhone'),
                AsyncStorage.getItem(READ_IDS_KEY),
            ]);

            setReadIds(new Set(storedReadIds ? JSON.parse(storedReadIds) : []));

            if (!adminPhone) {
                // No admin/professional session on this device — either a plain
                // customer (identified only by the phone number remembered after
                // their last booking, see BookingOtp.tsx) or a stranger who has
                // never booked anything. Either way: general broadcasts, plus this
                // device's own "customer_specific" pushes (e.g. Booking Accepted)
                // if we know its phone — never anyone else's.
                const orFilter = customerPhone
                    ? `audience.in.(all,customer_all),and(audience.eq.customer_specific,audience_phone.eq.${customerPhone})`
                    : `audience.in.(all,customer_all)`;

                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .or(orFilter)
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
                // Only a super admin ever sees the full admin feed (admin_all + the
                // super_admin-only category + public broadcasts). A regular admin
                // never sees 'super_admin' rows, and nobody outside `admins` sees
                // any admin category at all.
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

    const unreadCount = useMemo(
        () => notifications.filter(n => !readIds.has(n.id)).length,
        [notifications, readIds]
    );

    const markAsRead = useCallback((id: number) => {
        setReadIds(prev => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...next])).catch(() => {});
            return next;
        });
    }, []);

    const markAllAsRead = useCallback(() => {
        setReadIds(prev => {
            const next = new Set(prev);
            notifications.forEach(n => next.add(n.id));
            AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...next])).catch(() => {});
            return next;
        });
    }, [notifications]);

    const handlePress = (item: NotificationRow) => {
        markAsRead(item.id);
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
                <View>
                    <Text style={styles.title}>Notifications</Text>
                    {unreadCount > 0 && (
                        <Text style={styles.unreadSubtitle}>{unreadCount} unread</Text>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn} activeOpacity={0.7}>
                        <Ionicons name="checkmark-done" size={16} color="#295C59" />
                        <Text style={styles.markAllText}>Mark all as read</Text>
                    </TouchableOpacity>
                )}
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
                    renderItem={({ item }) => {
                        const isUnread = !readIds.has(item.id);
                        return (
                            <TouchableOpacity
                                style={[styles.card, isUnread && styles.cardUnread]}
                                activeOpacity={item.screen ? 0.7 : 1}
                                onPress={() => handlePress(item)}
                            >
                                <View style={styles.cardIconWrap}>
                                    <Ionicons
                                        name={ICONS_BY_AUDIENCE[item.audience] || 'notifications-outline'}
                                        size={18}
                                        color="#295C59"
                                    />
                                </View>
                                <View style={styles.cardBody}>
                                    <View style={styles.cardTitleRow}>
                                        <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        {isUnread && <View style={styles.unreadDot} />}
                                    </View>
                                    <Text style={styles.cardText} numberOfLines={3}>{item.body}</Text>
                                    <Text style={styles.cardDate}>{formatRelative(item.created_at)}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: wp('4%'),
        paddingTop: hp('2%'),
        paddingBottom: hp('1.5%'),
    },
    title: {
        fontSize: hp('2.3%'),
        fontWeight: '700',
        color: '#295C59',
    },
    unreadSubtitle: {
        fontSize: hp('1.4%'),
        fontWeight: '600',
        color: '#9BBAB8',
        marginTop: 2,
    },
    markAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        backgroundColor: '#E8F4F3',
    },
    markAllText: {
        fontSize: hp('1.4%'),
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
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E8F4F3',
        padding: wp('4%'),
        marginBottom: hp('1.5%'),
    },
    cardUnread: {
        borderColor: '#295C59',
        backgroundColor: '#FBFEFE',
    },
    cardIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E8F4F3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBody: {
        flex: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardTitle: {
        flex: 1,
        fontSize: hp('1.8%'),
        fontWeight: '600',
        color: '#1C2B2A',
        marginBottom: 4,
    },
    cardTitleUnread: {
        fontWeight: '800',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E0663E',
        marginBottom: 4,
    },
    cardText: {
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
