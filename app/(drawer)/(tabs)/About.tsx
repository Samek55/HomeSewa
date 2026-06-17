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
              source={require('../../../assets/header/Header.jpeg')}
              style={styles.bannerImage}
              resizeMode="cover"
              fadeDuration={0}
            />
          </View>

          {/* CONTENT */}
          <View style={styles.content}>

            <Text style={styles.title}>About Us</Text>

            <Text style={styles.subtitle}>
              Home Sewa is a technology-driven express home service marketplace designed to connect customers with nearby service professionals through real-time location-based matching.
            </Text>

            <Text style={styles.lineheighpara}>
              The platform aims to simplify the process of finding trusted service providers while helping skilled professionals generate business opportunities within their local communities.
            </Text>

            <Text style={styles.lineheighpara}>
              With increasing urbanization and growing demand for on-demand services, customers often struggle to find reliable professionals quickly, while service providers face challenges in acquiring quality leads.
            </Text>

            <Text style={styles.lineheighpara}>
              Home Sewa bridges this gap by enabling instant service requests, AI powered matching, and real-time notifications.
            </Text>

            {/* TEAM */}
            <View style={{ height: 18 }} />

            <Text style={styles.title}>Our Team</Text>

            <View style={styles.row}>
              <OurTeamCard
                image={require('../../../assets/aboutUs/Yogendra.jpeg')}
                title="Yogendra"
                suBTitle="CEO"
              />

              <OurTeamCard
                image={require('../../../assets/aboutUs/Pankaj.jpeg')}
                title="Pankaj"
                suBTitle="CFO"
              />

              <OurTeamCard
                image={require('../../../assets/aboutUs/Raju.jpeg')}
                title="Raju"
                suBTitle="CMO"
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
    textAlign: 'justify',
  },

  lineheighpara: {
    fontSize: wp('3.7%'),
    color: 'hsl(0, 0%, 15%)',
    fontWeight: '400',
    paddingTop: 8,
    lineHeight: 19,
    textAlign: 'justify',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: hp('0.5%'),
    marginBottom: '5%',
  },
});