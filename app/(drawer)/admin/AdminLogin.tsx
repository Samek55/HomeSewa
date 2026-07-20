import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Dimensions,
    StyleSheet,
    Alert,
    Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import OtpInput from '@/components/bookings/OtpInput';
import { router } from 'expo-router';
import countryLogo from '../../../assets/images/NEW-Flag_of_Nepal.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { invokeEdgeFunction } from '../../../api/functionsClient';
import { DeviceEventEmitter } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const { width } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;


export default function AdminLogin() {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pin, setPin] = useState(['', '', '', '']);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeInput, setActiveInput] = useState<string | null>(null);

    useEffect(() => {
        AsyncStorage.getItem('adminPhone').then((phone) => setIsLoggedIn(!!phone));
    }, []);

    const handleSubmit = async () => {
        try {
            const password = pin.join('');
            if (!phoneNumber || password.length < 4) {
                Alert.alert('Error', 'Please enter phone and PIN');
                return;
            }
            const cleaned = phoneNumber.replace(/\s/g, '');

            // PIN check happens server-side in the admin-login Edge Function, which
            // compares against the bcrypt pin_hash (never the plaintext pin column)
            // and rate-limits/locks out after repeated failures. The client must
            // never read admin/professional PIN data directly — those tables are
            // open to the anon key for other columns, so a client-side comparison
            // would let anyone with the app installed pull every account's PIN.
            const { data, error } = await supabase.functions.invoke('admin-login', {
                body: { phone: cleaned, pin: password },
            });

            let result: any = data;
            if (error) {
                if (error instanceof FunctionsHttpError) {
                    try { result = await error.context.json(); } catch { result = null; }
                }
                if (!result) {
                    Alert.alert('Login Failed', 'Invalid phone or PIN');
                    return;
                }
            }

            if (!result.success) {
                if (result.status === 'Pending') {
                    Alert.alert(
                        'Approval Pending',
                        'Your application is currently under review by the admin. You will receive an SMS with your login details once your profile is approved.\n\nThank you for your patience.'
                    );
                    return;
                }
                if (result.status === 'Rejected') {
                    Alert.alert(
                        'Application Rejected',
                        'Your professional application was not approved. Please contact HomeSewa support for more information.'
                    );
                    return;
                }
                if (result.status === 'Inactive') {
                    Alert.alert(
                        'Account Disabled',
                        'Your account has been disabled by the admin. Please contact HomeSewa support.'
                    );
                    return;
                }
                Alert.alert('Login Failed', result.message || 'Invalid phone or PIN');
                return;
            }

            const isProfessional = result.role === 'professional';

            // Best-effort profile enrichment (city/services) for OneSignal tags.
            let worker: any = null;
            if (isProfessional) {
                const { data: wf } = await supabase
                    .from('workforce')
                    .select('services, working_areas')
                    .or(`phone.eq.${cleaned},phone.eq.977${cleaned}`)
                    .maybeSingle();
                worker = wf;
            }

            const displayName = result.displayName || 'Admin';
            const adminTable = isProfessional ? 'workforce' : 'admins';
            await AsyncStorage.setItem('adminPhone', cleaned);
            await AsyncStorage.setItem('adminTable', adminTable);
            await AsyncStorage.setItem('adminRole', result.role || '');
            await AsyncStorage.setItem('userProfileSetupCompleted', 'true');
            // Server-verifiable session (0021_admin_sessions.sql) — required by
            // admin-create/approve-professional/reject-professional/
            // toggle-professional-status so those can no longer be called by
            // anyone holding just the anon key.
            if (result.sessionToken) {
                await AsyncStorage.setItem('adminSessionToken', result.sessionToken);
            }
            try {
                const { OneSignal } = require('react-native-onesignal');
                OneSignal.login(cleaned);
                OneSignal.User.addTag('phone', cleaned);
                if (isProfessional) {
                    OneSignal.User.addTag('role', 'career');
                    OneSignal.User.addTag('city', (worker?.working_areas || [])[0] || '');
                    OneSignal.User.addTag('services', (worker?.services || [])[0] || '');
                } else {
                    OneSignal.User.addTag('role', 'admin');
                }
            } catch (e) {}
            setIsLoggedIn(true);
            DeviceEventEmitter.emit('authChanged');
            Alert.alert('Welcome back!', `Hello, ${displayName.split(' ')[0]}!`, [
                { text: 'OK', onPress: () => router.push('/admin/BookingHistory') },
            ]);
        } catch (error: any) {
            Alert.alert('Login Failed', 'Invalid phone or PIN');
        }
    };

    const handleLogout = async () => {
        try {
            // Revokes the session server-side — deleting the row is what makes
            // this a real logout, not just clearing local state (the token
            // would otherwise quietly keep working until its 30-day expiry).
            invokeEdgeFunction('logout', {}, '', { requireSession: true }).catch(() => {});
            await AsyncStorage.multiRemove(['adminPhone', 'adminTable', 'adminRole', 'adminSessionToken']);
            try {
                const { OneSignal } = require('react-native-onesignal');
                OneSignal.logout();
            } catch (e) {}
            DeviceEventEmitter.emit('authChanged');
            setIsLoggedIn(false);
            setPhoneNumber('');
            setPin(['', '', '', '']);
            Alert.alert('Logged out', 'See you soon!');
            router.push('/Home');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <KeyboardAwareScrollView
            style={styles.screen}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={20}
        >
            {/* HEADER NAV */}
            <Header4 />

            {/* BRANDING SECTION */}
            <View style={styles.branding}>
                <View style={styles.lockRing}>
                    <Image
                        source={require('../../../assets/icons/admin/lock.png')}
                        style={styles.lockIcon}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.brandName}>HomeSewa</Text>
                <Text style={styles.brandSub}>ADMIN LOGIN</Text>
            </View>

            {/* LOGIN CARD */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Sign In</Text>

                {/* Phone */}
                <View style={styles.inputRow}>
                    <Image source={countryLogo} style={{ width: 28, height: 18 }} resizeMode="contain" />
                    <TextInput
                        placeholder={activeInput === 'phone' ? '' : '98520 24 365'}
                        placeholderTextColor={colors.textMuted}
                        style={styles.textInput}
                        keyboardType="number-pad"
                        value={phoneNumber}
                        onFocus={() => setActiveInput('phone')}
                        onBlur={() => setActiveInput(null)}
                        onChangeText={(value) => {
                            let cleaned = value.replace(/[^0-9]/g, '').slice(0, 10);
                            let formatted = cleaned;
                            if (cleaned.length > 5 && cleaned.length <= 7) {
                                formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5);
                            } else if (cleaned.length > 7) {
                                formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5, 7) + ' ' + cleaned.slice(7);
                            }
                            setPhoneNumber(formatted);
                        }}
                    />
                </View>

                {/* PIN */}
                <View style={styles.pinRow}>
                    <Text style={styles.pinLabel}>PIN</Text>
                    <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons
                            name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
                            size={18}
                            color={colors.textMuted}
                        />
                    </TouchableOpacity>
                </View>
                <OtpInput
                    value={pin}
                    onChange={setPin}
                    secureTextEntry={!passwordVisible}
                    containerStyle={styles.pinBoxRow}
                    boxStyle={styles.pinBox}
                />

                {/* Login Button */}
                <TouchableOpacity style={styles.loginBtn} onPress={handleSubmit} activeOpacity={0.85}>
                    <Text style={styles.loginBtnText}>Login</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Links */}
                <View style={styles.linksBlock}>
                    <TouchableOpacity onPress={() => router.push('/Career')}>
                        <Text style={styles.linkText}>
                            Join as Professional :{' '}
                            <Text style={styles.linkAction}>Join Now</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.changePinRow} onPress={() => router.push({ pathname: '/AdminChangePassword', params: { mode: 'reset' } } as any)}>
                        <Text style={styles.changePinText}>Reset PIN</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </KeyboardAwareScrollView>
    );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        // Matches the branding area behind it, so the sliver exposed by the
        // card's rounded top corners blends in instead of showing a seam.
        backgroundColor: isDark ? colors.surface : colors.brand,
    },

    /* BRANDING */
    branding: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: hp('3%'),
        gap: hp('1%'),
    },
    lockRing: {
        width: wp('22%'),
        height: wp('22%'),
        borderRadius: wp('11%'),
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: hp('1%'),
    },
    lockIcon: {
        width: wp('14%'),
        height: wp('14%'),
    },
    brandName: {
        fontSize: scaleFont(26),
        fontWeight: '800',
        color: isDark ? colors.textPrimary : '#fff',
        letterSpacing: 0.5,
    },
    brandSub: {
        fontSize: scaleFont(12),
        fontWeight: '600',
        color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.65)',
        letterSpacing: 2,
    },

    /* CARD */
    card: {
        flex: 1,
        backgroundColor: colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: wp('8%'),
        paddingTop: hp('3%'),
        paddingBottom: hp('3%'),
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: scaleFont(24),
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: hp('2.5%'),
    },

    /* INPUTS */
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: 14,
        height: hp('6.5%'),
        marginBottom: hp('2%'),
        gap: 10,
    },
    textInput: {
        flex: 1,
        fontSize: scaleFont(15),
        fontWeight: '500',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },

    /* PIN */
    pinRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp('1%'),
    },
    pinLabel: {
        fontSize: scaleFont(13),
        fontWeight: '700',
        color: colors.textSecondary,
    },
    pinBoxRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: hp('2%'),
    },
    pinBox: {
        width: wp('12%'),
        height: hp('6.5%'),
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        textAlign: 'center',
        fontSize: scaleFont(18),
        fontWeight: '700',
        color: colors.textPrimary,
    },

    /* BUTTON */
    loginBtn: {
        backgroundColor: colors.brand,
        borderRadius: 14,
        height: hp('6.5%'),
        width: '60%',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: hp('1.5%'),
        elevation: 4,
        shadowColor: '#295C59',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    loginBtnText: {
        color: '#fff',
        fontSize: scaleFont(15),
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    /* DIVIDER */
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: hp('3.5%'),
    },

    /* LINKS */
    linksBlock: {
        alignItems: 'center',
        gap: hp('1.6%'),
    },
    linkText: {
        fontSize: scaleFont(13.5),
        color: colors.textSecondary,
        fontWeight: '500',
    },
    linkAction: {
        color: colors.brand,
        fontWeight: '800',
    },
    changePinRow: {
        marginTop: hp('0.2%'),
    },
    changePinText: {
        fontSize: scaleFont(13.5),
        color: colors.brand,
        fontWeight: '600',
    },
    logoutText: {
        fontSize: scaleFont(13.5),
        color: colors.danger,
        fontWeight: '700',
        marginTop: hp('0.5%'),
    },
});
