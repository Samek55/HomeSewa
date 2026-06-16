import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;

const DUMMY_ADMIN_PHONE = '9852024365';
const DUMMY_ADMIN_PIN = '1234';

export default function AdminLogin() {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('adminPhone').then((phone) => setIsLoggedIn(!!phone));
    }, []);

    const handleSubmit = async () => {
        try {
            if (!phoneNumber || !password) {
                Alert.alert('Error', 'Please enter phone and PIN');
                return;
            }
            const cleaned = phoneNumber.replace(/\s/g, '');
            if (cleaned !== DUMMY_ADMIN_PHONE || password !== DUMMY_ADMIN_PIN) {
                Alert.alert('Login Failed', 'Invalid phone or PIN');
                return;
            }
            await AsyncStorage.setItem('adminPhone', cleaned);
            await AsyncStorage.setItem('userProfileSetupCompleted', 'true');
            try {
                const { OneSignal } = require('react-native-onesignal');
                OneSignal.login(cleaned);
                OneSignal.User.addTag('role', 'admin');
                OneSignal.User.addTag('phone', cleaned);
            } catch (e) {}
            setIsLoggedIn(true);
            Alert.alert('Welcome back!', 'Login successful.', [
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
            setPassword('');
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
                <View style={styles.inputRow}>
                    <Ionicons name="key-outline" size={20} color="#295C59" />
                    <TextInput
                        placeholder="PIN"
                        placeholderTextColor="#B0BEC5"
                        secureTextEntry={!passwordVisible}
                        style={styles.textInput}
                        keyboardType="number-pad"
                        value={password}
                        onChangeText={(value) => setPassword(value.replace(/[^0-9]/g, '').slice(0, 6))}
                    />
                    <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons
                            name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
                            size={20}
                            color="#90A4AE"
                        />
                    </TouchableOpacity>
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

                    {isLoggedIn && (
                        <TouchableOpacity onPress={handleLogout}>
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    )}
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

    /* CARD */
    card: {
        flex: 1,
        backgroundColor: '#F5F9F8',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: wp('8%'),
        paddingTop: hp('3%'),
        paddingBottom: hp('3%'),
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

    /* BUTTON */
    loginBtn: {
        backgroundColor: '#295C59',
        borderRadius: 14,
        height: hp('6.5%'),
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
