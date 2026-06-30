import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, DeviceEventEmitter } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

type Profile = {
    fullName: string;
    phone: string;
    photoUrl: string | null;
};

export default function CustomDrawer(props: DrawerContentComponentProps) {
    const pathname = usePathname();
    const isActive = (route: string) => pathname === route;

    const [adminPhone, setAdminPhone] = useState<string | null>(null);
    const [adminTable, setAdminTable] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    const loadProfile = useCallback(async () => {
        const phone = await AsyncStorage.getItem('adminPhone');
        const table = await AsyncStorage.getItem('adminTable');
        setAdminPhone(phone);
        setAdminTable(table);

        if (phone && table === 'workforce') {
            try {
                const { data } = await supabase
                    .from('workforce')
                    .select('full_name, photo_url')
                    .eq('phone', phone)
                    .single();
                if (data) {
                    setProfile({
                        fullName: data.full_name || '',
                        phone,
                        photoUrl: data.photo_url || null,
                    });
                }
            } catch {}
        } else if (phone && table === 'admins') {
            try {
                const { data } = await supabase
                    .from('admins')
                    .select('full_name')
                    .eq('phone', phone)
                    .single();
                if (data) {
                    setProfile({
                        fullName: data.full_name || '',
                        phone,
                        photoUrl: null,
                    });
                }
            } catch {}
        } else {
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
                    <MenuItem icon="home-outline" label="Home" active={isActive('/Home')} onPress={() => navigate('/Home')} superAdmin={adminTable === 'admins'} />
                    {adminTable !== 'admins' && (
                        <MenuItem icon="construct-outline" label="Services" active={isActive('/Service')} onPress={() => navigate('/Service')} />
                    )}
                    {isLoggedIn && (
                        <MenuItem icon="time-outline" label="Booking History" active={isActive('/admin/BookingHistory')} onPress={() => navigate('/admin/BookingHistory')} superAdmin={adminTable === 'admins'} />
                    )}
                    {adminTable === 'admins' && (
                        <MenuItem icon="chatbox-ellipses-outline" label="Help Box" active={isActive('/admin/HelpBox')} onPress={() => navigate('/admin/HelpBox')} superAdmin />
                    )}

                    {!isLoggedIn && (
                        <MenuItem icon="calendar-outline" label="Book a Service" active={isActive('/Book')} onPress={() => navigate('/Book')} />
                    )}
                    {!isLoggedIn && (
                        <MenuItem icon="briefcase-outline" label="Join as Professional" active={isActive('/Career')} onPress={() => navigate('/Career')} />
                    )}

                    {adminTable !== 'admins' && <View style={styles.divider} />}

                    {adminTable !== 'admins' && (
                        <MenuItem icon="information-circle-outline" label="About Us" active={isActive('/About')} onPress={() => navigate('/About')} />
                    )}
                    {adminTable !== 'admins' && (
                        <MenuItem icon="call-outline" label="Contact" active={isActive('/Contact')} onPress={() => navigate('/Contact')} />
                    )}
                    {adminTable !== 'admins' && (
                        <MenuItem icon="help-circle-outline" label="FAQs" active={isActive('/FAQs')} onPress={() => navigate('/FAQs')} />
                    )}
                    {adminTable !== 'admins' && (
                        <MenuItem icon="book-outline" label="Glossary" active={isActive('/Glossary')} onPress={() => navigate('/Glossary')} />
                    )}

                    {adminTable === 'admins' && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionLabel}>Super Admin</Text>
                            <MenuItem icon="people-outline" label="User Management" active={isActive('/admin/UserManagement')} onPress={() => navigate('/admin/UserManagement')} superAdmin />
                            <MenuItem icon="shield-checkmark-outline" label="Verification" active={isActive('/admin/ProfessionalVerification')} onPress={() => navigate('/admin/ProfessionalVerification')} superAdmin />
                            <MenuItem icon="notifications-outline" label="Notifications" active={isActive('/admin/AdminNotifications')} onPress={() => navigate('/admin/AdminNotifications')} superAdmin />
                        </>
                    )}

                    {!isLoggedIn && <View style={styles.divider} />}

                    {!isLoggedIn && (
                        <MenuItem icon="people-outline" label="Become a Partner" active={isActive('/Partnership')} onPress={() => navigate('/Partnership')} />
                    )}

                    {isLoggedIn && (
                        <MenuItem icon="key-outline" label="Change PIN" active={isActive('/AdminChangePassword')} onPress={() => { props.navigation.closeDrawer(); router.push({ pathname: '/AdminChangePassword', params: { mode: 'change' } } as any); }} superAdmin={adminTable === 'admins'} />
                    )}
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
                            {isLoggedIn ? 'Update Profile' : 'Admin Login'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
}

function MenuItem({ icon, label, onPress, active, superAdmin }: any) {
    const compact = !!superAdmin;
    return (
        <TouchableOpacity
            style={[styles.item, active && styles.itemActive, compact && styles.itemCompact]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, active && styles.iconBoxActive, compact && styles.iconBoxCompact]}>
                <Ionicons name={icon} size={compact ? 20 : 22} color={active ? '#295C59' : '#6B7280'} />
            </View>
            <Text style={[styles.label, active && styles.labelActive, compact && styles.labelCompact]}>{label}</Text>
            {active && <View style={styles.activeBar} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
    },
    card: {
        height: SCREEN_H * 0.88,
        backgroundColor: '#fff',
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
        backgroundColor: '#fff',
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
        borderColor: '#eee',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 14,
    },
    itemActive: {
        backgroundColor: '#E8F4F3',
    },
    itemCompact: {
        paddingVertical: 9,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 11,
        backgroundColor: '#F0F4F3',
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
        color: '#4B5563',
        flex: 1,
    },
    labelActive: {
        color: '#295C59',
        fontWeight: '700',
    },
    labelCompact: {
        fontSize: 14.5,
    },
    activeBar: {
        width: 3,
        height: 20,
        borderRadius: 2,
        backgroundColor: '#295C59',
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#9BBAB8',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    adminWrapper: {
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
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
