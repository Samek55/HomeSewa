import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image
} from 'react-native';


import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import { personBooking } from '../../../src/data/AdminData/PersonBookingListData';
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

const { width, height } = Dimensions.get('window'); // Get screen dimensions

// Font scaling utility function
const scaleFont = (size: number) => {
    const guidelineBaseWidth = 375; // Base screen width to scale from
    return (size * width) / guidelineBaseWidth;
};

export default function GeneratePaymentDetails() {

    const { id } = useLocalSearchParams<{ id: string }>();

    const booking = useMemo(() => {
        return personBooking.find(item => item.id.toString() === id);
    }, [id]);

    return (
        <View style={styles.mainContainer}>
            <Header4 />
            <View style={styles.container}>
                {/* HEADER */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() =>
                        router.replace({
                            pathname: '/admin/BookingConfirmation',
                            params: {
                                id: id,
                            },
                        })
                    }
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={leftArrowIcon} style={styles.backIcon} />
                        <Text style={styles.title}>Booking Confirmation 2</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.thankYouText}>
                    Service Completed
                </Text>

                <Text style={styles.bookingText}>
                    Your Service has been completed successfully.
                </Text>
                <Text style={styles.bookingText2}>
                    Please proceed for the payment.
                </Text>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                        router.push({
                            pathname: '/admin/PaymentDetails',
                            params: {
                                id: booking?.id?.toString(),
                            },
                        });
                    }}
                >
                    <Text style={styles.submitButtonText}>Generate payment Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: '5%',
        paddingTop: height * 0.09, // Adjust top padding based on screen size
        alignItems: 'center',
    },
    thankYouText: {
        marginTop: hp('3%'),
        fontSize: scaleFont(27),
        fontWeight: '500',
    },
    bookingText: {
        width: '70%',
        textAlign: 'center',
        marginBottom: height * 0.08, // Adjust margin-bottom based on screen height
        fontSize: scaleFont(13),
        marginTop: height * 0.02, // Adjust top margin for large screens
        fontWeight: '400',
        lineHeight: 23,
    },
    bookingText2: {
        width: '70%',
        textAlign: 'center',
        marginBottom: height * 0.08, // Adjust margin-bottom based on screen height
        fontSize: scaleFont(13),
        marginTop: height * 0.05, // Adjust top margin for large screens
        fontWeight: '400',
        lineHeight: 23,
    },
    submitButton: {
        backgroundColor: 'green',
        height: height * 0.05,
        width: '80%', // Adjust width based on screen size
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 100,
        marginTop: height * 0.08, // Dynamic margin-top for large screens
    },
    submitButtonText: {
        fontSize: scaleFont(15),
        color: '#fff',
        fontWeight: '300',
    },
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        marginTop: hp('2.0%'),
        paddingHorizontal: 15.7,
    },
    /* BACK BUTTON */
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: hp('1%'),
        marginLeft: wp('3%'),
        position: 'absolute',
        top: hp('-1%'),
        left: hp('-1%'),
        zIndex: 999
    },

    backIcon: {
        width: hp('3.5%'),
        height: hp('3.5%'),
        tintColor: 'green',
        marginRight: wp('2%'),
    },

    title: {
        fontSize: hp('2.3%'),
        fontWeight: '600',
        color: 'green',
    },

});

