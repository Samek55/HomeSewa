import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { invokeEdgeFunction } from '../../api/functionsClient';
import Header4 from '@/components/Header4Admin';
import OtpInput from '@/components/bookings/OtpInput';

const { width } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;

interface SendOtpResponse { success: boolean; message?: string }
interface SetPinResponse { success: boolean; message?: string; fullName?: string }

export default function AdminChangePassword() {
    const { mode } = useLocalSearchParams<{ mode?: string }>();
    // 'change' = logged-in user updating PIN (no phone needed)
    // 'reset'  = forgot PIN, phone number required
    const isChangePinMode = mode === 'change';

    const [loading, setLoading] = useState(false);
    const [loggedInPhone, setLoggedInPhone] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const [pinVisible, setPinVisible] = useState(false);

    // Reset-PIN mode (forgot PIN) verifies identity via SMS OTP instead of the current PIN,
    // since someone who forgot their PIN by definition can't provide it.
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpBoxes, setOtpBoxes] = useState(['', '', '', '']);

    // 4-box PIN state — used by both modes
    const [oldBoxes, setOldBoxes] = useState(['', '', '', '']);
    const [newBoxes, setNewBoxes] = useState(['', '', '', '']);
    const [confirmBoxes, setConfirmBoxes] = useState(['', '', '', '']);

    useEffect(() => {
        if (isChangePinMode) {
            AsyncStorage.getItem('adminPhone').then(p => setLoggedInPhone(p));
        }
    }, [isChangePinMode]);

    // Reset mode only: look up the account by phone and text it a one-time code.
    // This is the identity check for someone who forgot their PIN.
    const handleSendOtp = async () => {
        const cleaned = phoneNumber.replace(/\s/g, '');
        if (!cleaned || cleaned.length < 10) {
            Alert.alert('Validation Error', 'Please enter your phone number');
            return;
        }

        setSendingOtp(true);
        try {
            const result = await invokeEdgeFunction<SendOtpResponse>(
                'send-otp',
                { phone: cleaned, purpose: 'pin-reset' },
                'Could not send verification code. Please try again.'
            );
            if (!result.success) {
                Alert.alert('Error', result.message || 'Could not send verification code.');
                return;
            }

            setOtpBoxes(['', '', '', '']);
            setOtpSent(true);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not send verification code. Please try again.');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleSubmit = async () => {
        const resolvedNew     = newBoxes.join('');
        const resolvedConfirm = confirmBoxes.join('');

        if (!resolvedNew || resolvedNew.length !== 4) {
            Alert.alert('Validation Error', 'Please enter a new 4-digit PIN');
            return;
        }
        if (resolvedNew !== resolvedConfirm) {
            Alert.alert('Validation Error', 'New PIN and confirmation do not match');
            return;
        }

        const cleaned = isChangePinMode
            ? loggedInPhone!.replace(/\s/g, '')
            : phoneNumber.replace(/\s/g, '');

        setLoading(true);
        try {
            const body: Record<string, unknown> = { phone: cleaned, newPin: resolvedNew };

            if (isChangePinMode) {
                const resolvedOld = oldBoxes.join('');
                if (!resolvedOld || resolvedOld.length !== 4) {
                    Alert.alert('Validation Error', 'Please enter your current 4-digit PIN');
                    return;
                }
                body.mode = 'change';
                body.oldPin = resolvedOld;
            } else {
                if (!otpSent) {
                    Alert.alert('Error', 'Please verify your phone number first.');
                    return;
                }
                const enteredOtp = otpBoxes.join('');
                if (enteredOtp.length !== 4) {
                    Alert.alert('Validation Error', 'Please enter the 4-digit code sent to your phone');
                    return;
                }
                body.mode = 'reset';
                body.otpCode = enteredOtp;
            }

            // set-pin verifies the current PIN (or OTP) and hashes the new one entirely
            // server-side — the client never sees or compares a plaintext PIN.
            const result = await invokeEdgeFunction<SetPinResponse>(
                'set-pin',
                body,
                'Could not update PIN. Please try again.'
            );

            if (!result.success) {
                Alert.alert('Error', result.message || 'Could not update PIN.');
                return;
            }

            // Clear the whole form now — this screen instance can be revisited (e.g.
            // backing into Reset PIN again from the Admin gate) and previously it kept
            // showing the phone number, OTP code, and PIN boxes from the last attempt.
            setPhoneNumber('');
            setOtpSent(false);
            setOtpBoxes(['', '', '', '']);
            setOldBoxes(['', '', '', '']);
            setNewBoxes(['', '', '', '']);
            setConfirmBoxes(['', '', '', '']);

            Alert.alert('Success', 'PIN updated successfully', [
                { text: 'OK', onPress: () => isChangePinMode ? router.back() : router.push('/Admin') },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not update PIN. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAwareScrollView
            style={styles.screen}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: hp('4%') }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={20}
        >
            <Header4 />

            {/* BRAND AREA */}
            <LinearGradient colors={['#295C59', '#1E4542']} style={styles.brandArea}>
                <View style={styles.logoWrapper}>
                    <Ionicons name="key-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.brandName}>{isChangePinMode ? 'Change PIN' : 'Reset PIN'}</Text>
                <Text style={styles.brandTag}>{isChangePinMode ? 'Update your 4-digit login PIN' : 'Choose a new PIN to regain access'}</Text>
            </LinearGradient>

            {/* CARD */}
            <View
                style={[styles.card, styles.cardContent]}
            >
                {/* PHONE — only shown when not logged in (Reset PIN) */}
                {!isChangePinMode && (
                    <>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="call-outline" size={20} color="#295C59" />
                            <TextInput
                                style={[styles.textInput, styles.phoneInput]}
                                keyboardType="number-pad"
                                maxLength={13}
                                editable={!otpSent}
                                placeholder={activeInput === 'phone' ? '' : '98520 24 365'}
                                placeholderTextColor="#B0BEC5"
                                value={phoneNumber}
                                onFocus={() => setActiveInput('phone')}
                                onBlur={() => setActiveInput(null)}
                                onChangeText={(value) => {
                                    let d = value.replace(/[^0-9]/g, '').slice(0, 10);
                                    let fmt = d;
                                    if (d.length > 5 && d.length <= 7) fmt = d.slice(0, 5) + ' ' + d.slice(5);
                                    else if (d.length > 7) fmt = d.slice(0, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7);
                                    setPhoneNumber(fmt);
                                }}
                            />
                        </View>

                        {!otpSent && (
                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => router.push('/Admin')} activeOpacity={0.85}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, sendingOtp && { opacity: 0.6 }]}
                                    onPress={handleSendOtp}
                                    disabled={sendingOtp}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.saveBtnText}>{sendingOtp ? 'Sending...' : 'Send Code'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                {/* Current PIN — Change PIN mode only (logged-in user proving they know it) */}
                {isChangePinMode && (
                    <>
                        <View style={styles.pinLabelRow}>
                            <Text style={styles.label}>Current PIN</Text>
                            <TouchableOpacity onPress={() => setPinVisible(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name={pinVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#90A4AE" />
                            </TouchableOpacity>
                        </View>
                        <OtpInput
                            value={oldBoxes}
                            onChange={setOldBoxes}
                            secureTextEntry={!pinVisible}
                            containerStyle={styles.pinBoxRow}
                            boxStyle={styles.pinBox}
                        />
                    </>
                )}

                {/* Verification Code — Reset PIN mode only, after a code has been sent */}
                {!isChangePinMode && otpSent && (
                    <>
                        <Text style={styles.label}>Verification Code</Text>
                        <OtpInput
                            value={otpBoxes}
                            onChange={setOtpBoxes}
                            containerStyle={styles.pinBoxRow}
                            boxStyle={styles.pinBox}
                        />
                        <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp}>
                            <Text style={styles.resendText}>
                                {"Didn't get code? "}
                                <Text style={{ color: '#295C59', fontWeight: 'bold' }}>Resend Code</Text>
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* New PIN / Confirm / Save — visible once we're allowed to actually change the PIN */}
                {(isChangePinMode || otpSent) && (
                    <>
                        <Text style={styles.label}>New PIN</Text>
                        <OtpInput
                            value={newBoxes}
                            onChange={setNewBoxes}
                            secureTextEntry={!pinVisible}
                            containerStyle={styles.pinBoxRow}
                            boxStyle={styles.pinBox}
                        />

                        {/* Confirm New PIN */}
                        <Text style={styles.label}>Confirm New PIN</Text>
                        <OtpInput
                            value={confirmBoxes}
                            onChange={setConfirmBoxes}
                            secureTextEntry={!pinVisible}
                            containerStyle={styles.pinBoxRow}
                            boxStyle={styles.pinBox}
                        />

                        {/* BUTTONS */}
                        <View style={styles.btnRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => isChangePinMode ? router.back() : router.push('/Admin')} activeOpacity={0.85}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                                <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#295C59',
    },

    /* BRAND AREA */
    brandArea: {
        alignItems: 'center',
        paddingTop: hp('3%'),
        paddingBottom: hp('3%'),
    },
    logoWrapper: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    brandName: {
        fontSize: scaleFont(22),
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.4,
    },
    brandTag: {
        fontSize: scaleFont(12),
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '400',
        marginTop: 3,
        letterSpacing: 0.4,
    },

    /* CARD */
    card: {
        flex: 1,
        backgroundColor: '#F5F9F8',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    cardContent: {
        paddingHorizontal: wp('8%'),
        paddingTop: hp('3%'),
        paddingBottom: hp('4%'),
    },

    label: {
        fontSize: scaleFont(13.5),
        fontWeight: '700',
        color: '#1C2B2A',
        marginBottom: hp('1%'),
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
        marginBottom: hp('2.5%'),
        gap: 10,
    },
    textInput: {
        flex: 1,
        fontSize: scaleFont(20),
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 8,
        color: '#1C2B2A',
    },
    phoneInput: {
        fontSize: scaleFont(15),
        fontWeight: '500',
        letterSpacing: 0.5,
        textAlign: 'left',
    },

    /* 4-BOX PIN (Reset PIN mode) */
    pinLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp('1%'),
    },
    pinBoxRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: hp('2.5%'),
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
    resendText: {
        textAlign: 'center',
        fontSize: scaleFont(13),
        color: '#5A7270',
        marginBottom: hp('2.5%'),
    },

    /* BUTTONS */
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: hp('1.5%'),
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        height: hp('6.5%'),
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#D6E8E7',
        backgroundColor: '#fff',
    },
    cancelBtnText: {
        fontSize: scaleFont(15),
        fontWeight: '700',
        color: '#1C2B2A',
    },
    saveBtn: {
        flex: 1,
        height: hp('6.5%'),
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#295C59',
        elevation: 4,
        shadowColor: '#295C59',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    saveBtnText: {
        fontSize: scaleFont(15),
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
});
