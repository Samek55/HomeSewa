import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
    View, Text, Image, TouchableOpacity,
    StyleSheet, TextInput, FlatList, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import SearchIcon from '../../../assets/images/TabIcon/searchbar.png';
import BookingCard from '../../../components/admin/BookingCard';
import Header4 from '@/components/Header4Admin';
import { router, useFocusEffect } from 'expo-router';
import { fetchBookings } from '../../../api/helper/fetchBookingData';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const DATE_FILTERS = [
    { label: 'Today',      value: 'Today'      },
    { label: 'Yesterday',  value: 'Yesterday'  },
    { label: 'This Week',  value: 'This Week'  },
    { label: 'This Month', value: 'This Month' },
    { label: '3 Months',   value: '3 Months'   },
    { label: '6 Months',   value: '6 Months'   },
    { label: '1 Year',     value: '1 Year'     },
    { label: 'All',        value: 'All'        },
];

const startOf = (unit: 'day' | 'week' | 'month'): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (unit === 'week') d.setDate(d.getDate() - d.getDay());
    if (unit === 'month') d.setDate(1);
    return d;
};

const filterByRange = (bookings: any[], range: string): any[] => {
    if (range === 'All') return bookings;
    const now = new Date();
    const todayStart = startOf('day');

    const getDate = (b: any): Date => new Date(b.bookingDate || b.startingDate || 0);

    if (range === 'Today') {
        const end = new Date(todayStart); end.setDate(end.getDate() + 1);
        return bookings.filter(b => { const d = getDate(b); return d >= todayStart && d < end; });
    }
    if (range === 'Yesterday') {
        const yStart = new Date(todayStart); yStart.setDate(yStart.getDate() - 1);
        return bookings.filter(b => { const d = getDate(b); return d >= yStart && d < todayStart; });
    }
    if (range === 'This Week') {
        const weekStart = startOf('week');
        return bookings.filter(b => getDate(b) >= weekStart);
    }
    if (range === 'This Month') {
        const monthStart = startOf('month');
        return bookings.filter(b => getDate(b) >= monthStart);
    }
    if (range === '3 Months') {
        const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3);
        return bookings.filter(b => getDate(b) >= cutoff);
    }
    if (range === '6 Months') {
        const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 6);
        return bookings.filter(b => getDate(b) >= cutoff);
    }
    if (range === '1 Year') {
        const cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() - 1);
        return bookings.filter(b => getDate(b) >= cutoff);
    }
    return bookings;
};

