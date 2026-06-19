import React, { useRef, useState, useEffect } from 'react';
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
import Dropdown from '../../components/bookings/Dropdown';
import { businessType, city, howduhear, partnershipInterest, services } from '../../src/data/Data';
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
import Header3 from '@/components/Header3drawer';
import { uploadMultipleToCloudinary } from '@/api/uploadToCloudinary';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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

export default function PartnershipScreen() {
  const scrollRef = useRef<any>(null);
  const { clearForm } = useLocalSearchParams<{ clearForm?: string }>();

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState('');
  type FileItem = {
    uri: string;
    fileName?: string;
  };
  // photoss
  const [selectCompanyPhotos, setSelectCompanyPhotos] = useState<FileItem[]>([]);
  const [selectCRCphotos, setSelectCRCphotos] = useState<FileItem[]>([]);

  // dropdown states (separated properly)
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState('');
  const [selectedPartnership, setSelectedPartnership] = useState('');
  const [selectedHowHeard, setSelectedHowHeard] = useState('Google Search');
  const [selectedServicesOffered, setSelectedServicesOffered] = useState<string[]>([]);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<'loading' | 'success'>('loading');

  // Shared active focus state system mapping layout changes
  const [activeInput, setActiveInput] = useState<string | null>(null);

  const clearAllFields = () => {
    setName('');
    setNumber('');
    setEmail('');
    setOrganizationName('');
    setMessage('');
    setEmployees('');
    setSelectCompanyPhotos([]);
    setSelectCRCphotos([]);
    setSelectedArea('');
    setSelectedBusinessType('');
    setSelectedPartnership('');
    setSelectedHowHeard('Google Search');
    setSelectedServicesOffered([]);
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

  const handleSubmit = async () => {
    const cleanNumber = number.replace(/\s/g, '');

    if (!name.trim()) {
      return Alert.alert('Validation Error', 'Full Name is required');
    }

    if (!cleanNumber || cleanNumber.length !== 10) {
      return Alert.alert('Validation Error', 'Enter a valid 10-digit phone number');
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return Alert.alert('Validation Error', 'Enter a valid email address');
      }
    }

    if (!organizationName.trim()) {
      return Alert.alert('Validation Error', 'Organization name is required');
    }

    if (!employees.trim()) {
      return Alert.alert('Validation Error', 'Number of employees is required');
    }

    if (!selectedArea.trim()) {
      return Alert.alert('Validation Error', 'Please select area');
    }

    if (!selectedBusinessType.trim()) {
      return Alert.alert('Validation Error', 'Please select business type');
    }

    if (!selectedPartnership.trim()) {
      return Alert.alert('Validation Error', 'Please select partnership type');
    }

    if (!selectedHowHeard.trim()) {
      return Alert.alert('Validation Error', 'Please select how you heard about us');
    }

    if (selectedServicesOffered.length === 0) {
      return Alert.alert('Validation Error', 'Please select at least one service');
    }

    if (selectCompanyPhotos.length === 0) {
      return Alert.alert('Validation Error', 'Please upload company photos');
    }

    if (selectCRCphotos.length === 0) {
      return Alert.alert('Validation Error', 'Please upload CRC photos');
    }

    if (!message.trim()) {
      return Alert.alert('Validation Error', 'Message cannot be empty');
    }

    setOverlayStatus('loading');
    setOverlayVisible(true);

    try {
      const [companyImages, crcImages] = await Promise.all([
        uploadMultipleToCloudinary(
          selectCompanyPhotos.map(item => ({ uri: item.uri, fileName: item.fileName }))
        ),
        uploadMultipleToCloudinary(
          selectCRCphotos.map(item => ({ uri: item.uri, fileName: item.fileName }))
        ),
      ]);

      const partnership = {
        "Full Name": name,
        "Name of Organisation": organizationName,
        "Phone Number": cleanNumber,
        "eMail": email,
        "City": selectedArea,
        "Number of Employees": Number(employees),
        "Business Type": selectedBusinessType,
        "Services Offered": selectedServicesOffered,
        "Partnership Interests": selectedPartnership,
        "How did you hear about us?": selectedHowHeard,
        "Message": message,
        "Company Photos": companyImages.map(url => ({ url })),
        "Company Registration Certificates": crcImages.map(url => ({ url })),
      };

      await AsyncStorage.setItem('pendingPartnershipData', JSON.stringify(partnership));
      setOverlayVisible(false);
      router.push({ pathname: '/PartnershipOTP', params: { phone: cleanNumber, name } });

    } catch (error) {
      setOverlayVisible(false);
      Alert.alert('Error', 'Upload failed. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Header3 />
      <SubmitOverlay
        visible={overlayVisible}
        status={overlayStatus}
        onClear={() => { clearAllFields(); setOverlayVisible(false); }}
        onClose={() => setOverlayVisible(false)}
      />
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
          <Text style={styles.title}>Become a Partner</Text>
          <Text style={styles.subTitle}>Partnership opportunity with HomeSewa</Text>

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

          {/* Name of Organization */}
          <Text style={styles.label}>Name of Organization <Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            placeholder={activeInput === 'organization' ? '' : 'Enter the name of your Organization'}
            value={organizationName}
            onChangeText={setOrganizationName}
            onFocus={() => setActiveInput('organization')}
            onBlur={() => setActiveInput(null)}
            style={[
              styles.input,
              activeInput === 'organization' && styles.inputActive
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

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder={activeInput === 'email' ? '' : 'Enter your Email Address'}
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

          {/* Company Photos */}
          <Text style={styles.label}>Company Photos <Text style={{ color: 'red' }}>*</Text></Text>
          <FileUploadBox
            value={selectCompanyPhotos}
            onChange={setSelectCompanyPhotos}
          />

          {/* Area Dropdown */}
          <Text style={styles.label}>Area <Text style={{ color: 'red' }}>*</Text></Text>
          <Dropdown
            options={city}
            placeholder="Select your Area"
            placeholderColor="#4B4B4B"
            onSelectOption={setSelectedArea}
            value={selectedArea}
            onOpen={() => setActiveInput('area')}
            onClose={() => setActiveInput(null)}
          />

          {/* Number of Employees */}
          <Text style={styles.label}>Number of Employees <Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            placeholder={activeInput === 'employees' ? '' : 'Enter the number of Employees'}
            placeholderTextColor={'#4B4B4B'}
            keyboardType="numeric"
            value={employees}
            onFocus={() => setActiveInput('employees')}
            onBlur={() => setActiveInput(null)}
            onChangeText={(text) => {
              const onlyNumbers = text.replace(/[^0-9]/g, '');
              setEmployees(onlyNumbers);
            }}
            style={[
              styles.input,
              activeInput === 'employees' && styles.inputActive
            ]}
          />

          {/* Business Type Dropdown */}
          <Text style={styles.label}>Business Type <Text style={{ color: 'red' }}>*</Text></Text>
          <Dropdown
            options={businessType}
            placeholder="Select your Business Type"
            placeholderColor="#4B4B4B"
            onSelectOption={setSelectedBusinessType}
            value={selectedBusinessType}
            onOpen={() => setActiveInput('businessType')}
            onClose={() => setActiveInput(null)}
          />

          {/* Services Offered Dropdown Add (MultiSelect) */}
          <Text style={styles.label}>Services Offered <Text style={{ color: 'red' }}>*</Text></Text>
          <DropdownAdd
            options={services}
            placeholder="Select the Services you offer"
            placeholderColor="#4B4B4B"
            onSelectOption={setSelectedServicesOffered}
            value={selectedServicesOffered}
            onOpen={() => setActiveInput('servicesOffered')}
            onClose={() => setActiveInput(null)}
          />

          {/* Partnership Interest Dropdown */}
          <Text style={styles.label}>Partnership Interest <Text style={{ color: 'red' }}>*</Text></Text>
          <Dropdown
            options={partnershipInterest}
            placeholder="Select Partnership Interest"
            placeholderColor="#4B4B4B"
            onSelectOption={setSelectedPartnership}
            value={selectedPartnership}
            onOpen={() => setActiveInput('partnership')}
            onClose={() => setActiveInput(null)}
          />

          {/* Company Registration Certificates */}
          <Text style={styles.label}>Company Registration Certificates <Text style={{ color: 'red' }}>*</Text></Text>
          <FileUploadBox
            value={selectCRCphotos}
            onChange={setSelectCRCphotos}
          />

          {/* How did you hear about us Dropdown */}
          <Text style={styles.label}>How did you hear about us? <Text style={{ color: 'red' }}>*</Text></Text>
          <Dropdown
            options={howduhear}
            placeholder="How did you hear about us?"
            placeholderColor="#4B4B4B"
            onSelectOption={setSelectedHowHeard}
            value={selectedHowHeard}
            onOpen={() => setActiveInput('howHeard')}
            onClose={() => setActiveInput(null)}
          />

          {/* Message TextArea */}
          <Text style={styles.label}>Message <Text style={{ color: 'red' }}>*</Text></Text>
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

          {/* Form Actions */}
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
  subTitle: {
    fontSize: width * 0.034,
    fontWeight: '400',
    color: '#666',
    paddingLeft: 3,
    marginTop: 4,
  },
  spacerGap: {
    marginVertical: 20
  },
  input: {
    borderWidth: 1.5, // Standard premium design blueprint thickness
    borderRadius: 12,
    paddingHorizontal: width * 0.035,
    height: height * 0.055, // Responsive sizing standard
    marginBottom: height * 0.02,
    fontSize: width * 0.035,
    fontWeight: '500',
    borderColor: '#E2E8F0', // Replaced raw dark black outline with elegant slate gray
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