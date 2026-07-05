import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header4 from '@/components/Header4Admin';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');
const scaleFont = (s: number) => (s * width) / 375;

export default function PaymentMethod() {
    const { customerName, customerPhone, budget } = useLocalSearchParams<{
        customerName: string;
        customerPhone: string;
        budget: string;
    }>();

    const [professionalPhone, setProfessionalPhone] = useState('');
    const [professionalName, setProfessionalName] = useState('');

    useEffect(() => {
        (async () => {
            const phone = await AsyncStorage.getItem('adminPhone') ?? '';
            setProfessionalPhone(phone);
            if (phone) {
                const cleanPhone = phone.replace(/\D/g, '');
                const { data } = await supabase
                    .from('workforce')
                    .select('first_name, middle_name, last_name')
                    .or(`phone.eq.${cleanPhone},phone.eq.977${cleanPhone}`)
                    .maybeSingle();
                setProfessionalName(data ? [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ') : '');
            }
        })();
    }, []);

    const goKhalti = () => {
        router.replace({
            pathname: '/admin/KhaltiPayment',
            params: { customerName, customerPhone, budget, professionalPhone, professionalName },
        } as any);
    };

    const goCash = () => {
        router.replace('/admin/BookingHistory');
    };

    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.container}>
                <View style={styles.badge}>
                    <Ionicons name="checkmark-circle" size={56} color="#295C59" />
                </View>
                <Text style={styles.title}>Work Completed!</Text>
                <Text style={styles.sub}>
                    Select how <Text style={styles.name}>{customerName}</Text> will pay for the service.
                </Text>

                {budget ? (
                    <View style={styles.amountBox}>
                        <Text style={styles.amountLabel}>Service Amount</Text>
                        <Text style={styles.amountValue}>{budget}</Text>
                    </View>
                ) : null}

                <View style={styles.options}>
                    {/* Khalti */}
                    <TouchableOpacity style={styles.khaltiCard} onPress={goKhalti} activeOpacity={0.85}>
                        <View style={styles.khaltiIconBox}>
                            <Text style={styles.khaltiLogo}>K</Text>
                        </View>
                        <View style={styles.optionInfo}>
                            <Text style={styles.optionTitle}>Pay via Khalti</Text>
                            <Text style={styles.optionSub}>Customer scans QR code to pay digitally</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#5C2D91" />
                    </TouchableOpacity>

                    {/* Cash */}
                    <TouchableOpacity style={styles.cashCard} onPress={goCash} activeOpacity={0.85}>
                        <View style={styles.cashIconBox}>
                            <Ionicons name="cash-outline" size={26} color="#295C59" />
                        </View>
                        <View style={styles.optionInfo}>
                            <Text style={styles.optionTitle}>Pay by Cash</Text>
                            <Text style={styles.optionSub}>Customer pays in cash directly to you</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#295C59" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F9F8' },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: wp('6%'),
        paddingTop: hp('5%'),
    },
    badge: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#E8F4F3',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: hp('2%'),
    },
    title: {
        fontSize: scaleFont(26),
        fontWeight: '800',
        color: '#1C2B2A',
        marginBottom: 8,
    },
    sub: {
        fontSize: scaleFont(14),
        color: '#5A7270',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: hp('2.5%'),
    },
    name: { fontWeight: '700', color: '#295C59' },
    amountBox: {
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: wp('6%'),
        alignItems: 'center',
        marginBottom: hp('3%'),
        width: '100%',
        borderWidth: 1.5,
        borderColor: '#E8F4F3',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    amountLabel: { fontSize: scaleFont(12), color: '#9BBAB8', fontWeight: '600', marginBottom: 4 },
    amountValue: { fontSize: scaleFont(22), fontWeight: '800', color: '#295C59' },

    options: { width: '100%', gap: 14 },

    khaltiCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: wp('4%'),
        gap: wp('3%'),
        borderWidth: 1.5,
        borderColor: '#EDE0F8',
        elevation: 3,
        shadowColor: '#5C2D91',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    khaltiIconBox: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#5C2D91',
        alignItems: 'center',
        justifyContent: 'center',
    },
    khaltiLogo: {
        fontSize: scaleFont(26),
        fontWeight: '900',
        color: '#fff',
        fontStyle: 'italic',
    },

    cashCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: wp('4%'),
        gap: wp('3%'),
        borderWidth: 1.5,
        borderColor: '#E8F4F3',
        elevation: 3,
        shadowColor: '#295C59',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    cashIconBox: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#E8F4F3',
        alignItems: 'center',
        justifyContent: 'center',
    },

    optionInfo: { flex: 1 },
    optionTitle: { fontSize: scaleFont(15), fontWeight: '700', color: '#1C2B2A', marginBottom: 3 },
    optionSub: { fontSize: scaleFont(12), color: '#9BBAB8', lineHeight: 17 },
});
