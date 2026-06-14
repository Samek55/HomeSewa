import {View, Text} from 'react-native';
import React from 'react';
import OnboardingComponent from '../../components/onBoarding/onboardingComponent';
import {StyleSheet} from 'react-native';
import { router } from 'expo-router';


export default function OnBoarding1() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} >
              What can you do?
            </Text>
            <Text style={styles.subtitle}>
              From repairs to renovations, we handle it all with expert care.
            </Text>
      <OnboardingComponent
        title="Next"
        image={require('../../assets/onBoarding/onBoarding2.png')}
        onPress={() => router.push('/onboarding3')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
    title: {
    paddingTop:95,
    paddingLeft:21,
    fontSize:25,
    fontWeight:'800',
    paddingBottom:12,
    color:'green',
  },
  subtitle: {
    paddingHorizontal:21,
    fontSize:16,
    lineHeight:22,
    color:'green',

  },
});

