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

type ServiceItem = typeof servicesData2[0];
type RowItem =
  | { type: 'pair'; items: ServiceItem[]; key: string }
  | { type: 'featured'; item: ServiceItem; key: string };

const PAIRS_BEFORE_FEATURED = 4;

function buildRows(services: ServiceItem[]): RowItem[] {
  const rows: RowItem[] = [];
  let i = 0;
  let pairCount = 0;

  while (i < services.length) {
    if (pairCount === PAIRS_BEFORE_FEATURED && i < services.length) {
      rows.push({ type: 'featured', item: services[i], key: `featured-${services[i].id}` });
      i++;
      pairCount = 0;
    } else {
      const pair: ServiceItem[] = [services[i]];
      if (i + 1 < services.length) pair.push(services[i + 1]);
      rows.push({ type: 'pair', items: pair, key: `pair-${pair.map(p => p.id).join('-')}` });
      i += pair.length;
      pairCount++;
    }
  }

  return rows;
}

export default function ServiceScreen() {
  const rows = useMemo(() => {
    const trending = servicesData2.filter(item => item.id !== 1 && item.id !== 4);
    return buildRows(trending);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: RowItem }) => {
      if (item.type === 'featured') {
        return (
          <View style={styles.featuredContainer}>
            <ServicesCards
              name={item.item.name}
              description={item.item.description}
              image={item.item.image}
              onPress={() =>
                router.push({
                  pathname: '/service/ServiceDetail',
                  params: { id: item.item.id.toString() },
                })
              }
            />
          </View>
        );
      }
      return (
        <View style={styles.pairRow}>
          {item.items.map((s) => (
            <View key={s.id} style={styles.serviceItemContainer}>
              <ServicesDisplaycard
                id={s.id}
                name={s.name}
                words={s.words}
                image={s.image}
                onPress={() =>
                  router.push({
                    pathname: '/service/ServiceDetail',
                    params: { id: s.id.toString() },
                  })
                }
              />
            </View>
          ))}
          {item.items.length === 1 && <View style={styles.serviceItemContainer} />}
        </View>
      );
    },
    []
  );

  const ListHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <Header1 />

      <ImageBackground
        source={require('../../../assets/header/Header.jpeg')}
        resizeMode="cover"
        style={styles.headerBackground}
        imageStyle={{ transform: [{ scale: 1.08 }] }}
      >
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>SuperFast Services</Text>
          <Text style={styles.headerSubtitle}>
            Express Home Service
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

        <Text style={styles.sectionTitle2}>Trending Services</Text>
      </View>
    </View>
  ), []);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
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
    overflow: 'hidden',
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

  pairRow: {
    flexDirection: 'row',
    paddingHorizontal: wp('4%'),
    justifyContent: 'space-between',
  },

  serviceItemContainer: {
    width: wp('44%'),
    marginBottom: hp('3%'),
  },

  featuredContainer: {
    paddingHorizontal: wp('4%'),
    marginBottom: hp('1%'),
  },

  listContent: {
    paddingBottom: hp('4%'),
  },
});
