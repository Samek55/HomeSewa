import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import ServicesCard from '../../../components/home/ServicesCard';
import ProfessionalCard from '../../../components/home/ProfessionalCard';
import NumberBar from '../../../components/home/NumberBar';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Header1 from '@/components/Header1';
import { router } from 'expo-router';
import { useRef } from 'react';

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView | null>(null);

  const handleScrollToInput = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 200,
        animated: true,
      });
    }, 150);
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
        >
          <Header1 />
          <View style={styles.container}>
            <Image
              source={require('../../../assets/home/home.jpeg')}
              style={styles.banner}
              resizeMode="cover"
            />

            <View style={styles.content}>
              <Text style={styles.title}>RocketSingh | SuperFast Service</Text>

              <Text style={styles.subtitle}>
                On Demand Home Service in Chennai
              </Text>

              <Text style={styles.sectionTitle}>Top Services</Text>

              <View style={styles.row1}>
                <ServicesCard
                  title="Painting"
                  image={require('../../../assets/services/homeImprovement/painting.jpg')}
                  onPress={() =>
                    router.push({
                      pathname: '/service/ServiceDetail',
                      params: { id: '13' },
                    })
                  }
                />

                <ServicesCard
                  title="Plumbing"
                  image={require('../../../assets/services/HomeRepairANDMaintenance/plumbing.jpg')}
                  onPress={() =>
                    router.push({
                      pathname: '/service/ServiceDetail',
                      params: { id: '6' },
                    })
                  }
                />

                <ServicesCard
                  title="Tiling"
                  image={require('../../../assets/services/homeImprovement/tiling-work.jpg')}
                  onPress={() =>
                    router.push({
                      pathname: '/service/ServiceDetail',
                      params: { id: '16' },
                    })
                  }
                />
              </View>

              <View style={styles.spacer} />

              <Text style={styles.sectionTitle}>Top Professionals</Text>

              <View style={styles.row2}>
                <ProfessionalCard
                  image={require('../../../assets/topProfessionals/1_aravind.jpeg')}
                  title="Aravind"
                  subtitle=""
                />
                <ProfessionalCard
                  image={require('../../../assets/topProfessionals/2_anil.jpeg')}
                  title="Anil"
                  subtitle=""
                />
                <ProfessionalCard
                  image={require('../../../assets/topProfessionals/3_vallam.jpeg')}
                  title="Vallam"
                  subtitle=""
                />
                <ProfessionalCard
                  image={require('../../../assets/topProfessionals/4_subra.jpeg')}
                  title="Subra"
                  subtitle=""
                />
              </View>

              <View style={styles.numberBarContainer}>
                <NumberBar onFocus={handleScrollToInput} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  banner: {
    width: '100%',
    height: hp('25%'),
  },
  content: {
    paddingHorizontal: wp('4%'),
    paddingTop: 15,
  },
  title: {
    fontSize: wp('5%'),
    color: '#064E3B',
    fontWeight: '900',
    marginBottom: hp('0.5%'),
    marginTop: hp('1.5%'),
  },
  subtitle: {
    fontSize: wp('3.5%'),
    color: '#111827',
    fontWeight: '400',
    marginBottom: hp('1.5%'),
  },
  sectionTitle: {
    fontSize: wp('4.2%'),
    color: '#064E3B',
    fontWeight: '900',
    marginBottom: hp('0.5%'),
    marginTop: hp('1%'),
  },
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('0.5%'),
  },
  row2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('0.5%'),

  },
  spacer: {
    height: 15,
  },
  numberBarContainer: {
    marginBottom: hp('1%'),
    paddingHorizontal: wp('8%'),
    alignSelf: 'stretch',
  },
});
