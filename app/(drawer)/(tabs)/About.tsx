import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';

import OurTeamCard from '../../../components/home/OurTeamCard';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

import Header2 from '@/components/Header2';

export default function AboutScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Header2 />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>

          {/* BANNER */}
          <View style={styles.banner}>
            <Image
              source={require('../../../assets/aboutUs/aboutUS.jpeg')}
              style={styles.bannerImage}
              resizeMode="cover"
              fadeDuration={0}
            />
          </View>

          {/* CONTENT */}
          <View style={styles.content}>

            <Text style={styles.title}>Our Story</Text>

            <Text style={styles.subtitle}>
              HomeSewa is an on-demand hyperlocal service platform delivering fast, reliable, and professional home services across Nepal, powered by skilled and trained professionals available 24 hours a day, 365 days a year.
            </Text>

            <Text style={styles.lineheighpara}>
              Our mission is to offer complete on demand multiple home service services under one trusted platform, eliminating the need to search multiple providers for different household and commercial requirements.
            </Text>

            <Text style={styles.lineheighpara}>
              Our vision is to build a trusted workForce network recognized for professionalism, accessibility, and service excellence through long-term client relationships and consistent work quality.
            </Text>

            {/* TEAM */}
            <View style={{ height: 18 }} />

            <Text style={styles.title}>Our Team</Text>

            <View style={styles.row}>
              <OurTeamCard
                image={require('../../../assets/aboutUs/1_keshab.jpeg')}
                title="Keshab"
                suBTitle="Founder"
              />

              <OurTeamCard
                image={require('../../../assets/aboutUs/2_raju.jpeg')}
                title="Raju"
                suBTitle="CEP"
              />

              <OurTeamCard
                image={require('../../../assets/aboutUs/3_birendra.jpeg')}
                title="Birendra"
                suBTitle="Community Manager"
              />
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  banner: {
    width: '90%',
    height: hp('30%'),
    alignSelf: 'center',
    borderRadius: 10,
    marginTop: 25,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },

  bannerImage: {
    width: '100%',
    height: '100%',
  },

  content: {
    paddingHorizontal: wp('5%'),
    paddingTop: hp('2.5%'),
  },

  title: {
    fontSize: wp('5.2%'),
    color: '#064E3B',
    fontWeight: '900',
    marginBottom: 4,
  },

  subtitle: {
    fontSize: wp('3.7%'),
    color: 'hsl(0, 0%, 15%)',
    fontWeight: '400',
    lineHeight: 19,
    marginTop: 10,
  },

  lineheighpara: {
    fontSize: wp('3.7%'),
    color: 'hsl(0, 0%, 15%)',
    fontWeight: '400',
    paddingTop: 8,
    lineHeight: 19,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: hp('0.5%'),
    marginBottom: '5%',
  },
});