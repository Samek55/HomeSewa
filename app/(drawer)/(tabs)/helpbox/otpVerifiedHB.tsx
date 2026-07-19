import Header2 from '@/components/Header3drawer';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { View, Text, Image, Dimensions, StyleSheet, TouchableWithoutFeedback } from 'react-native';
// Get screen dimensions
const { width, height } = Dimensions.get('window');
import {
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

// Font scaling utility function
const scaleFont = (size: number) => {
  const guidelineBaseWidth = 375; // Base screen width to scale from
  return (size * width) / guidelineBaseWidth;
};


const VerifiedScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/Home'), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (

    <TouchableWithoutFeedback onPress={() => router.push('/Home')}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header2 />
        <View style={styles.container}>
          <Text style={styles.thankYouText}>
            Thank you! OTP verified successfully. Your help request has been submitted!
          </Text>
          <View style={styles.imageContainer}>
            <Image
              source={require('../../../../assets/icons/admin/check-mark.png')}
              style={styles.image}
            />
            <Text style={styles.confirmationText}>
              OTP confirmed — request submitted!
            </Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingHorizontal: '4%',
    paddingVertical: '5%',
    flex: 1,
    backgroundColor: colors.background
  },
  thankYouText: {
    fontSize: scaleFont(20),
    fontWeight: '400',
    borderWidth: 0,
    marginTop: hp('3%'),
    textAlign: 'center',
    color: colors.textPrimary,
  },
  imageContainer: {
    flex: 1,

    alignItems: 'center',
    marginTop: height * 0.1,
  },
  image: {
    width: width * 0.48, // Scale image width based on screen size
    height: height * 0.26, // Scale image height based on screen size
    resizeMode: 'contain', // Ensure the image scales proportionally
  },
  confirmationText: {
    marginTop: height * 0.04, // Adjust top margin based on screen height
    fontSize: scaleFont(20),
    width: '70%',
    textAlign: 'center',
    fontWeight: '600',
    color: colors.success
  },

});


export default VerifiedScreen;