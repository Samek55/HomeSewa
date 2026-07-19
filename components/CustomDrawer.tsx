import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, DeviceEventEmitter, Switch } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { ThemeColors } from '../theme/colors';

type Profile = {
    fullName: string;
    phone: string;
    photoUrl: string | null;
};

export default function CustomDrawer(props: DrawerContentComponentProps) {
    const { colors, isDark, toggle } = useTheme();
    const { language, setLanguage } = useLanguage();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const pathname = usePathname();
    const isActive = (route: string) => pathname === route;

    const [adminPhone, setAdminPhone] = useState<string | null>(null);
    const [adminTable, setAdminTable] = useState<string | null>(null);
    const [adminRole, setAdminRole] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    const loadProfile = useCallback(async () => {
        const phone = await AsyncStorage.getItem('adminPhone');
        const table = await AsyncStorage.getItem('adminTable');
        const role = await AsyncStorage.getItem('adminRole');
        setAdminPhone(phone);
        setAdminTable(table);
        setAdminRole(role);

        if (!phone) { setProfile(null); return; }

        try {
            // Super admins/admins live in `admin`; professionals live in their own
            // `professional` table — both are guaranteed to exist since they're
            // what AdminLogin just authenticated this session against.
            const isProfessional = table === 'workforce';
            const { data: accountRow } = await supabase
                .from(isProfessional ? 'professional' : 'admin')
                .select('full_name, photo_url')
                .eq('phone', phone)
                .maybeSingle();

            let photoUrl: string | null = null;
            if (isProfessional) {
                // Prefer their richer workforce headshot, matching either phone format
                // (legacy rows store a 977 prefix); fall back to the professional record's
                // own photo_url if no workforce row/headshot exists.
                const { data: wf } = await supabase
                    .from('workforce')
                    .select('headshot_url')
                    .or(`phone.eq.${phone},phone.eq.977${phone}`)
                    .maybeSingle();
                photoUrl = wf?.headshot_url || accountRow?.photo_url || null;
            } else {
                photoUrl = accountRow?.photo_url || null;
            }

            setProfile(accountRow ? { fullName: accountRow.full_name || '', phone, photoUrl } : null);
        } catch {
            setProfile(null);
        }
    }, []);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    // Refresh whenever login or logout happens
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('authChanged', loadProfile);
        return () => sub.remove();
    }, [loadProfile]);

    const isLoggedIn = !!adminPhone;

    const navigate = (path: string) => {
        props.navigation.closeDrawer();
        router.push(path as any);
    };

    return (
        <SafeAreaView style={styles.wrapper} edges={['top', 'bottom']}>
            <View style={styles.card}>

                {/* PROFILE HEADER */}
                <LinearGradient colors={['#295C59', '#1E4542']} style={styles.profileHeader}>
                    <View style={styles.avatarWrapper}>
                        {isLoggedIn && profile?.photoUrl ? (
                            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} resizeMode="cover" />
                        ) : (
                            <Image source={require('../assets/images/homesewa.png')} style={styles.avatar} resizeMode="contain" />
                        )}
                    </View>
                    {isLoggedIn && profile ? (
                        <>
                            <Text style={styles.brandName}>{profile.fullName}</Text>
                            <Text style={styles.brandTagline}>+977 {profile.phone}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.brandName}>HomeSewa</Text>
                            <Text style={styles.brandTagline}>Express Home Service</Text>
                        </>
                    )}
                </LinearGradient>

                {/* MENU */}
                <View style={styles.menu}>
                    <MenuItem icon="home-outline" label="Home" active={isActive('/Home')} onPress={() => navigate('/Home')} superAdmin={adminTable === 'admins'} compact={!isLoggedIn} />
                    {adminTable !== 'admins' && (
                        <MenuItem icon="construct-outline" label="Services" active={isActive('/Service')} onPress={() => navigate('/Service')} compact={!isLoggedIn} />
                    )}
                    {isLoggedIn && (
                        <MenuItem icon="time-outline" label="Booking History" active={isActive('/admin/BookingHistory')} onPress={() => navigate('/admin/BookingHistory')} superAdmin={adminTable === 'admins'} />
                    )}
                    <MenuItem
                        icon="notifications-outline"
                        label="Notifications"
                        active={isActive('/Notifications') || isActive('/admin/AdminNotifications')}
                        onPress={() => navigate(adminRole === 'super_admin' ? '/admin/AdminNotifications' : '/Notifications')}
                        superAdmin={adminTable === 'admins'}
                        compact={!isLoggedIn}
                    />
                    {adminTable === 'admins' && (
                        <MenuItem icon="pricetags-outline" label="Popup Banner" active={isActive('/admin/AdminRoadBlock')} onPress={() => navigate('/admin/AdminRoadBlock')} superAdmin />
                    )}
                    {adminTable === 'admins' && (
                        <MenuItem icon="chatbox-ellipses-outline" label="Help Box" active={isActive('/admin/HelpBox')} onPress={() => navigate('/admin/HelpBox')} superAdmin />
                    )}

                    {!isLoggedIn && (
                        <MenuItem icon="calendar-outline" label="Book a Service" active={isActive('/Book')} onPress={() => navigate('/Book')} compact />
                    )}
                    {!isLoggedIn && (
                        <MenuItem icon="briefcase-outline" label="Join as Professional" active={isActive('/Career')} onPress={() => navigate('/Career')} compact />
                    )}

                    {adminTable !== 'admins' && <View style={styles.divider} />}

                    {adminTable !== 'admins' && (
                        <MenuItem icon="help-circle-outline" label="FAQs" active={isActive('/FAQs')} onPress={() => navigate('/FAQs')} compact={!isLoggedIn} />
                    )}
                    {adminTable !== 'admins' && (
                        <MenuItem icon="book-outline" label="Glossary" active={isActive('/Glossary')} onPress={() => navigate('/Glossary')} compact={!isLoggedIn} />
                    )}
                    {adminTable !== 'admins' && (
                        <MenuItem icon="heart-outline" label="Favorites" active={isActive('/Favorites')} onPress={() => navigate('/Favorites')} compact={!isLoggedIn} />
                    )}

                    {adminTable === 'admins' && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionLabel}>Super Admin</Text>
                            <MenuItem icon="people-outline" label="User Management" active={isActive('/admin/UserManagement')} onPress={() => navigate('/admin/UserManagement')} superAdmin />
                            <MenuItem icon="shield-checkmark-outline" label="Verification" active={isActive('/admin/ProfessionalVerification')} onPress={() => navigate('/admin/ProfessionalVerification')} superAdmin />
                            <MenuItem icon="briefcase-outline" label="Partnerships" active={isActive('/admin/PartnershipApplications')} onPress={() => navigate('/admin/PartnershipApplications')} superAdmin />
                        </>
                    )}

                    {!isLoggedIn && <View style={styles.divider} />}

                    {!isLoggedIn && (
                        <MenuItem icon="people-outline" label="Become a Partner" active={isActive('/Partnership')} onPress={() => navigate('/Partnership')} compact />
                    )}

                    {isLoggedIn && (
                        <MenuItem icon="key-outline" label="Change PIN" active={isActive('/AdminChangePassword')} onPress={() => { props.navigation.closeDrawer(); router.push({ pathname: '/AdminChangePassword', params: { mode: 'change' } } as any); }} superAdmin={adminTable === 'admins'} />
                    )}
                </View>

                {/* THEME TOGGLE */}
                <View style={styles.themeRow}>
                    <View style={styles.themeRowLabel}>
                        <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.textSecondary} />
                        <Text style={styles.themeRowText}>Dark Mode</Text>
                    </View>
                    <Switch
                        value={isDark}
                        onValueChange={toggle}
                        trackColor={{ false: '#D1D5DB', true: colors.brand }}
                        thumbColor="#fff"
                    />
                </View>

                {/* LANGUAGE TOGGLE */}
                <View style={styles.themeRow}>
                    <View style={styles.themeRowLabel}>
                        <Ionicons name="language-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.themeRowText}>{language === 'ne' ? 'नेपाली' : 'English'}</Text>
                    </View>
                    <Switch
                        value={language === 'ne'}
                        onValueChange={(value) => setLanguage(value ? 'ne' : 'en')}
                        trackColor={{ false: '#D1D5DB', true: colors.brand }}
                        thumbColor="#fff"
                    />
                </View>

                {/* ADMIN LOGIN / UPDATE PROFILE */}
                <View style={styles.adminWrapper}>
                    <TouchableOpacity
                        style={styles.adminBtn}
                        onPress={() => navigate(isLoggedIn ? '/admin/UpdateProfile' : '/Admin')}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name={isLoggedIn ? 'person-outline' : 'shield-checkmark-outline'}
                            size={16}
                            color="#fff"
                        />
                        <Text style={styles.adminBtnText}>
                            {isLoggedIn ? 'Update Profile' : 'Login'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
}

