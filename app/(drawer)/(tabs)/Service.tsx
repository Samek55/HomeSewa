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

import { topServices } from '../../../src/data/TopServicesData';
import { servicesData2 } from '../../../src/data/ServiceData';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

import Header1 from '@/components/Header1';
import { router } from 'expo-router';

export default function ServiceScreen() {
  const numberOfItemsBeforeFooter = 6;

  // ✅ filter only once
  const data = useMemo(() => {
    return servicesData2.filter(
      (item) => item.id !== 1 && item.id !== 6
    );
  }, []);

  // ✅ memoized renderItem (FIX)
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (index === numberOfItemsBeforeFooter) {
        return (
          <View style={styles.sliderCardContainer}>
            <SliderCard
              name="Interior Designing"
              image={require('../../../assets/services/banner4.jpg')}
            />
          </View>
        );
      }

      return (
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
      );
    },
    []
  );

  // ✅ memoized header (IMPORTANT FIX)
  const ListHeader = useCallback(() => {
    return (
      <View style={styles.headerContainer}>
        <Header1 />

        <ImageBackground
          source={require('../../../assets/services/bannerServices.jpg')}
          resizeMode="cover"
          style={styles.headerBackground}
        >
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Painting</Text>
            <Text style={styles.headerSubtitle}>
              On Demand Home Service in Chennai
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

          <Text style={styles.sectionTitle2}>More Services</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        ListHeaderComponent={ListHeader}

        // ✅ PERFORMANCE FIXES
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews

        showsVerticalScrollIndicator={false}
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

  headerPadding: {
    marginTop: hp('2%'),
    paddingHorizontal: 15.7,
    position: 'absolute',
    zIndex: 9999,
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
    paddingHorizontal: wp('5%'),
    paddingTop: hp('4%'),
    width: wp('95%'),
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
    marginTop: hp(-1),

  },


  serviceItemContainer: {
    paddingLeft: wp('5%'),
    marginBottom: hp('3%'),
    width: wp('48%'),
  },

  sliderCardContainer: {
    paddingHorizontal: wp('5%'),
    marginBottom: hp('3%'),
  },
});



// export default function ServiceScreen() {
//     return (
//         <View style={styles.container}>
//             <Text style={styles.text}>Service Screen</Text>
//             <Pressable
//                 onPress={() => router.push("/service/ServiceDetail")}
//                 style={styles.button}
//             >
//                 <Text style={{color:'white'}} >go to service details</Text>
//             </Pressable>
//         </View>
//     );
// }

