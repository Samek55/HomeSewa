import { useRef, useState, useEffect } from 'react';
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
  Platform,
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
import { uploadMultipleToStorage } from '@/api/uploadToStorage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const Button = ({ children, style, textStyle, onPress }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={style}
    >
      <Text style={[styles.text, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export default function CareerScreen() {
  const scrollRef = useRef<any>(null);
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
          onPress: clearAllFields,
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


    setOverlayStatus('loading');
    setOverlayVisible(true);

    try {
      const [idProofImages, headshotImages] = await Promise.all([
        uploadMultipleToStorage(
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
        "Emergency Contact Number": emergencyNumber,
        "Referral Phone Number": referralNumber,
        "Message": message,
        "Citizenship / Driving Licence / NID": idProofImages.map((url: string) => ({ url })),
      };

      await AsyncStorage.setItem('pendingCareerData', JSON.stringify(career));
      setOverlayVisible(false);
      router.push({ pathname: '/CareerOTP', params: { phone: cleanNumber, name } });

    } catch (error) {
      console.log(error);
      setOverlayVisible(false);
      Alert.alert('Error', 'Upload failed. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
          onSave={() => {
            setSelectedHeadshot([{ uri: tempHeadshotUri }]);
            setShowCropModal(false);
          }}
          onCancel={() => {
            setTempHeadshotUri(null);
            setShowCropModal(false);
          }}
        />
      )}
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={120}
        keyboardShouldPersistTaps="handled"
        enableResetScrollToCoords={false}
        resetScrollToCoords={undefined}
        enableAutomaticScroll={Platform.OS === 'ios'}
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.formContainer, { marginBottom: hp('5%') }]}>
          <Text style={styles.title}>Join Now</Text>

          <View style={styles.spacerGap} />

          {/* Full Name */}
          <Text style={styles.label}>Full Name <Text style={{ color: 'red' }}>*</Text></Text>
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
            placeholderTextColor={'#4B4B4B'}
          />

          {/* Phone Number */}
          <Text style={styles.label}>Phone Number <Text style={{ color: 'red' }}>*</Text></Text>
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
              placeholderTextColor={'#4B4B4B'}
            />
          </View>

          {/* Gender */}
          <View style={styles.genderRow}>
            <Text style={[styles.label, { marginBottom: 0 }]}>Gender <Text style={{ color: 'red' }}>*</Text></Text>
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
            placeholderTextColor={'#4B4B4B'}
          />

          {/* Your Expertise */}
          <Text style={styles.label}>Your Expertise <Text style={{ color: 'red' }}>*</Text></Text>
          <DropdownAdd
            options={servicesData2.map(s => s.name)}
            placeholder="Select maximum UpTo 5"
            placeholderColor="#4B4B4B"
            value={selectedExpertise}
            onSelectOption={setSelectedExpertise}
            onOpen={() => setActiveInput('expertise')}
            onClose={() => setActiveInput(null)}
            maxSelections={5}
          />

          {/* Years of Experience */}
          <Text style={styles.label}>Years of Experience <Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            placeholder={activeInput === 'experience' ? '' : '5'}
            value={experience}
            onFocus={() => setActiveInput('experience')}
            onBlur={() => setActiveInput(null)}
            onChangeText={(text) => {
              const onlyNumbers = text.replace(/[^0-9]/g, '');
              setExperience(onlyNumbers);
            }}
            style={[
              styles.input,
              activeInput === 'experience' && styles.inputActive
            ]}
            placeholderTextColor={'#4B4B4B'}
            keyboardType="numeric"
          />

          {/* ID Proof */}
          <Text style={styles.label}>Citizenship / Driving Licence / NID <Text style={{ color: 'red' }}>*</Text></Text>
          <FileUploadBox
            value={selectedID}
            onChange={setSelectedID}
          />

          {/* Preferred City */}
          <Text style={styles.label}>Preferred City <Text style={{ color: 'red' }}>*</Text></Text>
          <DropdownAdd
            options={city}
            placeholder="Select your preferred city"
            placeholderColor="#4B4B4B"
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
          <Text style={styles.label}>Preferred Working Area <Text style={{ color: 'red' }}>*</Text></Text>
          <DropdownAdd
            options={area}
            placeholder="Select maximum UpTo 5"
            placeholderColor="#4B4B4B"
            value={selectedArea}
            onSelectOption={setSelectedArea}
            onOpen={() => setActiveInput('workingArea')}
            onClose={() => setActiveInput(null)}
            maxSelections={5}
          />


          {/* Emergency Contact Number */}
          <Text style={styles.label}>Emergency Contact Number <Text style={{ color: 'red' }}>*</Text></Text>
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
              placeholderTextColor={'#4B4B4B'}
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
              placeholderTextColor={'#4B4B4B'}
            />
          </View>

          {/* Message */}
          <Text style={styles.label}>Message</Text>
          <TextArea
            value={message}
            onChangeText={setMessage}
            placeholder=""
            placeholderTextColor="#4B4B4B"
            maxHeight={160}
            onFocus={() => setActiveInput('message')}
            onBlur={() => setActiveInput(null)}
            style={activeInput === 'message' && styles.inputActive}
          />

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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  formContainer: {
    paddingHorizontal: width * 0.06, // Optimized padding grid alignment
    paddingTop: height * 0.02,
    backgroundColor: 'white',
  },
  title: {
    fontSize: width * 0.065,
    fontWeight: '700',
    color: '#295C59',
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
    borderColor: '#E2E8F0', // Replaced raw dark black outline with slate neutral gray
    color: '#1A1A1A',
    backgroundColor: '#fff',
  },
  inputActive: {
    borderColor: '#295C59',
    backgroundColor: '#EFF8F7',
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
    tintColor: '#295C59',
  },
  phoneInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    borderColor: '#E2E8F0',
    height: height * 0.055,
    paddingLeft: wp('12%'),
    paddingRight: 10,
    fontSize: width * 0.035,
    fontWeight: '500',
    color: '#1A1A1A',
    backgroundColor: '#fff',
  },
  label: {
    marginBottom: 6,
    paddingLeft: 4,
    fontSize: wp('3.6%'),
    fontWeight: '600',
    color: '#4A4A4A',
  },
  helperText: {
    fontSize: wp('3%'),
    color: '#888',
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
    borderColor: '#295C59',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#295C59',
  },
  radioLabel: {
    fontSize: wp('3.6%'),
    color: '#4A4A4A',
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
    backgroundColor: '#295C59',
  },
  buttonClear: {
    color: '#295C59',
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
