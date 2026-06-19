import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Alert,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { router } from 'expo-router';
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

export default function AdminChangePassword() {
    const [passwordVisibleOLD, setPasswordVisibleOLD] = useState(false);
    const [passwordVisibleNEW, setPasswordVisibleNEW] = useState(false);
    const [passwordVisibleCONFIRM, setPasswordVisibleCONFIRM] = useState(false);
    const [loading, setLoading] = useState(false);

    const [phoneNumber, setPhoneNumber] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewpassword, setConfirmNewPassword] = useState('');

    const handleSubmit = async () => {
        const cleaned = phoneNumber.replace(/\s/g, '');
        if (!cleaned || cleaned.length < 10) {
            Alert.alert('Validation Error', 'Please enter your phone number');
            return;
        }
        if (!oldPassword || oldPassword.length !== 4) {
            Alert.alert('Validation Error', 'Please enter your current 4-digit PIN');
            return;
        }
        if (!newPassword || newPassword.length !== 4) {
            Alert.alert('Validation Error', 'Please enter a new 4-digit PIN');
            return;
        }
        if (newPassword !== confirmNewpassword) {
            Alert.alert('Validation Error', 'New PIN and confirmation do not match');
            return;
        }
        setLoading(true);
        try {
            // Check admins table first, then workforce
            const [{ data: adminRecord }, { data: workerRecord }] = await Promise.all([
                supabase.from('admins').select('pin, full_name').eq('phone', cleaned).single(),
                supabase.from('workforce').select('pin, full_name').eq('phone', cleaned).single(),
            ]);

            const matchedAdmin = adminRecord && adminRecord.pin === oldPassword;
            const matchedWorker = workerRecord && workerRecord.pin === oldPassword;

            if (!matchedAdmin && !matchedWorker) {
                Alert.alert('Error', 'Phone number or current PIN is incorrect');
                return;
            }

            const updates: any[] = [];
            if (matchedAdmin) {
                updates.push(supabase.from('admins').update({ pin: newPassword }).eq('phone', cleaned));
            }
            if (matchedWorker) {
                updates.push(supabase.from('workforce').update({ pin: newPassword }).eq('phone', cleaned));
            }
            await Promise.all(updates);

            const fullName = (matchedWorker ? workerRecord?.full_name : adminRecord?.full_name) || '';
            const firstName = fullName.split(' ')[0] || 'User';
            sendPinChangeSms(cleaned, firstName).catch(() => {});

            Alert.alert('Success', 'PIN updated successfully', [
                { text: 'OK', onPress: () => router.push('/Admin') },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not update PIN. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Header4 />

            {/* BRAND AREA */}
            <LinearGradient colors={['#295C59', '#1E4542']} style={styles.brandArea}>
                <View style={styles.logoWrapper}>
                    <Ionicons name="key-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.brandName}>Reset PIN</Text>
                <Text style={styles.brandTag}>Choose a new PIN to regain access</Text>
            </LinearGradient>

            {/* CARD */}
            <ScrollView
                style={styles.card}
                contentContainerStyle={styles.cardContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* PHONE */}
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputRow}>
                    <Ionicons name="call-outline" size={20} color="#295C59" />
                    <TextInput
                        style={[styles.textInput, styles.phoneInput]}
                        keyboardType="number-pad"
                        maxLength={13}
                        placeholder="98XXXXXXXX"
                        placeholderTextColor="#B0BEC5"
                        value={phoneNumber}
                        onChangeText={(value) => {
                            let d = value.replace(/[^0-9]/g, '').slice(0, 10);
                            let fmt = d;
                            if (d.length > 5 && d.length <= 7) fmt = d.slice(0, 5) + ' ' + d.slice(5);
                            else if (d.length > 7) fmt = d.slice(0, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7);
                            setPhoneNumber(fmt);
                        }}
                    />
                </View>

                {/* OLD PIN */}
                <Text style={styles.label}>Current PIN</Text>
                <View style={styles.inputRow}>
                    <Ionicons name="lock-closed-outline" size={20} color="#295C59" />
                    <TextInput
                        style={styles.textInput}
                        secureTextEntry={!passwordVisibleOLD}
                        keyboardType="number-pad"
                        maxLength={4}
                        value={oldPassword}
                        onChangeText={(text) => setOldPassword(text.replace(/[^0-9]/g, '').slice(0, 4))}
                    />
                    <TouchableOpacity onPress={() => setPasswordVisibleOLD(!passwordVisibleOLD)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={passwordVisibleOLD ? 'eye-outline' : 'eye-off-outline'} size={20} color="#90A4AE" />
                    </TouchableOpacity>
                </View>

                {/* NEW PIN */}
                <Text style={styles.label}>New PIN</Text>
                <View style={styles.inputRow}>
                    <Ionicons name="key-outline" size={20} color="#295C59" />
                    <TextInput
                        style={styles.textInput}
                        secureTextEntry={!passwordVisibleNEW}
                        keyboardType="number-pad"
                        maxLength={4}
                        value={newPassword}
                        onChangeText={(text) => setNewPassword(text.replace(/[^0-9]/g, '').slice(0, 4))}
                    />
                    <TouchableOpacity onPress={() => setPasswordVisibleNEW(!passwordVisibleNEW)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={passwordVisibleNEW ? 'eye-outline' : 'eye-off-outline'} size={20} color="#90A4AE" />
                    </TouchableOpacity>
                </View>

                {/* CONFIRM NEW PIN */}
                <Text style={styles.label}>Confirm New PIN</Text>
                <View style={styles.inputRow}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#295C59" />
                    <TextInput
                        style={styles.textInput}
                        secureTextEntry={!passwordVisibleCONFIRM}
                        keyboardType="number-pad"
                        maxLength={4}
                        value={confirmNewpassword}
                        onChangeText={(text) => setConfirmNewPassword(text.replace(/[^0-9]/g, '').slice(0, 4))}
                    />
                    <TouchableOpacity onPress={() => setPasswordVisibleCONFIRM(!passwordVisibleCONFIRM)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={passwordVisibleCONFIRM ? 'eye-outline' : 'eye-off-outline'} size={20} color="#90A4AE" />
                    </TouchableOpacity>
                </View>

                {/* BUTTONS */}
                <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => router.push('/Admin')} activeOpacity={0.85}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                        <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
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
