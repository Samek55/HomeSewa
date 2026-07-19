import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { area, city } from '../../src/data/Data';
import { servicesData2 } from '../../src/data/ServiceData';
import TextArea from '../../components/bookings/TextArea';
import SubmitOverlay from '../../components/bookings/SubmitOverlay';
import countryLogo from '../../assets/images/NEW-Flag_of_Nepal.png';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import FileUploadBox from '../../components/bookings/FileUploadBox';
import ClearFormIcon from '../../assets/icons/booking/clear.png'
import DropdownAdd from '../../components/bookings/DropdownAdd';
import HeadshotCropModal from '../../components/bookings/HeadshotCropModal';
import Header3 from '@/components/Header3drawer';
import { uploadMultipleToStorage, uploadMultiplePrivateDocuments } from '@/api/uploadToStorage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import TermsCheckbox from '../../components/bookings/TermsCheckbox';
import { logEvent } from '@/lib/analytics';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const { width, height } = Dimensions.get('window');

const staticStyles = StyleSheet.create({
  text: {
    color: '#fff',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
});

const Button = ({ children, style, textStyle, onPress }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={style}
    >
      <Text style={[staticStyles.text, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export default function CareerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { clearForm } = useLocalSearchParams<{ clearForm?: string }>();

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [experience, setExperience] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [referralNumber, setReferralNumber] = useState('');

  type FileItem = {
    uri: string;
    fileName?: string;
  };


  // headshot crop flow
  const [tempHeadshotUri, setTempHeadshotUri] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // photos
  const [selectedHeadshot, setSelectedHeadshot] = useState<FileItem[]>([]);
  const [selectedID, setSelectedID] = useState<FileItem[]>([]);

  // dropdown states
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState<string[]>([]);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<'loading' | 'success'>('loading');

  // Shared active focus state system mapping layout changes
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const clearAllFields = () => {
    setName('');
    setNumber('');
    setGender('');
    setTempHeadshotUri(null);
    setSelectedHeadshot([]);
    setEmail('');
    setMessage('');
    setExperience('');

    setEmergencyNumber('');
    setReferralNumber('');
    setSelectedID([]);
    setSelectedExpertise([]);
    setSelectedCity('');
    setSelectedArea([]);
    setActiveInput(null);
    setAcceptedTerms(false);
  };

  useEffect(() => {
    if (clearForm === 'true') clearAllFields();
  }, [clearForm]);

  const handleClearForm = () => {
    Alert.alert(
      'Clear Form',
      'Are you sure you want to clear all fields?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Clear',
          style: 'destructive',
          onPress: () => { clearAllFields(); logEvent('career_form_cleared'); },
        },
      ]
    );
  };

  const pickHeadshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setTempHeadshotUri(result.assets[0].uri);
      setShowCropModal(true);
    }
  };

  const handleSubmit = async () => {
    const cleanNumber = number.replace(/\s/g, '');
    const cleanEmergencyNumber = emergencyNumber.replace(/\s/g, '');

    if (!name.trim()) {
      return Alert.alert('Validation Error', 'Full Name is required');
    }

    if (!cleanNumber || cleanNumber.length !== 10) {
      return Alert.alert('Validation Error', 'Enter a valid 10-digit phone number');
    }

    // Checked against `professional`, not `workforce` — that's the table with the
    // unique phone constraint and the one that actually gates login, so it's the
    // source of truth for "already registered" (a workforce-only check can miss
    // professionals whose workforce row was removed separately).
    const { data: existingProfessional } = await supabase
      .from('professional')
      .select('phone')
      .eq('phone', cleanNumber)
      .maybeSingle();

    if (existingProfessional) {
      return Alert.alert(
        'Already Registered',
        'This number is already registered. Please go to the login page to reset your PIN or log in from there.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Login', onPress: () => router.push('/Admin') },
        ]
      );
    }

    if (!gender) {
      return Alert.alert('Validation Error', 'Please select your gender');
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return Alert.alert('Validation Error', 'Enter a valid email address');
      }
    }

    if (!selectedExpertise || selectedExpertise.length === 0) {
      return Alert.alert('Validation Error', 'Please select your expertise');
    }

    if (!experience.trim()) {
      return Alert.alert('Validation Error', 'Experience is required');
    }
    if (Number(experience) < 1 || Number(experience) > 68) {
      return Alert.alert('Validation Error', 'Years of Experience must be between 1 and 68');
    }

    if (!selectedID || selectedID.length === 0) {
      return Alert.alert('Validation Error', 'Please upload your Citizenship / Driving Licence / NID');
    }

    if (!selectedCity) {
      return Alert.alert('Validation Error', 'Please select your city');
    }

    if (!selectedArea || selectedArea.length === 0) {
      return Alert.alert('Validation Error', 'Please select preferred working area');
    }

    if (!cleanEmergencyNumber || cleanEmergencyNumber.length !== 10) {
      return Alert.alert('Validation Error', 'Enter a valid emergency contact number');
    }

    if (!acceptedTerms) {
      return Alert.alert('Validation Error', 'Please accept the Terms & Conditions');
    }


    setOverlayStatus('loading');
    setOverlayVisible(true);

    try {
      const [idProofImages, headshotImages] = await Promise.all([
        // Citizenship/ID documents are sensitive — stored in a private bucket, never a public URL.
        uploadMultiplePrivateDocuments(
          selectedID.map(item => ({ uri: item.uri, fileName: item.fileName }))
        ),
        selectedHeadshot.length > 0
          ? uploadMultipleToStorage(selectedHeadshot.map(item => ({ uri: item.uri, fileName: item.fileName })))
          : Promise.resolve([]),
      ]);

      const career = {
        "Full Name": name,
        "Phone": cleanNumber,
        "Gender": gender,
        "Email": email,
        ...(headshotImages.length > 0 && { "Headshot": headshotImages.map((url: string) => ({ url })) }),
        "Your Expertise": selectedExpertise,
        "Years of Experience": experience,
        "Preferred City": selectedCity,
        "Preferred Working Area": selectedArea,
        "Emergency Contact Number": cleanEmergencyNumber,
        "Referral Phone Number": referralNumber,
        "Message": message,
        "Citizenship / Driving Licence / NID": idProofImages.map((url: string) => ({ url })),
      };

      await AsyncStorage.setItem('pendingCareerData', JSON.stringify(career));
      setOverlayVisible(false);

      logEvent('career_application_submitted', {
        expertise: selectedExpertise,
        experience_years: experience,
        city: selectedCity,
      });

      router.push({ pathname: '/CareerOTP', params: { phone: cleanNumber, name } });

    } catch (error) {
      console.log(error);
      setOverlayVisible(false);
      Alert.alert('Error', 'Upload failed. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header3 goHome />
      <SubmitOverlay
        visible={overlayVisible}
        status={overlayStatus}
        onClear={() => { clearAllFields(); setOverlayVisible(false); }}
        onClose={() => setOverlayVisible(false)}
      />
      {tempHeadshotUri && (
        <HeadshotCropModal
          visible={showCropModal}
          imageUri={tempHeadshotUri}
          onSave={(uri) => {
            setSelectedHeadshot([{ uri }]);
            setShowCropModal(false);
          }}
          onCancel={() => {
            setTempHeadshotUri(null);
            setShowCropModal(false);
          }}
        />
      )}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bottomOffset={120}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.formContainer, { marginBottom: hp('5%') }]}>
          <Text style={styles.title}>Join Now</Text>

          <View style={styles.spacerGap} />

          {/* Full Name */}
          <Text style={styles.label}>Full Name <Text style={{ color: colors.danger }}>*</Text></Text>
          <TextInput
            placeholder={activeInput === 'name' ? '' : 'Enter your Full Name'}
            value={name}
            onChangeText={setName}
            onFocus={() => setActiveInput('name')}
            onBlur={() => setActiveInput(null)}
            style={[
              styles.input,
              activeInput === 'name' && styles.inputActive
            ]}
            placeholderTextColor={colors.textMuted}
          />

          {/* Phone Number */}
          <Text style={styles.label}>Phone Number <Text style={{ color: colors.danger }}>*</Text></Text>
          <View style={styles.phoneContainer}>
            <Image
              source={countryLogo}
              style={styles.icon}
              resizeMode="contain"
            />
            <TextInput
              placeholder={activeInput === 'phone' ? '' : '98520 24 365'}
              value={number}
              onFocus={() => setActiveInput('phone')}
              onBlur={() => setActiveInput(null)}
              onChangeText={(value) => {
                let cleaned = value.replace(/[^0-9]/g, '');
                cleaned = cleaned.slice(0, 10);
                let formatted = cleaned;

                if (cleaned.length > 5 && cleaned.length <= 7) {
                  formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5);
                } else if (cleaned.length > 7) {
                  formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5, 7) + ' ' + cleaned.slice(7);
                }
                setNumber(formatted);
              }}
              keyboardType="number-pad"
              style={[
                styles.phoneInput,
                activeInput === 'phone' && styles.inputActive
              ]}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Gender */}
          <View style={styles.genderRow}>
            <Text style={[styles.label, { marginBottom: 0 }]}>Gender <Text style={{ color: colors.danger }}>*</Text></Text>
            <View style={styles.radioRow}>
              {['Male', 'Female'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.radioOption}
                  onPress={() => setGender(option)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioOuter}>
                    {gender === option && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Headshot */}
          <Text style={styles.label}>Headshot / Profile Picture</Text>
          <FileUploadBox
            value={selectedHeadshot}
            onChange={setSelectedHeadshot}
            label="Upload Profile Picture"
            onPressOverride={pickHeadshot}
          />

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder={activeInput === 'email' ? '' : 'Enter your email address'}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setActiveInput('email')}
            onBlur={() => setActiveInput(null)}
            style={[
              styles.input,
              activeInput === 'email' && styles.inputActive
            ]}
            placeholderTextColor={colors.textMuted}
          />

          {/* Your Expertise */}
          <Text style={styles.label}>Your Expertise <Text style={{ color: colors.danger }}>*</Text></Text>
          <DropdownAdd
            options={servicesData2.map(s => s.name)}
            placeholder="Select maximum UpTo 5"
            placeholderColor={colors.textMuted}
            value={selectedExpertise}
            onSelectOption={setSelectedExpertise}
            onOpen={() => setActiveInput('expertise')}
            onClose={() => setActiveInput(null)}
            maxSelections={5}
          />

          {/* Years of Experience */}
          <Text style={styles.label}>Years of Experience <Text style={{ color: colors.danger }}>*</Text></Text>
          <TextInput
            placeholder={activeInput === 'experience' ? '' : '5'}
            value={experience}
            onFocus={() => setActiveInput('experience')}
            onBlur={() => setActiveInput(null)}
            onChangeText={(text) => {
              const onlyNumbers = text.replace(/[^0-9]/g, '');
              const clamped = onlyNumbers && Number(onlyNumbers) > 68 ? '68' : onlyNumbers;
              setExperience(clamped);
            }}
            style={[
              styles.input,
              activeInput === 'experience' && styles.inputActive
            ]}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            maxLength={2}
          />

          {/* ID Proof */}
          <Text style={styles.label}>Citizenship / Driving Licence / NID <Text style={{ color: colors.danger }}>*</Text></Text>
          <FileUploadBox
            value={selectedID}
            onChange={setSelectedID}
          />

          {/* Preferred City */}
          <Text style={styles.label}>Preferred City <Text style={{ color: colors.danger }}>*</Text></Text>
          <DropdownAdd
            options={city}
            placeholder="Select your preferred city"
            placeholderColor={colors.textMuted}
            value={selectedCity ? [selectedCity] : []}
            onSelectOption={(vals) => {
              const picked = vals[vals.length - 1] ?? '';
              setSelectedCity(picked);
              setSelectedArea([]);
            }}
            onOpen={() => setActiveInput('city')}
            onClose={() => setActiveInput(null)}
            maxSelections={1}
          />

          {/* Preferred Working Area */}
          <Text style={styles.label}>Preferred Working Area <Text style={{ color: colors.danger }}>*</Text></Text>
          <DropdownAdd
            options={area}
            placeholder="Select maximum UpTo 5"
            placeholderColor={colors.textMuted}
            value={selectedArea}
            onSelectOption={setSelectedArea}
            onOpen={() => setActiveInput('workingArea')}
            onClose={() => setActiveInput(null)}
            maxSelections={5}
          />


          {/* Emergency Contact Number */}
          <Text style={styles.label}>Emergency Contact Number <Text style={{ color: colors.danger }}>*</Text></Text>
          <View style={styles.phoneContainer}>
            <Image
              source={countryLogo}
              style={styles.icon}
              resizeMode="contain"
            />
            <TextInput
              placeholder={activeInput === 'emergencyPhone' ? '' : '98520 24 365'}
              value={emergencyNumber}
              onFocus={() => setActiveInput('emergencyPhone')}
              onBlur={() => setActiveInput(null)}
              onChangeText={(value) => {
                let cleaned = value.replace(/[^0-9]/g, '');
                cleaned = cleaned.slice(0, 10);
                let formatted = cleaned;

                if (cleaned.length > 5 && cleaned.length <= 7) {
                  formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5);
                } else if (cleaned.length > 7) {
                  formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5, 7) + ' ' + cleaned.slice(7);
                }
                setEmergencyNumber(formatted);
              }}
              keyboardType="number-pad"
              style={[
                styles.phoneInput,
                activeInput === 'emergencyPhone' && styles.inputActive
              ]}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Referral Phone Number */}
          <Text style={styles.label}>Referral Phone Number</Text>
          <View style={styles.phoneContainer}>
            <Image
              source={countryLogo}
              style={styles.icon}
              resizeMode="contain"
            />
            <TextInput
              placeholder={activeInput === 'referralPhone' ? '' : 'Enter referral phone number'}
              value={referralNumber}
              onFocus={() => setActiveInput('referralPhone')}
              onBlur={() => setActiveInput(null)}
              onChangeText={(value) => {
                let cleaned = value.replace(/[^0-9]/g, '');
                cleaned = cleaned.slice(0, 10);
                let formatted = cleaned;
                if (cleaned.length > 5 && cleaned.length <= 7) {
                  formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5);
                } else if (cleaned.length > 7) {
                  formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5, 7) + ' ' + cleaned.slice(7);
                }
                setReferralNumber(formatted);
              }}
              keyboardType="number-pad"
              style={[
                styles.phoneInput,
                activeInput === 'referralPhone' && styles.inputActive
              ]}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Message */}
          <Text style={styles.label}>Message</Text>
          <TextArea
            value={message}
            onChangeText={setMessage}
            placeholder=""
            placeholderTextColor={colors.textMuted}
            maxHeight={160}
            onFocus={() => setActiveInput('message')}
            onBlur={() => setActiveInput(null)}
            style={activeInput === 'message' && styles.inputActive}
          />

          <TermsCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} />

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable style={styles.buttonClearFlex} onPress={handleClearForm}>
              <Image source={ClearFormIcon} style={styles.clearIcon} />
              <Text style={styles.buttonClear}>Clear form</Text>
            </Pressable>

            <Button
              style={styles.buttonSubmit}
              textStyle={{ color: 'white', textAlign: 'center' }}
              onPress={handleSubmit}
            >
              Submit
            </Button>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: hp('4%'),
  },
  formContainer: {
    paddingHorizontal: width * 0.06, // Optimized padding grid alignment
    paddingTop: height * 0.02,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: width * 0.065,
    fontWeight: '700',
    color: colors.brand,
    paddingLeft: 3,
  },
  spacerGap: {
    marginVertical: 20
  },
  input: {
    borderWidth: 1.5, // Standard premium design blueprint thickness
    borderRadius: 12,
    paddingHorizontal: width * 0.035,
    height: height * 0.055, // Standard responsive sizing height standard
    marginBottom: height * 0.02,
    fontSize: width * 0.035,
    fontWeight: '500',
    borderColor: colors.border,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputActive: {
    borderColor: colors.brand,
    backgroundColor: colors.surfaceMuted,
  },
  phoneContainer: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: height * 0.02,
  },
  icon: {
    width: wp('7%'),
    height: hp('3%'),
    position: 'absolute',
    left: 10,
    zIndex: 2,
  },
  clearIcon: {
    width: wp('6%'),
    height: hp('2.5%'),
    resizeMode: 'contain',
    marginRight: 4,
    tintColor: colors.brand,
  },
  phoneInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    borderColor: colors.border,
    height: height * 0.055,
    paddingLeft: wp('12%'),
    paddingRight: 10,
    fontSize: width * 0.035,
    fontWeight: '500',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  label: {
    marginBottom: 6,
    paddingLeft: 4,
    fontSize: wp('3.6%'),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  helperText: {
    fontSize: wp('3%'),
    color: colors.textMuted,
    paddingLeft: 4,
    marginTop: -hp('1.5%'),
    marginBottom: hp('1.5%'),
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('2.5%'),
    gap: wp('4%'),
  },
  radioRow: {
    flexDirection: 'row',
    gap: wp('6%'),
    paddingHorizontal: wp('1%'),
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  radioLabel: {
    fontSize: wp('3.6%'),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  buttonSubmit: {
    width: width * 0.4,
    height: height * 0.058,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 40,
    backgroundColor: colors.brand,
  },
  buttonClear: {
    color: colors.brand,
    fontSize: width * 0.038,
    fontWeight: '500',
  },
  buttonClearFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  text: {
    color: '#fff',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
});