function MenuItem({ icon, label, onPress, active, superAdmin, compact: compactProp }: any) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const compact = !!superAdmin || !!compactProp;
    return (
        <TouchableOpacity
            style={[styles.item, active && styles.itemActive, compact && styles.itemCompact]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, active && styles.iconBoxActive, compact && styles.iconBoxCompact]}>
                <Ionicons name={icon} size={compact ? 20 : 22} color={active ? colors.brand : colors.textSecondary} />
            </View>
            <Text style={[styles.label, active && styles.labelActive, compact && styles.labelCompact]}>{label}</Text>
            {active && <View style={styles.activeBar} />}
        </TouchableOpacity>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
    },
    card: {
        height: SCREEN_H * 0.90,
        backgroundColor: colors.surface,
        borderRadius: 30,
        marginHorizontal: 10,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },

    profileHeader: {
        paddingTop: 14,
        paddingBottom: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    avatarWrapper: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.6)',
        overflow: 'hidden',
        marginBottom: 6,
        backgroundColor: colors.surface,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    brandName: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
    },
    brandTagline: {
        fontSize: 10,
        fontWeight: '400',
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
        marginBottom: 4,
    },

    menu: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 4,
        justifyContent: 'space-evenly',
    },
    divider: {
        borderTopWidth: 1,
        borderColor: colors.divider,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 14,
    },
    itemActive: {
        backgroundColor: colors.surfaceMuted,
    },
    itemCompact: {
        paddingVertical: 6,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 11,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 13,
    },
    iconBoxActive: {
        backgroundColor: '#C9E8E6',
    },
    iconBoxCompact: {
        width: 38,
        height: 38,
        borderRadius: 10,
        marginRight: 11,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textSecondary,
        flex: 1,
    },
    labelActive: {
        color: colors.brand,
        fontWeight: '700',
    },
    labelCompact: {
        fontSize: 14.5,
    },
    activeBar: {
        width: 3,
        height: 20,
        borderRadius: 2,
        backgroundColor: colors.brand,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    themeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    themeRowLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    themeRowText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    adminWrapper: {
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    adminBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        backgroundColor: '#295C59',
        paddingVertical: 10,
        paddingHorizontal: 28,
        borderRadius: 20,
    },
    adminBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
});
