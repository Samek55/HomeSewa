import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Dimensions,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import ServicesDisplaycard from '../../../../components/services/ServicesDisplaycard';
import { servicesData2 } from '../../../../src/data/ServiceData';
import { LinearGradient } from 'expo-linear-gradient';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { router, useLocalSearchParams } from 'expo-router';
import Header2 from '@/components/Header2';

const { width, height } = Dimensions.get('window');

const scaleFont = (size: number) => (size * width) / 375;

const Button = ({ children, onPress }: any) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={['#064e3b', '#065f46', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button1}
      >
        <Text style={styles.text}>{children}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function SingleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const service = useMemo(() => {
    return servicesData2.find(item => item.id.toString() === id);
  }, [id]);

  const formatDescription = (text: string) => {
    if (!text) return '';

    const words = text.split(' ');
    const result: string[] = [];

    let segment: string[] = [];
    let count = 0;

    for (let i = 0; i < words.length; i++) {
      segment.push(words[i]);
      count++;

      if (count >= 20 && words[i].endsWith('.')) {
        result.push(segment.join(' '));
        segment = [];
        count = 0;
      }
    }

    if (segment.length) result.push(segment.join(' '));

    return result.join('\n\n');
  };

  const otherServices = useMemo(() => {
    if (!service) return [];

    const excludedIds = [8.1, 8.2];

    return servicesData2
      .filter(
        item =>
          item.id !== service.id &&
          !excludedIds.includes(item.id)
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
  }, [service]);

  if (!service) {
    return (
      <View style={styles.center}>
        <Text>Service not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header2/>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>

          <View style={styles.imageContainer}>
            <Image
              source={service.image}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          <Text style={[styles.subtitle, { fontSize: scaleFont(17) }]}>
            {service.name} Services in Chennai
          </Text>

          <Text style={[styles.description, { fontSize: scaleFont(14) }]}>
            {formatDescription(service.description)}
          </Text>

          <Text style={[styles.question, { fontSize: scaleFont(15) }]}>
            {service.question}
          </Text>

          <Text style={[styles.answer, { fontSize: scaleFont(14) }]}>
            {service.answer}
          </Text>

          <View style={styles.buttonPadding}>
            <Button onPress={() => router.push('/Book')}>
              Book a Service
            </Button>
          </View>

          <Text style={[styles.otherServicesTitle, { fontSize: scaleFont(18) }]}>
            Related Services
          </Text>

          <View style={styles.servicesContainer}>
            {otherServices.map(item => (
              <ServicesDisplaycard
                key={item.id}
                style={{ width: '48%' }}
                words={item.words}
                name={item.name}
                image={item.image}
                question={item.question}
                answer={item.answer}
                description={item.description}
                onPress={() =>
                  router.push({
                    pathname: '/service/ServiceDetail',
                    params: {
                      id: item.id.toString(),
                    },
                  })
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor:'#fff'
  },

  container: {
    paddingHorizontal: '5%',
    paddingTop: '6%',
  },

  imageContainer: {
    width: '100%',
    height: height * 0.27,
    overflow: 'hidden',
    borderRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  subtitle: {
    color: '#064E3B',
    fontWeight: '700',
    marginBottom: '4%',
  },

  description: {
    fontWeight: '500',
  },

  question: {
    fontWeight: '800',
    marginTop: '3%',
    marginBottom: '2%',
  },

  answer: {
    fontWeight: '500',
  },

  otherServicesTitle: {
    color: '#064E3B',
    fontWeight: '900',
    marginBottom: '3%',
  },

  servicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: '5%',
  },

  buttonPadding: {
    paddingVertical: hp('4%'),
    alignItems: 'center',
  },

  button1: {
    width: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 39,
  },

  text: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});