import React, { useState, useEffect, useMemo } from 'react';
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
import Dropdown from '../../components/bookings/Dropdown';
import { businessType, city, howduhear, partnershipInterest, services } from '../../src/data/Data';
import TextArea from '../../components/bookings/TextArea';
import SubmitOverlay from '../../components/bookings/SubmitOverlay';
import countryLogo from '../../assets/images/NEW-Flag_of_Nepal.png';
import { sanitizeNameInput } from '../../src/utils/sanitizeName';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import FileUploadBox from '../../components/bookings/FileUploadBox';
import ClearFormIcon from '../../assets/icons/booking/clear.png'
import DropdownAdd from '../../components/bookings/DropdownAdd';
import Header3 from '@/components/Header3drawer';
import { uploadMultipleToStorage } from '@/api/uploadToStorage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
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

export default function PartnershipScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
          onPress: () => { clearAllFields(); logEvent('partnership_form_cleared'); },
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

    if (!acceptedTerms) {
      return Alert.alert('Validation Error', 'Please accept the Terms & Conditions');
    }

    setOverlayStatus('loading');
    setOverlayVisible(true);

    try {
      const [companyImages, crcImages] = await Promise.all([
        uploadMultipleToStorage(
          selectCompanyPhotos.map(item => ({ uri: item.uri, fileName: item.fileName }))
        ),
        uploadMultipleToStorage(
          selectCRCphotos.map(item => ({ uri: item.uri, fileName: item.fileName }))
        ),
      ]);

      const partnership = {
        "Full Name": name,
        "Name of Organisation": organizationName,
        "Phone Number": cleanNumber,
        "Email": email,
        "City": selectedArea,
        "Number of Employees": Number(employees),
        "Business Type": selectedBusinessType,
        "Services Offered": selectedServicesOffered,
        "Partnership Interests": selectedPartnership,
        "How did you hear about us?": selectedHowHeard,
        "Message": message,
        "Company Photos": companyImages.map((url: string) => ({ url })),
        "Company Registration Certificates": crcImages.map((url: string) => ({ url })),
      };

      await AsyncStorage.setItem('pendingPartnershipData', JSON.stringify(partnership));
      setOverlayVisible(false);

      logEvent('partnership_application_submitted', {
        business_type: selectedBusinessType,
        partnership_interest: selectedPartnership,
        city: selectedArea,
        services_offered: selectedServicesOffered,
        how_heard: selectedHowHeard,
      });

      router.push({ pathname: '/PartnershipOTP', params: { phone: cleanNumber, name } });

    } catch (error) {
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
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bottomOffset={120}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.formContainer, { marginBottom: hp('5%') }]}>
          <Text style={styles.title}>Become a Partner</Text>
          <Text style={styles.subTitle}>Partnership opportunity with HomeSewa</Text>

          <View style={styles.spacerGap} />

          {/* Full Name */}
          <Text style={styles.label}>Full Name <Text style={{ color: colors.danger }}>*</Text></Text>
          <TextInput
            placeholder={activeInput === 'name' ? '' : 'Enter your Full Name'}
            value={name}
            onChangeText={(value) => setName(sanitizeNameInput(value))}
            onFocus={() => setActiveInput('name')}
            onBlur={() => setActiveInput(null)}
            style={[
              styles.input,
              activeInput === 'name' && styles.inputActive
            ]}
            placeholderTextColor={colors.textMuted}
          />

          {/* Name of Organization */}
          <Text style={styles.label}>Name of Organization <Text style={{ color: colors.danger }}>*</Text></Text>
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
            placeholderTextColor={colors.textMuted}
          />

          {/* Company Photos */}
          <Text style={styles.label}>Company Photos <Text style={{ color: colors.danger }}>*</Text></Text>
          <FileUploadBox
            value={selectCompanyPhotos}
            onChange={setSelectCompanyPhotos}
          />

          {/* Area Dropdown */}
          <Text style={styles.label}>Area <Text style={{ color: colors.danger }}>*</Text></Text>
          <Dropdown
            options={city}
            placeholder="Select your Area"
            placeholderColor={colors.textMuted}
            onSelectOption={setSelectedArea}
            value={selectedArea}
            onOpen={() => setActiveInput('area')}
            onClose={() => setActiveInput(null)}
          />

          {/* Number of Employees */}
          <Text style={styles.label}>Number of Employees <Text style={{ color: colors.danger }}>*</Text></Text>
          <TextInput
            placeholder={activeInput === 'employees' ? '' : 'Enter the number of Employees'}
            placeholderTextColor={colors.textMuted}
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
          <Text style={styles.label}>Business Type <Text style={{ color: colors.danger }}>*</Text></Text>
          <Dropdown
            options={businessType}
            placeholder="Select your Business Type"
            placeholderColor={colors.textMuted}
            onSelectOption={setSelectedBusinessType}
            value={selectedBusinessType}
            onOpen={() => setActiveInput('businessType')}
            onClose={() => setActiveInput(null)}
          />

          {/* Services Offered Dropdown Add (MultiSelect) */}
          <Text style={styles.label}>Services Offered <Text style={{ color: colors.danger }}>*</Text></Text>
          <DropdownAdd
            options={services}
            placeholder="Select the Services you offer"
            placeholderColor={colors.textMuted}
            onSelectOption={setSelectedServicesOffered}
            value={selectedServicesOffered}
            onOpen={() => setActiveInput('servicesOffered')}
            onClose={() => setActiveInput(null)}
          />

          {/* Partnership Interest Dropdown */}
          <Text style={styles.label}>Partnership Interest <Text style={{ color: colors.danger }}>*</Text></Text>
          <Dropdown
            options={partnershipInterest}
            placeholder="Select Partnership Interest"
            placeholderColor={colors.textMuted}
            onSelectOption={setSelectedPartnership}
            value={selectedPartnership}
            onOpen={() => setActiveInput('partnership')}
            onClose={() => setActiveInput(null)}
          />

          {/* Company Registration Certificates */}
          <Text style={styles.label}>Company Registration Certificates <Text style={{ color: colors.danger }}>*</Text></Text>
          <FileUploadBox
            value={selectCRCphotos}
            onChange={setSelectCRCphotos}
          />

          {/* How did you hear about us Dropdown */}
          <Text style={styles.label}>How did you hear about us? <Text style={{ color: colors.danger }}>*</Text></Text>
          <Dropdown
            options={howduhear}
            placeholder="How did you hear about us?"
            placeholderColor={colors.textMuted}
            onSelectOption={setSelectedHowHeard}
            value={selectedHowHeard}
            onOpen={() => setActiveInput('howHeard')}
            onClose={() => setActiveInput(null)}
          />

          {/* Message TextArea */}
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
  subTitle: {
    fontSize: width * 0.034,
    fontWeight: '400',
    color: colors.textSecondary,
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