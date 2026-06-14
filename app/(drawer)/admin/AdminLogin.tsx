import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Dimensions,
    StyleSheet,
    Alert,
} from 'react-native';
import PhoneIcon from '../../../assets/icons/admin/phone.png';
import EyeOffIcon from '../../../assets/icons/admin/eyeOff.png';
import EyeOnIcon from '../../../assets/icons/admin/eyeOn.png';
import KeyIcon from '../../../assets/icons/admin/key.png';

import CustomCheckbox from '../../../components/admin/CustomCheckbox';

import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { router } from 'expo-router';
import Header4 from '@/components/Header4Admin';
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../../../src/firebase/firebaseConfig"; // adjust path

const { width, height } = Dimensions.get('window');

const scaleFont = (size: number) => {
    const guidelineBaseWidth = 375;
    return (size * width) / guidelineBaseWidth;
};

export default function AdminLogin() {

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [phoneNumber, setphoneNumber] = useState<any>('');
    const [password, setPassword] = useState<any>('');

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    const handleSubmit = async () => {
        try {
            if (!phoneNumber || !password) {
                alert("Please enter phone and PIN");
                return;
            }

            const email = `${phoneNumber}@tackles.app`;
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user) {
                // 🟩 SET FLAG TO TRUE SO BOOKING SCREEN ALLOWS ENTRY
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.setItem('userProfileSetupCompleted', 'true');
                } catch (storageError) {
                    console.warn('Failed to save profile setup flag:', storageError);
                }

                try {
                    const { OneSignal } = require('react-native-onesignal');
                    OneSignal.login(user.uid);
                    OneSignal.User.addTag('role', 'career');
                    OneSignal.User.addTag('phone', phoneNumber);
                } catch (e) {
                    console.warn('OneSignal tagging failed:', e);
                }

                Alert.alert(
                    "Login Successful",
                    "Welcome back!",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                router.push('/admin/BookingHistory');
                            }
                        }
                    ]
                );
            }

        } catch (error: any) {
            console.log("Login error:", error.message);
            alert("Invalid phone or PIN");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            try {
                const { OneSignal } = require('react-native-onesignal');
                OneSignal.logout();
            } catch (e) {
                console.warn('OneSignal clean-up failure:', e);
            }
            setphoneNumber('');
            setPassword('');
            Alert.alert("Success", "Logged out cleanly.");
            router.push('/Home');
        } catch (error: any) {
            alert("Logout error: " + error.message);
        }
    };

    return (
        <View style={{ flex: 1 }} >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Header4 />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>Hello! Pro</Text>
                    <Text style={styles.subtitle}>Welcome to HomeSewa</Text>
                    <View style={styles.formContainer}>
                        <Text style={styles.welcomeText}>Login</Text>

                        <View style={styles.inputContainer}>
                            <Image source={PhoneIcon} style={{ width: 30, height: 30, tintColor: '#000' }} />
                            <TextInput
                                placeholder="Phone Number"
                                placeholderTextColor={'rgba(67, 67, 67,0.4)'}
                                style={styles.textInput}
                                keyboardType="number-pad"
                                autoCapitalize="none"
                                value={phoneNumber}
                                onChangeText={(value) => {
                                    let cleaned = value.replace(/[^0-9]/g, '');
                                    cleaned = cleaned.slice(0, 10);
                                    setphoneNumber(cleaned);
                                }}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Image source={KeyIcon} style={{ width: 30, height: 30, tintColor: '#000' }} />
                            <TextInput
                                placeholder="PIN"
                                placeholderTextColor={'rgba(67, 67, 67,0.4)'}
                                secureTextEntry={!passwordVisible}
                                style={styles.textInput}
                                value={password}
                                onChangeText={(value) => {
                                    let cleaned = value.replace(/[^0-9]/g, '');
                                    cleaned = cleaned.slice(0, 6);
                                    setPassword(cleaned);
                                }}
                                keyboardType="number-pad"
                            />
                            <TouchableOpacity onPress={togglePasswordVisibility}>
                                {passwordVisible ? (
                                    <Image source={EyeOnIcon} style={{ width: 23, height: 27, tintColor: 'hsl(0, 0%, 30%)' }} />
                                ) : (
                                    <Image source={EyeOffIcon} style={{ width: 22, height: 22, tintColor: 'hsl(0, 0%, 30%)' }} />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.btnContainerFlex}>
                            <TouchableOpacity>
                                <CustomCheckbox />
                            </TouchableOpacity>
                            <TouchableOpacity>
                                <Text style={styles.btnText}>Forgot PIN?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.loginButton} onPress={handleSubmit}>
                            <Text style={styles.loginButtonText}>Login</Text>
                        </TouchableOpacity>

                        <View style={styles.loginDivider} />

                        <Text style={styles.btnTextBelow}>Become a member :
                            <Text style={{ fontWeight: '900', color: 'black' }}
                                onPress={() => router.push('/Career')}
                            >
                                Join Now
                            </Text>
                        </Text>

                        <View style={{ marginTop: 2, width: '100%', alignItems: 'center', }}>
                            <TouchableOpacity onPress={() => router.push('/AdminChangePassword')}>
                                <Text style={styles.btnTextBelow}>Change PIN</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => router.push('/AdminCreate')}>

                                <Text style={styles.btnTextBelow}>Create Account</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleLogout}>
                                <Text style={[styles.btnTextBelow, { color: 'red', fontWeight: 'bold' }]}>Logout</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 0
    },
    header: {
        marginTop: hp('2%'),
        paddingHorizontal: wp('4%'),
    },
    divider: {
        borderBottomWidth: 1,
        borderColor: '#CAD2DF',
        marginTop: 16,
    },
    title: {
        fontSize: scaleFont(22),
        fontWeight: '900',
        marginTop: hp('10%'),
        width: '100%',
        color: 'green',
        paddingLeft: hp('3%')
    },
    subtitle: {
        width: '100%',
        fontSize: hp('1.63%'),
        paddingLeft: hp('3%'),
        fontWeight: '500',
        color: 'hsl(0, 0%, 20%)',
        marginBottom: hp('5%')
    },
    btnContainerFlex: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: hp('1%')
    },
    btnText: {
        color: '#333',
        fontWeight: '500',
        fontSize: hp('1.5%'),
        marginBottom: hp('0.3%')
    },
    btnTextBelow: {
        color: '#333',
        fontWeight: '500',
        fontSize: hp('1.5%'),
    },
    formContainer: {
        paddingHorizontal: '10%',
        width: '100%',
        alignItems: 'center',
        paddingVertical: hp('3%'),
        backgroundColor: '#ebffef',
        paddingBottom: hp('30%'),
        marginTop: hp('5%'),
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        borderColor: 'rgba(0, 0, 0,0.1)',
        borderWidth: 1
    },
    image: {
        width: wp('40%'),
        height: hp('20%'),
        resizeMode: 'contain',
        borderRadius: 200
    },
    welcomeText: {
        fontSize: scaleFont(22),
        fontWeight: '900',
        marginTop: height * 0.01,
        marginBottom: height * 0.04,
        width: '100%',
        color: 'green',
        paddingHorizontal: hp('1.3%')
    },
    inputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderWidth: 1,
        width: '100%',
        marginBottom: '5%',
        borderRadius: 12,
        borderColor: 'rgba(0, 0, 0,0.1)',
        alignItems: 'center',
        height: hp('6%'),
        backgroundColor: '#fff'
    },
    textInput: {
        fontSize: scaleFont(17),
        fontWeight: '600',
        flex: 1,
        paddingHorizontal: hp('2%'),
        letterSpacing: 0.5
    },
    loginButton: {
        marginTop: height * 0.07,
        height: height * 0.06,
        width: '95%',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'green'
    },
    loginButtonText: {
        fontSize: scaleFont(13),
        fontWeight: '600',
        color: '#fff',
    },
    loginDivider: {
        borderWidth: 1,
        width: '100%',
        borderColor: 'hsl(0, 0%, 33%)',
        marginBottom: hp('2%'),
        marginTop: hp('7%')
    },
    areaLabel: {
        fontSize: hp('1.9%'),
        fontWeight: '600',
        width: '100%',
        marginBottom: hp('1%'),
        color: 'hsl(0, 0%, 30%)',
        paddingHorizontal: hp('1%'),
    }
});