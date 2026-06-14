import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Image
} from 'react-native';
import React, { useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import { personBooking } from '../../../src/data/AdminData/PersonBookingListData';
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window'); // Get screen dimensions

// Font scaling utility function
const scaleFont = (size: number) => {
    const guidelineBaseWidth = 375; // Base screen width to scale from
    return (size * width) / guidelineBaseWidth;
};

export default function BookingConfirmation() {

    const { id } = useLocalSearchParams<{ id: string }>();

    const booking = React.useMemo(() => {
        return personBooking.find(item => item.id.toString() === id);
    }, [id]);

    const [otp, setOtp] = useState(['', '', '', '']); // Manage OTP state
    const inputRefs = useRef<Array<TextInput | null>>([]);
    // const {
    //     name,
    //     number,
    //     selectedArea,
    //     selectedService,
    //     selectedBudget,
    //     selectedPriority,
    //     selectedShift,
    //     date,
    //     message,
    // } = route.params;
    // const dispatch: AppDispatch = useDispatch();

    // Clear OTP whenever the screen is focused
    useFocusEffect(
        React.useCallback(() => {
            setOtp(['', '', '', '']); // Reset OTP on screen focus
        }, []),
    );

    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Automatically focus next input box if the user types a number
        if (text && index < otp.length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (event: any, index: number) => {
        // Handle backspace to move focus to the previous box
        if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // const handleNavigate = async () => {
    //     const enteredOtp = otp.join(''); // Combine the OTP into a single string
    //     if (enteredOtp === '11111') {
    //         const newEntry = {
    //             id: Date.now(), // Use timestamp as unique ID
    //             name,
    //             number,
    //             selectedService,
    //             selectedShift,
    //             selectedPriority,
    //             selectedBudget,
    //             selectedArea,
    //             message,
    //             date: date instanceof Date ? date.toISOString() : date,
    //         };
    //         {
    //             const booking = {
    //                 Name: name,
    //                 Phone: number,
    //                 Service: selectedService,
    //                 Area: selectedArea,
    //                 Priority: selectedPriority,
    //                 Shift: selectedShift,
    //                 Message: message,
    //                 Budget: selectedBudget,
    //                 Date: date instanceof Date ? date.toISOString() : date,

    //                 // You can also store date if you added that field to Airtable
    //             };

    //             try {
    //                 await createBooking(booking);

    //                 dispatch(addFormData(newEntry));
    //                 navigation.navigate('AdminOtpVerify');
    //             } catch (error) {
    //                 Alert.alert('Error', 'Submission failed. Please try again.');
    //             }
    //         }
    //     }
    // };

    return (
        <View style={styles.mainContainer}>
            <Header4 />
            <View style={styles.container}>
                {/* HEADER */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() =>
                        router.replace({
                            pathname: '/admin/BookingDetails_2',
                            params: {
                                id: id,
                            },
                        })
                    }
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={leftArrowIcon} style={styles.backIcon} />
                        <Text style={styles.title}>Booking Confirmation</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.thankYouText}>
                    Phone Verification
                </Text>

                <Text style={styles.bookingText}>
                    Enter the 4 digits code sent to your customer number 98*****011 below.
                </Text>

                <Text style={styles.otpPromptText}>Enter your OTP to continue.</Text>

                <View style={styles.otpBox}>
                    {otp.map((_, index) => (
                        <TextInput
                            key={index}
                            ref={ref => {
                                inputRefs.current[index] = ref;
                            }}
                            style={styles.input}
                            keyboardType="numeric"
                            maxLength={1}
                            value={otp[index]}
                            onChangeText={text => handleChange(text, index)}
                            onKeyPress={event => handleKeyPress(event, index)}
                        />
                    ))}
                </View>

                <Text style={styles.resendcode}>{`Didn't get code?`} <Text style={{ color: 'blue' }}>Resend Code</Text></Text>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                        router.push({
                            pathname: '/admin/GeneratePaymentDetails',
                            params: {
                                id: booking?.id?.toString(),
                            },
                        });
                    }}
                >
                    <Text style={styles.submitButtonText}>Verify</Text>
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
        marginTop: height * 0.03, // Adjust top margin for large screens
        fontWeight: '400',
        lineHeight: 23,
    },
    otpPromptText: {
        fontSize: scaleFont(16.5),
        marginBottom: height * 0.04, // Adjust margin-bottom for larger screens
        fontWeight: '400',
        color: 'green',
    },
    otpBox: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        width: width * 0.12, // Dynamic width for better scalability
        height: width * 0.12, // Dynamic height to maintain square shape
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: 'hsl(0, 0%, 79%)',
        borderRadius: 5,
        textAlign: 'center',
        fontSize: scaleFont(18),
        backgroundColor: '#fff',
        elevation: 3,

    },
    resendcode: {
        marginTop: 25,
        paddingHorizontal: 20,
        textAlign: 'center',
        lineHeight: 22,
        fontSize: hp('1.5%')
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
        fontSize: scaleFont(17),
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

