import React, { useMemo, useCallback, useState, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Platform,
    StyleSheet,
    TextInput,
    FlatList,
    ScrollView,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import BookingCard from '../../../components/admin/BookingCard';
import Header4 from '@/components/Header4Admin';
import { router, useFocusEffect } from 'expo-router';
import { fetchBookings } from '../../../api/helper/fetchBookingData';
import { getRejectedBookingIds } from '../../../api/leadRejections';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { maskCustomerName } from '../../../src/utils/maskName';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const FULL_DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const formatGroupDate = (ymd: string) => {
    const d = new Date(ymd + 'T00:00:00');
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${FULL_DAY_NAMES[d.getDay()]}`;
};

const parseToYMD = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const todayYMD = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export default function BookingHistory() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);
    const [filter, setFilter] = useState('New / Open');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

    const lastDataRef = useRef<string>('');
    const intervalRef = useRef<any>(null);

    const FILTERS = [
        ...(isSuperAdmin ? [{ label: 'Awaiting Confirmation', value: 'Pending Confirmation' }] : []),
        { label: 'New',       value: 'New / Open' },
        { label: 'Cancelled', value: 'Cancelled'  },
        { label: 'OnGoing',   value: 'Pending'    },
        { label: 'Dispute',   value: 'Dispute'    },
        { label: 'Completed', value: 'Completed'  },
        { label: 'All',       value: 'All'        },
    ];

    const loadBookings = useCallback(async () => {
        try {
            const data = await fetchBookings();
            const serialized = JSON.stringify(data);
            if (serialized === lastDataRef.current) return;
            lastDataRef.current = serialized;
            setBookings(data || []);
        } catch (error) {
            console.error('Failed to load bookings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadBookings();
            AsyncStorage.getItem('adminTable').then(t => setIsSuperAdmin(t === 'admins'));
            AsyncStorage.getItem('adminPhone').then(async phone => {
                if (phone) setRejectedIds(await getRejectedBookingIds(phone));
            });
            intervalRef.current = setInterval(loadBookings, 15000);
            return () => clearInterval(intervalRef.current);
        }, [loadBookings])
    );

    const toggleCard = useCallback((id: string) => {
        setOpenId(prev => (prev === id ? null : id));
    }, []);

    const handlePress = useCallback((id: string) => {
        const b = bookings.find(b => b.id === id);
        const s = (b?.status || '').toLowerCase().trim();
        if (s.includes('new') || s.includes('open')) {
            router.push({ pathname: '/admin/BookingDetails_1', params: { id } });
        } else {
            router.push({ pathname: '/admin/BookingDetails_2', params: { id } });
        }
    }, [bookings]);

    const sortedBookings = useMemo(() => {
        // Bookings awaiting staff confirmation are invisible to professionals —
        // they only appear once an Admin/Super Admin has confirmed them.
        const visible = isSuperAdmin
            ? bookings
            : bookings.filter(b =>
                (b.status || '').toLowerCase().trim() !== 'pending confirmation' &&
                !rejectedIds.has(b.id)
              );
        return [...visible].sort((a, b) => (Number(b.bookingId) || 0) - (Number(a.bookingId) || 0));
    }, [bookings, isSuperAdmin, rejectedIds]);

    // Count bookings per YYYY-MM-DD using startingDate
    const countsByDate = useMemo(() => {
        const counts: Record<string, number> = {};
        bookings.forEach(b => {
            const ymd = parseToYMD(b.startingDate || b.bookingDate || '');
            if (ymd) counts[ymd] = (counts[ymd] || 0) + 1;
        });
        return counts;
    }, [bookings]);

    const filteredData = useMemo(() => {
        let data = sortedBookings;

        // When a calendar date is selected, show ALL bookings for that date
        // (ignore the status filter so completed/cancelled bookings aren't hidden)
        if (selectedDate) {
            return data.filter(item => {
                const ymd = parseToYMD(item.startingDate || item.bookingDate || '');
                return ymd === selectedDate;
            });
        }

        if (filter !== 'All') {
            data = data.filter(item => {
                const status = (item.status || '').toLowerCase().trim();
                if (filter === 'Pending Confirmation') return status === 'pending confirmation';
                if (filter === 'Cancelled') return status.includes('cancel');
                if (filter === 'New / Open') return status.includes('new') || status.includes('open');
                if (filter === 'Dispute') return status.includes('dispute');
                if (filter === 'Pending') return status === 'pending';
                return status.includes(filter.toLowerCase());
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            data = data.filter(item =>
                String(item.bookingId || '').toLowerCase().includes(q) ||
                String(item.fullName || '').toLowerCase().includes(q) ||
                String(item.phone || '').toLowerCase().includes(q)
            );
        }
        return data;
    }, [filter, searchQuery, sortedBookings, selectedDate]);

    const renderItem = useCallback(({ item }: any) => (
        <BookingCard
            item={item}
            isOpen={openId === item.id}
            onToggle={() => toggleCard(item.id)}
            onPress={() => handlePress(item.id)}
            displayName={isSuperAdmin ? item.fullName : maskCustomerName(item.fullName)}
        />
    ), [openId, toggleCard, handlePress, isSuperAdmin]);

    // ── Calendar helpers ──────────────────────────────────────
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const today = todayYMD();

    const flatCells: (number | null)[] = [
        ...Array(firstDayOfWeek).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (flatCells.length % 7 !== 0) flatCells.push(null);
    // Split into rows of 7 to guarantee Saturday always appears
    const calendarWeeks: (number | null)[][] = [];
    for (let i = 0; i < flatCells.length; i += 7) calendarWeeks.push(flatCells.slice(i, i + 7));

    const prevMonth = () => setCalendarMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCalendarMonth(new Date(year, month + 1, 1));

    const cellDateYMD = (day: number) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const handleDayPress = (day: number) => {
        const ymd = cellDateYMD(day);
        setSelectedDate(prev => (prev === ymd ? null : ymd));
    };

    return (
        <View style={styles.screen}>
            <Header4 />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                {/* HEADER */}
                <View style={styles.headerRow}>
                    {showSearch ? (
                        <>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => { setShowSearch(false); setSearchQuery(''); }}
                            >
                                <Ionicons name="arrow-back" size={22} color={colors.brand} />
                            </TouchableOpacity>
                            <View style={styles.inlineSearchBox}>
                                <Ionicons name="search-outline" size={17} color={colors.textMuted} />
                                <TextInput
                                    autoFocus
                                    placeholder="Search"
                                    placeholderTextColor="rgba(67,67,67,0.6)"
                                    style={styles.inlineSearchInput}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCapitalize="none"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={17} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/Home')}>
                                <Image source={leftArrowIcon} style={styles.backBtn} />
                            </TouchableOpacity>
                            <Text style={styles.title}>Booking History</Text>
                            <TouchableOpacity style={styles.searchIconBtn} onPress={() => setShowSearch(true)}>
                                <Ionicons name="search-outline" size={20} color={colors.brand} />
                            </TouchableOpacity>
                            {isSuperAdmin && (
                                <TouchableOpacity
                                    style={styles.superAdminBtn}
                                    onPress={() => router.push('/admin/SuperAdminHistory')}
                                >
                                    <Ionicons name="shield-outline" size={20} color={colors.brand} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.calendarIconBtn}
                                onPress={() => {
                                    setShowCalendar(prev => !prev);
                                    setSelectedDate(null);
                                }}
                            >
                                <Ionicons
                                    name={showCalendar ? 'list-outline' : 'calendar-outline'}
                                    size={22}
                                    color={colors.brand}
                                />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {showCalendar ? (
                    <ScrollView contentContainerStyle={{ paddingBottom: hp('5%') }}>
                        {/* CALENDAR */}
                        <View style={styles.calendarCard}>
                            {/* Month nav */}
                            <View style={styles.calMonthRow}>
                                <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="chevron-back" size={20} color={colors.brand} />
                                </TouchableOpacity>
                                <Text style={styles.calMonthLabel}>
                                    {MONTH_NAMES[month]}, <Text style={{ fontWeight: '800' }}>{year}</Text>
                                </Text>
                                <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="chevron-forward" size={20} color={colors.brand} />
                                </TouchableOpacity>
                            </View>

                            {/* Day headers */}
                            <View style={styles.calDayHeaderRow}>
                                {DAY_NAMES.map(d => (
                                    <Text key={d} style={styles.calDayHeader}>{d}</Text>
                                ))}
                            </View>

                            {/* Grid — rendered as explicit rows so Saturday never disappears */}
                            <View>
                                {calendarWeeks.map((week, wi) => (
                                    <View key={wi} style={styles.calWeekRow}>
                                        {week.map((day, di) => {
                                            if (!day) return <View key={di} style={styles.calCell} />;
                                            const ymd = cellDateYMD(day);
                                            const count = countsByDate[ymd] || 0;
                                            const isToday = ymd === today;
                                            const isSelected = ymd === selectedDate;
                                            return (
                                                <TouchableOpacity
                                                    key={ymd}
                                                    style={[
                                                        styles.calCell,
                                                        isToday && styles.calCellToday,
                                                        isSelected && styles.calCellSelected,
                                                    ]}
                                                    onPress={() => handleDayPress(day)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[
                                                        styles.calDayNum,
                                                        isToday && styles.calDayNumToday,
                                                        isSelected && styles.calDayNumSelected,
                                                    ]}>
                                                        {day}
                                                    </Text>
                                                    {count > 0 && (
                                                        <Text style={[
                                                            styles.calCount,
                                                            isSelected && { color: '#fff' },
                                                        ]}>
                                                            {count}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>

                            {selectedDate && (
                                <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.clearDateBtn}>
                                    <Text style={styles.clearDateText}>Clear date filter</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Bookings for selected date */}
                        {selectedDate && (
                            <View style={{ paddingHorizontal: wp('4%') }}>
                                <Text style={styles.selectedDateLabel}>
                                    {formatGroupDate(selectedDate)}
                                    {' — '}{filteredData.length} Booking{filteredData.length !== 1 ? 's' : ''}
                                </Text>
                                {filteredData.map(item => (
                                    <BookingCard
                                        key={item.id}
                                        item={item}
                                        isOpen={openId === item.id}
                                        onToggle={() => toggleCard(item.id)}
                                        onPress={() => handlePress(item.id)}
                                        displayName={isSuperAdmin ? item.fullName : maskCustomerName(item.fullName)}
                                    />
                                ))}
                                {filteredData.length === 0 && (
                                    <Text style={styles.noBookingsText}>No bookings on this date.</Text>
                                )}
                            </View>
                        )}
                    </ScrollView>
                ) : (
                    <>
                        {/* FILTERS */}
                        <View style={styles.filterDropdownWrap}>
                            <TouchableOpacity
                                style={styles.filterDropBtn}
                                onPress={() => setShowFilterMenu(v => !v)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.filterDropBtnText}>
                                    {FILTERS.find(f => f.value === filter)?.label || 'All'}
                                </Text>
                                <Ionicons name={showFilterMenu ? 'chevron-up' : 'chevron-down'} size={18} color={colors.brand} />
                            </TouchableOpacity>
                            {showFilterMenu && (
                                <View style={styles.filterDropMenu}>
                                    {FILTERS.map(f => (
                                        <TouchableOpacity
                                            key={f.value}
                                            style={[styles.filterDropItem, filter === f.value && styles.filterDropItemActive]}
                                            onPress={() => { setFilter(f.value); setShowFilterMenu(false); }}
                                        >
                                            <Text style={[styles.filterDropItemText, filter === f.value && styles.filterDropItemTextActive]}>
                                                {f.label}
                                            </Text>
                                            {filter === f.value && <Ionicons name="checkmark" size={16} color={colors.brand} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

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
                            updateCellsBatchingPeriod={50}
                            keyboardDismissMode="on-drag"
                        />
                    </>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp('4%'),
        marginTop: hp('1.5%'),
        height: hp('5%'),
    },
    title: {
        flex: 1,
        fontSize: hp('2.3%'),
        fontWeight: '600',
        color: colors.brand,
        marginLeft: wp('2%'),
    },
    backButton: { padding: 4 },
    backBtn: { width: hp('3.5%'), height: hp('3.5%'), tintColor: colors.brand },
    calendarIconBtn: { padding: 4 },
    superAdminBtn: { padding: 4, marginRight: wp('2%') },
    searchIconBtn: { padding: 4, marginRight: wp('2%') },

    /* Inline expanding search (replaces header title/icons while active) */
    inlineSearchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 200,
        height: hp('5%'),
        paddingHorizontal: wp('3.5%'),
        marginLeft: wp('2%'),
    },
    inlineSearchInput: {
        flex: 1,
        fontSize: hp(1.8),
        fontWeight: '500',
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },

    /* Filter dropdown */
    filterDropdownWrap: {
        alignSelf: 'flex-start',
        minWidth: wp('45%'),
        marginHorizontal: wp('4%'),
        marginTop: hp('1.5%'),
        marginBottom: hp('2%'),
        zIndex: 20,
    },
    filterDropBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceMuted,
        borderRadius: 14,
        paddingHorizontal: wp('4%'),
        paddingVertical: hp('1.2%'),
        gap: 8,
    },
    filterDropBtnText: { fontSize: wp('3.6%'), fontWeight: '700', color: colors.brand },
    filterDropMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginTop: 4,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
    },
    filterDropItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp('4%'),
        paddingVertical: hp('1.3%'),
    },
    filterDropItemActive: { backgroundColor: colors.surfaceMuted },
    filterDropItemText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    filterDropItemTextActive: { color: colors.brand, fontWeight: '700' },

    /* Calendar */
    calendarCard: {
        margin: wp('4%'),
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: wp('4%'),
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    calMonthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: hp('2%'),
    },
    calMonthLabel: {
        fontSize: hp('2%'),
        fontWeight: '500',
        color: colors.textPrimary,
    },
    calDayHeaderRow: {
        flexDirection: 'row',
        marginBottom: hp('1%'),
    },
    calDayHeader: {
        flex: 1,
        textAlign: 'center',
        fontSize: hp('1.4%'),
        fontWeight: '600',
        color: colors.textMuted,
    },
    calWeekRow: {
        flexDirection: 'row',
    },
    calCell: {
        flex: 1,
        aspectRatio: 0.9,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingVertical: 2,
    },
    calCellToday: {
        backgroundColor: colors.surfaceMuted,
    },
    calCellSelected: {
        backgroundColor: colors.brand,
    },
    calDayNum: {
        fontSize: hp('2%'),
        fontWeight: '500',
        color: colors.textPrimary,
    },
    calDayNumToday: {
        color: colors.brand,
        fontWeight: '800',
    },
    calDayNumSelected: {
        color: '#fff',
        fontWeight: '800',
    },
    calCount: {
        fontSize: hp('1.2%'),
        fontWeight: '700',
        color: colors.brand,
        marginTop: 1,
    },
    clearDateBtn: {
        alignSelf: 'center',
        marginTop: hp('1.5%'),
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: colors.surfaceMuted,
        borderRadius: 20,
    },
    clearDateText: {
        fontSize: hp('1.5%'),
        color: colors.brand,
        fontWeight: '600',
    },
    selectedDateLabel: {
        fontSize: hp('1.8%'),
        fontWeight: '700',
        color: colors.brand,
        marginBottom: hp('1.5%'),
        marginTop: hp('0.5%'),
    },
    noBookingsText: {
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: hp('1.8%'),
        marginTop: hp('3%'),
    },
});
