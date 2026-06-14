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
              HomeSewa is a Nepal-based on-demand home service platform by SRIYOG Consulting Pvt. Ltd., delivering fast, reliable, and professional home services across Kathmandu Valley and major cities of Nepal — powered by skilled professionals available 7 days a week.
            </Text>

            <Text style={styles.lineheighpara}>
              Founded in Kathmandu, our mission is to connect every Nepali household with trusted home service professionals under one platform — eliminating the hassle of searching for plumbers, electricians, cleaners, and technicians separately.
            </Text>

            <Text style={styles.lineheighpara}>
              Our vision is to become Nepal's most trusted home service marketplace, recognized for professionalism, accessibility, and service excellence — building long-term relationships with households, offices, and commercial establishments across Nepal.
            </Text>

            <Text style={styles.companyTag}>
              A product of SRIYOG Consulting Pvt. Ltd., Kamalpokhari, Kathmandu, Nepal.
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
    color: '#295C59',
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

  companyTag: {
    fontSize: wp('3.3%'),
    color: '#059669',
    fontWeight: '600',
    marginTop: 14,
    fontStyle: 'italic',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: hp('0.5%'),
    marginBottom: '5%',
  },
});