export default function SuperAdminHistory() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const lastDataRef = useRef<string>('');
    const intervalRef = useRef<any>(null);

    useEffect(() => {
        AsyncStorage.getItem('adminRole').then(role => {
            if (role !== 'super_admin') {
                Alert.alert('Access Denied', 'Super Admin only.');
                router.back();
            }
        });
    }, []);

    const loadBookings = useCallback(async () => {
        try {
            const data = await fetchBookings();
            const serialized = JSON.stringify(data);
            if (serialized === lastDataRef.current) return;
            lastDataRef.current = serialized;
            setBookings(data || []);
        } catch (e) {
            console.error('SuperAdmin fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadBookings();
            intervalRef.current = setInterval(loadBookings, 15000);
            return () => clearInterval(intervalRef.current);
        }, [loadBookings])
    );

    const toggleCard = useCallback((id: string) => setOpenId(prev => prev === id ? null : id), []);

    const handlePress = useCallback((id: string) => {
        const b = bookings.find(b => b.id === id);
        const s = (b?.status || '').toLowerCase().trim();
        if (s.includes('new') || s.includes('open')) {
            router.push({ pathname: '/admin/BookingDetails_1', params: { id } });
        } else {
            router.push({ pathname: '/admin/BookingDetails_2', params: { id } });
        }
    }, [bookings]);

    const filteredData = useMemo(() => {
        let data = [...bookings].sort((a, b) => (Number(b.bookingId) || 0) - (Number(a.bookingId) || 0));
        data = filterByRange(data, dateRange);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            data = data.filter(item =>
                String(item.bookingId || '').toLowerCase().includes(q) ||
                String(item.fullName || '').toLowerCase().includes(q) ||
                String(item.phone || '').toLowerCase().includes(q)
            );
        }
        return data;
    }, [bookings, dateRange, searchQuery]);

    const renderItem = useCallback(({ item }: any) => (
        <BookingCard
            item={item}
            isOpen={openId === item.id}
            onToggle={() => toggleCard(item.id)}
            onPress={() => handlePress(item.id)}
        />
    ), [openId, toggleCard, handlePress]);

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <Header4 />

            {/* HEADER */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={{ padding: 4 }} onPress={() => router.back()}>
                    <Image source={leftArrowIcon} style={styles.backIcon} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: wp('2%') }}>
                    <Text style={styles.title}>Super Admin</Text>
                    <Text style={styles.subtitle}>All Bookings</Text>
                </View>
                <View style={styles.badge}>
                    <Ionicons name="shield-checkmark" size={14} color="#fff" />
                    <Text style={styles.badgeText}>Super Admin</Text>
                </View>
            </View>

            {/* SEARCH */}
            <View style={styles.inputContainer}>
                <Image source={SearchIcon} style={{ height: 20, width: 20 }} />
                <TextInput
                    placeholder="Search by ID, name or phone"
                    placeholderTextColor="rgba(67,67,67,0.8)"
                    style={styles.textInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                    autoCapitalize="none"
                />
            </View>

            {/* DATE RANGE FILTERS */}
            <View style={styles.filterRow}>
                {DATE_FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.value}
                        style={[styles.filterPill, dateRange === f.value && styles.filterPillActive]}
                        onPress={() => setDateRange(f.value)}
                    >
                        <Text style={[styles.filterText, dateRange === f.value && styles.filterTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* COUNT */}
            <Text style={styles.countLabel}>
                {loading ? 'Loading...' : `${filteredData.length} Booking${filteredData.length !== 1 ? 's' : ''}`}
            </Text>

            {/* LIST */}
            <FlatList
                data={filteredData}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: hp('15%') }}
                initialNumToRender={8}
                maxToRenderPerBatch={6}
                windowSize={7}
                removeClippedSubviews
                keyboardDismissMode="on-drag"
                ListEmptyComponent={
                    !loading ? (
                        <Text style={styles.emptyText}>No bookings for this period.</Text>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp('4%'),
        marginTop: hp('1.5%'),
        marginBottom: hp('1%'),
        minHeight: hp('5%'),
    },
    backIcon: { width: hp('3.5%'), height: hp('3.5%'), tintColor: '#295C59' },
    title: { fontSize: hp('2.3%'), fontWeight: '700', color: '#295C59' },
    subtitle: { fontSize: hp('1.5%'), color: '#9BBAB8', fontWeight: '500' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#295C59',
        borderRadius: 20,
        paddingHorizontal: wp('3%'),
        paddingVertical: hp('0.5%'),
        gap: 4,
    },
    badgeText: { fontSize: hp('1.4%'), color: '#fff', fontWeight: '700' },

    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: hp('2%'),
        borderWidth: 1.5,
        width: '90%',
        borderRadius: 200,
        borderColor: 'rgba(0,0,0,0.3)',
        height: hp('5%'),
        marginTop: hp('1%'),
        marginBottom: hp('1.5%'),
        alignItems: 'center',
        alignSelf: 'center',
    },
    textInput: {
        flex: 1,
        fontSize: hp(1.8),
        fontWeight: '500',
        color: '#000',
        paddingLeft: 8,
        letterSpacing: 0.3,
    },

    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: wp('4%'),
        gap: wp('2%'),
        marginBottom: hp('1%'),
    },
    filterPill: {
        backgroundColor: '#E8F4F3',
        paddingHorizontal: wp('3.5%'),
        paddingVertical: hp('0.7%'),
        borderRadius: 20,
    },
    filterPillActive: {
        backgroundColor: '#295C59',
    },
    filterText: {
        fontSize: wp('3.2%'),
        fontWeight: '600',
        color: '#295C59',
    },
    filterTextActive: {
        color: '#fff',
    },

    countLabel: {
        paddingHorizontal: wp('4%'),
        marginBottom: hp('1%'),
        fontSize: hp('1.6%'),
        fontWeight: '600',
        color: '#9BBAB8',
    },

    emptyText: {
        textAlign: 'center',
        color: '#9BBAB8',
        fontSize: hp('1.8%'),
        marginTop: hp('10%'),
    },
});
