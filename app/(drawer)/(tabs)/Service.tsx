import React, { useMemo, useCallback } from 'react';
import {
  View,
  ImageBackground,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';

import ServicesCards from '../../../components/services/ServicesCards';
import ServicesDisplaycard from '../../../components/services/ServicesDisplaycard';
import SliderCard from '../../../components/services/SliderCard';

import { servicesData2 } from '../../../src/data/ServiceData';

const topServices = servicesData2.filter(item => item.id === 1 || item.id === 4);

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

import Header1 from '@/components/Header1';
import { router } from 'expo-router';

export default function ServiceScreen() {
  const data = useMemo(() => {
    return servicesData2.filter(
      (item) => item.id !== 1 && item.id !== 4
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.serviceItemContainer}>
        <ServicesDisplaycard
          id={item.id}
          name={item.name}
          words={item.words}
          image={item.image}
          onPress={() =>
            router.push({
              pathname: '/service/ServiceDetail',
              params: { id: item.id.toString() },
            })
          }
        />
      </View>
    ),
    []
  );

  const ListHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <Header1 />

      <ImageBackground
        source={require('../../../assets/images/Banner.jpg')}
        resizeMode="cover"
        style={styles.headerBackground}
      >
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Our Services</Text>
          <Text style={styles.headerSubtitle}>
            On Demand Home Service in Nepal
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle1}>Top Services</Text>

        {topServices.map((item) => (
          <ServicesCards
            key={item.id}
            name={item.name}
            description={item.description}
            image={item.image}
            question={item.question}
            answer={item.answer}
            onPress={() =>
              router.push({
                pathname: '/service/ServiceDetail',
                params: { id: item.id.toString() },
              })
            }
          />
        ))}

        <View style={styles.sliderCardContainer}>
          <SliderCard
            name="Interior Designing"
            image={require('../../../assets/images/Interior Designing.webp')}
          />
        </View>

        <Text style={styles.sectionTitle2}>More Services</Text>
      </View>
    </View>
  ), []);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={ListHeader}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
  },

  headerBackground: {
    width: wp('100%'),
    height: hp('30%'),
    justifyContent: 'space-between',
    boxShadow: '0px 0px 2px #7cbc7a',
  },

  headerTextContainer: {
    position: 'absolute',
    top: hp('18%'),
    left: wp('5%'),
    width: wp('90%'),
    zIndex: 99,
  },

  headerTitle: {
    fontSize: wp('7%'),
    fontWeight: '800',
    color: '#fff',
    lineHeight: hp('5%'),
    flexWrap: 'wrap',
  },

  headerSubtitle: {
    fontSize: wp('3.8%'),
    fontWeight: '500',
    color: '#fff',
    lineHeight: hp('2.8%'),
    width: wp('90%'),
    flexWrap: 'wrap',
  },

  sectionContainer: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('4%'),
  },

  sectionTitle1: {
    fontSize: wp('4.5%'),
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: hp('3.2%'),
    marginTop: hp(-1),
  },

  sectionTitle2: {
    fontSize: wp('4.5%'),
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: hp('2%'),
    marginTop: hp('2%'),
  },

  sliderCardContainer: {
    marginTop: hp('2%'),
  },

  columnWrapper: {
    paddingHorizontal: wp('4%'),
    justifyContent: 'space-between',
  },

  serviceItemContainer: {
    width: wp('44%'),
    marginBottom: hp('3%'),
  },

  listContent: {
    paddingBottom: hp('4%'),
  },
});
