import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    StyleSheet,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;


export default function AdminLogin() {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pin, setPin] = useState(['', '', '', '']);
    const pinRefs = useRef<Array<TextInput | null>>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('adminPhone').then((phone) => setIsLoggedIn(!!phone));
    }, []);

    const handlePinChange = (text: string, index: number) => {
        const digit = text.replace(/[^0-9]/g, '').slice(-1);
        const newPin = [...pin];
        newPin[index] = digit;
        setPin(newPin);

        if (digit && index < pin.length - 1) {
            pinRefs.current[index + 1]?.focus();
        }
    };

    const handlePinKeyPress = (event: any, index: number) => {
        if (event.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
            pinRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async () => {
        try {
            const password = pin.join('');
            if (!phoneNumber || password.length < 4) {
                Alert.alert('Error', 'Please enter phone and PIN');
                return;
            }
            const cleaned = phoneNumber.replace(/\s/g, '');

            // Check admins table first
            const { data: admin } = await supabase
                .from('admins')
                .select('id, full_name, status, pin')
                .eq('phone', cleaned)
                .single();

            // Then check workforce table
            const { data: worker } = await supabase
                .from('workforce')
                .select('uin, full_name, status, pin')
                .eq('phone', cleaned)
                .single();

            const isAdmin = admin && admin.status === 'Active' && admin.pin === password;
            const isWorker = worker && worker.status === 'Active' && worker.pin === password;

            if (!isAdmin && !isWorker) {
                Alert.alert('Login Failed', 'Invalid phone or PIN');
                return;
            }

            const displayName = (isAdmin ? admin?.full_name : worker?.full_name) || 'Admin';
            const adminTable = isAdmin ? 'admins' : 'workforce';
            await AsyncStorage.setItem('adminPhone', cleaned);
            await AsyncStorage.setItem('adminTable', adminTable);
            await AsyncStorage.setItem('userProfileSetupCompleted', 'true');
            try {
                const { OneSignal } = require('react-native-onesignal');
                OneSignal.login(cleaned);
                OneSignal.User.addTag('role', 'admin');
                OneSignal.User.addTag('phone', cleaned);
            } catch (e) {}
            setIsLoggedIn(true);
            Alert.alert('Welcome back!', `Hello, ${displayName.split(' ')[0]}!`, [
                { text: 'OK', onPress: () => router.push('/admin/BookingHistory') },
            ]);
        } catch (error: any) {
            Alert.alert('Login Failed', 'Invalid phone or PIN');
        }
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('adminPhone');
            try {
                const { OneSignal } = require('react-native-onesignal');
                OneSignal.logout();
            } catch (e) {}
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
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                    <Ionicons name="call-outline" size={20} color="#295C59" />
                    <TextInput
                        placeholder="98520 24 365"
                        placeholderTextColor="#B0BEC5"
                        style={styles.textInput}
                        keyboardType="number-pad"
                        value={phoneNumber}
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
                            color="#90A4AE"
                        />
                    </TouchableOpacity>
                </View>
                <View style={styles.pinBoxRow}>
                    {pin.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { pinRefs.current[index] = ref; }}
                            style={styles.pinBox}
                            secureTextEntry={!passwordVisible}
                            keyboardType="number-pad"
                            maxLength={1}
                            value={digit}
                            onChangeText={(text) => handlePinChange(text, index)}
                            onKeyPress={(event) => handlePinKeyPress(event, index)}
                        />
                    ))}
                </View>

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

                    <TouchableOpacity style={styles.changePinRow} onPress={() => router.push('/AdminChangePassword')}>
                        <Text style={styles.changePinText}>Reset PIN</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#295C59',
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
        color: '#fff',
        letterSpacing: 0.5,
    },
    brandSub: {
        fontSize: scaleFont(12),
        fontWeight: '600',
        color: 'rgba(255,255,255,0.65)',
        letterSpacing: 2,
    },

    /* CARD */
    card: {
        flex: 1,
        backgroundColor: '#F5F9F8',
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
        color: '#1C2B2A',
        marginBottom: hp('2.5%'),
    },

    /* INPUTS */
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#D6E8E7',
        paddingHorizontal: 14,
        height: hp('6.5%'),
        marginBottom: hp('2%'),
        gap: 10,
    },
    textInput: {
        flex: 1,
        fontSize: scaleFont(15),
        fontWeight: '500',
        color: '#1C2B2A',
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
        color: '#5A7270',
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
        borderColor: '#D6E8E7',
        backgroundColor: '#fff',
        textAlign: 'center',
        fontSize: scaleFont(18),
        fontWeight: '700',
        color: '#1C2B2A',
    },

    /* BUTTON */
    loginBtn: {
        backgroundColor: '#295C59',
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
        backgroundColor: '#D6E8E7',
        marginVertical: hp('3.5%'),
    },

    /* LINKS */
    linksBlock: {
        alignItems: 'center',
        gap: hp('1.6%'),
    },
    linkText: {
        fontSize: scaleFont(13.5),
        color: '#5A7270',
        fontWeight: '500',
    },
    linkAction: {
        color: '#295C59',
        fontWeight: '800',
    },
    changePinRow: {
        marginTop: hp('0.2%'),
    },
    changePinText: {
        fontSize: scaleFont(13.5),
        color: '#295C59',
        fontWeight: '600',
    },
    logoutText: {
        fontSize: scaleFont(13.5),
        color: '#E53935',
        fontWeight: '700',
        marginTop: hp('0.5%'),
    },
});
