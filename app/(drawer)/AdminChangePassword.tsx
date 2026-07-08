import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import Header4 from '@/components/Header4Admin';

const { width } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const sendPinChangeSms = async (phone: string, firstName: string) => {
    const to = '977' + phone.replace(/\D/g, '').slice(-10);
    const text = `Dear ${firstName}, Your HomeSewa PIN has been changed successfully.\n\nIf you did not request this change, please contact us immediately.\n(9852024365)\n\nThank You for using HomeSewa\n( www.homesewa.app )`;
    await fetch('https://api.sparrowsms.com/v2/sms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
    });
};

const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

const sendResetOtpSms = async (phone: string, otp: string, firstName: string) => {
    const to = '977' + phone.replace(/\D/g, '').slice(-10);
    const text = `Dear ${firstName}, Your HomeSewa PIN reset code is ${otp}.\n\nIf you did not request this, please ignore this message.\n\nThank You for using HomeSewa\n( www.homesewa.app )`;
    const response = await fetch('https://api.sparrowsms.com/v2/sms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Sparrow error ${response.status}: ${JSON.stringify(data)}`);
};

export default function AdminChangePassword() {
    const { mode } = useLocalSearchParams<{ mode?: string }>();
    // 'change' = logged-in user updating PIN (no phone needed)
    // 'reset'  = forgot PIN, phone number required
    const isChangePinMode = mode === 'change';

    const scrollRef = useRef<any>(null);
    const fieldYPositions = useRef<Partial<Record<string, number>>>({});
    const scrollToField = (key: string) => {
        if (!scrollRef.current) return;
        const y = fieldYPositions.current[key] ?? 0;
        scrollRef.current.scrollToPosition(0, Math.max(0, y - 80), true);
    };

    const [loading, setLoading] = useState(false);
    const [loggedInPhone, setLoggedInPhone] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const [pinVisible, setPinVisible] = useState(false);

    // Reset-PIN mode (forgot PIN) verifies identity via SMS OTP instead of the current PIN,
    // since someone who forgot their PIN by definition can't provide it.
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [sentOtp, setSentOtp] = useState('');
    const [resetRecord, setResetRecord] = useState<{ table: 'admin' | 'professional'; full_name: string } | null>(null);
    const [otpBoxes, setOtpBoxes] = useState(['', '', '', '']);
    const otpRefs = useRef<Array<TextInput | null>>([]);

    // 4-box PIN state — used by both modes
    const [oldBoxes, setOldBoxes] = useState(['', '', '', '']);
    const [newBoxes, setNewBoxes] = useState(['', '', '', '']);
    const [confirmBoxes, setConfirmBoxes] = useState(['', '', '', '']);
    const oldRefs = useRef<Array<TextInput | null>>([]);
    const newRefs = useRef<Array<TextInput | null>>([]);
    const confirmRefs = useRef<Array<TextInput | null>>([]);

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
            const { data: adminRecord } = await supabase
                .from('admin')
                .select('full_name')
                .eq('phone', cleaned)
                .maybeSingle();

            const table: 'admin' | 'professional' = adminRecord ? 'admin' : 'professional';
            const record = adminRecord || (await supabase
                .from('professional')
                .select('full_name')
                .eq('phone', cleaned)
                .maybeSingle()).data;

            if (!record) {
                Alert.alert('Error', 'This phone number is not registered.');
                return;
            }

            const code = generateOtp();
            const firstName = (record.full_name || '').split(' ')[0] || 'User';
            await sendResetOtpSms(cleaned, code, firstName);

            setSentOtp(code);
            setResetRecord({ table, full_name: record.full_name || 'User' });
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
            let table: 'admin' | 'professional';
            let fullName: string;

            if (isChangePinMode) {
                // Super admins/admins live in `admin`; professionals live in `professional`.
                // `workforce` has no pin column at all, so it never gates PIN changes.
                const resolvedOld = oldBoxes.join('');
                if (!resolvedOld || resolvedOld.length !== 4) {
                    Alert.alert('Validation Error', 'Please enter your current 4-digit PIN');
                    return;
                }

                const { data: adminRecord } = await supabase
                    .from('admin')
                    .select('pin, full_name')
                    .eq('phone', cleaned)
                    .maybeSingle();

                const resolvedTable = adminRecord ? 'admin' : 'professional';
                const record = adminRecord || (await supabase
                    .from('professional')
                    .select('pin, full_name')
                    .eq('phone', cleaned)
                    .maybeSingle()).data;

                if (!record || record.pin !== resolvedOld) {
                    Alert.alert('Error', 'Current PIN is incorrect');
                    return;
                }
                table = resolvedTable;
                fullName = record.full_name || 'User';
            } else {
                if (!otpSent || !resetRecord) {
                    Alert.alert('Error', 'Please verify your phone number first.');
                    return;
                }
                const enteredOtp = otpBoxes.join('');
                if (enteredOtp.length !== 4) {
                    Alert.alert('Validation Error', 'Please enter the 4-digit code sent to your phone');
                    return;
                }
                if (enteredOtp !== sentOtp) {
                    Alert.alert('Invalid Code', 'The code you entered is incorrect.');
                    return;
                }
                table = resetRecord.table;
                fullName = resetRecord.full_name;
            }

            const { error } = await supabase.from(table).update({ pin: resolvedNew }).eq('phone', cleaned);
            if (error) throw error;

            const firstName = (fullName || '').split(' ')[0] || 'User';
            sendPinChangeSms(cleaned, firstName).catch(() => {});

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
            ref={scrollRef}
            style={styles.screen}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: hp('4%') }}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}
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
                        <View style={styles.pinBoxRow} onLayout={(e) => { fieldYPositions.current['oldPin'] = e.nativeEvent.layout.y; }}>
                            {oldBoxes.map((d, i) => (
                                <TextInput
                                    key={i}
                                    ref={r => { oldRefs.current[i] = r; }}
                                    style={styles.pinBox}
                                    secureTextEntry={!pinVisible}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    value={d}
                                    onFocus={() => scrollToField('oldPin')}
                                    onChangeText={t => {
                                        const digit = t.replace(/[^0-9]/g, '').slice(-1);
                                        const next = [...oldBoxes]; next[i] = digit; setOldBoxes(next);
                                        if (digit && i < 3) oldRefs.current[i + 1]?.focus();
                                    }}
                                    onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !d && i > 0) oldRefs.current[i - 1]?.focus(); }}
                                />
                            ))}
                        </View>
                    </>
                )}

                {/* Verification Code — Reset PIN mode only, after a code has been sent */}
                {!isChangePinMode && otpSent && (
                    <>
                        <Text style={styles.label}>Verification Code</Text>
                        <View style={styles.pinBoxRow} onLayout={(e) => { fieldYPositions.current['otp'] = e.nativeEvent.layout.y; }}>
                            {otpBoxes.map((d, i) => (
                                <TextInput
                                    key={i}
                                    ref={r => { otpRefs.current[i] = r; }}
                                    style={styles.pinBox}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    value={d}
                                    onFocus={() => scrollToField('otp')}
                                    onChangeText={t => {
                                        const digit = t.replace(/[^0-9]/g, '').slice(-1);
                                        const next = [...otpBoxes]; next[i] = digit; setOtpBoxes(next);
                                        if (digit && i < 3) otpRefs.current[i + 1]?.focus();
                                    }}
                                    onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !d && i > 0) otpRefs.current[i - 1]?.focus(); }}
                                />
                            ))}
                        </View>
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
                        <View style={styles.pinBoxRow} onLayout={(e) => { fieldYPositions.current['newPin'] = e.nativeEvent.layout.y; }}>
                            {newBoxes.map((d, i) => (
                                <TextInput
                                    key={i}
                                    ref={r => { newRefs.current[i] = r; }}
                                    style={styles.pinBox}
                                    secureTextEntry={!pinVisible}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    value={d}
                                    onFocus={() => scrollToField('newPin')}
                                    onChangeText={t => {
                                        const digit = t.replace(/[^0-9]/g, '').slice(-1);
                                        const next = [...newBoxes]; next[i] = digit; setNewBoxes(next);
                                        if (digit && i < 3) newRefs.current[i + 1]?.focus();
                                    }}
                                    onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !d && i > 0) newRefs.current[i - 1]?.focus(); }}
                                />
                            ))}
                        </View>

                        {/* Confirm New PIN */}
                        <Text style={styles.label}>Confirm New PIN</Text>
                        <View style={styles.pinBoxRow} onLayout={(e) => { fieldYPositions.current['confirmPin'] = e.nativeEvent.layout.y; }}>
                            {confirmBoxes.map((d, i) => (
                                <TextInput
                                    key={i}
                                    ref={r => { confirmRefs.current[i] = r; }}
                                    style={styles.pinBox}
                                    secureTextEntry={!pinVisible}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    value={d}
                                    onFocus={() => scrollToField('confirmPin')}
                                    onChangeText={t => {
                                        const digit = t.replace(/[^0-9]/g, '').slice(-1);
                                        const next = [...confirmBoxes]; next[i] = digit; setConfirmBoxes(next);
                                        if (digit && i < 3) confirmRefs.current[i + 1]?.focus();
                                    }}
                                    onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && !d && i > 0) confirmRefs.current[i - 1]?.focus(); }}
                                />
                            ))}
                        </View>

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
