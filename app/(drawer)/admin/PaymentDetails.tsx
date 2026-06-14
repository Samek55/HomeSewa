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
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window'); // Get screen dimensions

// Font scaling utility function
const scaleFont = (size: number) => {
    const guidelineBaseWidth = 375; // Base screen width to scale from
    return (size * width) / guidelineBaseWidth;
};

export default function PaymentDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();

    return (
        <View style={styles.mainContainer}>
            <Header4 />
            <View style={styles.container}>
                {/* HEADER */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() =>
                        router.replace({
                            pathname: '/admin/GeneratePaymentDetails',
                            params: {
                                id: id,
                            },
                        })
                    }
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={leftArrowIcon} style={styles.backIcon} />
                        <Text style={styles.title}>Payment Details</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.thankYouText}>
                    TACKLES Pro
                </Text>

                <View style={styles.detailsContainer}>

                    <Text style={styles.bookingText}>
                        Routing Number: 026009593
                    </Text>
                    <Text style={styles.bookingText}>
                        Account Number: 123456789012
                    </Text>
                    <Text style={styles.bookingText}>
                        Bank of America
                    </Text>
                    <Text style={styles.bookingText}>
                        California, USA
                    </Text>
                </View>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: '7%',
        // Adjust top padding based on screen size

    },
    thankYouText: {
        fontSize: scaleFont(27),
        fontWeight: '700',
        color: '#30704b',
        paddingTop: height * 0.06,
    },
    detailsContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginTop: hp('3%')

    },
    bookingText: {

        textAlign: 'center',
        // Adjust margin-bottom based on screen height
        fontSize: scaleFont(17),
        // Adjust top margin for large screens
        fontWeight: '500',
        lineHeight: 23,
        color: '#555'
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
        zIndex: 9,
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

