import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ServicesCard from '../../../components/home/ServicesCard';
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

  return (
    <View style={styles.screen}>
      <Header1 />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── HERO ─────────────────────────────────────── */}
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/services/bannerServices.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'rgba(18,46,44,0.97)']}
            style={styles.heroOverlay}
          >
            {/* HEADLINE */}
            <Text style={styles.heroTitle}>On Demand{'\n'}Home Service</Text>
            <Text style={styles.heroSub}>
              Trusted professionals at your doorstep across Nepal
            </Text>

            {/* PHONE BAR */}
            <View style={styles.heroNumberBar}>
              <NumberBar
                onFocus={() =>
                  scrollRef.current?.scrollTo({ y: 420, animated: true })
                }
              />
            </View>
          </LinearGradient>
        </View>

        {/* ── TOP SERVICES ──────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Top Services</Text>
            <TouchableOpacity onPress={() => router.push('/Service')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* FEATURED CARD */}
          <TouchableOpacity
            style={styles.featuredCard}
            activeOpacity={0.88}
            onPress={() =>
              router.push({ pathname: '/service/ServiceDetail', params: { id: '1' } })
            }
          >
            <Image
              source={require('../../../assets/services/cleaningANDexteriorMaintenance/deep-cleaning.jpg')}
              style={styles.featuredImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(41,92,89,0.92)']}
              style={styles.featuredGradient}
            >
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Most Popular</Text>
              </View>
              <Text style={styles.featuredTitle}>Deep Cleaning</Text>
              <Text style={styles.featuredSub}>Professional home cleaning service</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* 3 SMALLER CARDS */}
          <View style={styles.servicesRow}>
            <ServicesCard
              title="Painting"
              image={require('../../../assets/services/homeImprovement/painting.jpg')}
              onPress={() =>
                router.push({ pathname: '/service/ServiceDetail', params: { id: '10' } })
              }
            />
            <ServicesCard
              title="Plumbing"
              image={require('../../../assets/services/HomeRepairANDMaintenance/plumbing.jpg')}
              onPress={() =>
                router.push({ pathname: '/service/ServiceDetail', params: { id: '4' } })
              }
            />
            <ServicesCard
              title="Electrical"
              image={require('../../../assets/services/HomeRepairANDMaintenance/electrical.jpg')}
              onPress={() =>
                router.push({ pathname: '/service/ServiceDetail', params: { id: '5' } })
              }
            />
          </View>
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F9F8' },
  scrollContent: { flexGrow: 1, paddingBottom: hp('3%') },

  /* HERO */
  hero: { width: '100%', height: hp('35%'), position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '80%',
    justifyContent: 'flex-end',
    paddingHorizontal: wp('5%'),
    paddingBottom: hp('2%'),
    gap: 5,
  },
  heroTitle: {
    fontSize: wp('6.5%'),
    fontWeight: '800',
    color: '#fff',
    lineHeight: wp('8%'),
    letterSpacing: 0.2,
  },
  heroSub: {
    fontSize: wp('3.1%'),
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '400',
    marginBottom: hp('0.8%'),
  },
  heroNumberBar: { marginTop: 2 },

  /* CATEGORIES */
  section: { marginTop: hp('2.8%'), paddingHorizontal: wp('4%') },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1.5%'),
  },
  sectionTitle: { fontSize: wp('4.4%'), fontWeight: '800', color: '#1C2B2A' },
  seeAll: { fontSize: wp('3.2%'), fontWeight: '600', color: '#295C59' },
  /* FEATURED CARD */
  featuredCard: {
    width: '100%',
    height: hp('22%'),
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: hp('1.5%'),
    elevation: 4,
    shadowColor: '#295C59',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  featuredImage: { width: '100%', height: '100%' },
  featuredGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '65%',
    justifyContent: 'flex-end',
    padding: 14,
    gap: 2,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#295C59',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
  },
  featuredBadgeText: { fontSize: wp('2.6%'), color: '#fff', fontWeight: '700' },
  featuredTitle: { fontSize: wp('4.8%'), fontWeight: '800', color: '#fff' },
  featuredSub: { fontSize: wp('3%'), color: 'rgba(255,255,255,0.80)', fontWeight: '400' },

  /* SERVICE CARDS ROW */
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('0.5%'),
  },

});
