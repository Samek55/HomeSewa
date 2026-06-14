import { useRef, useState } from 'react';
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
import { area, positionAppliedFor, services } from '../../src/data/Data';
import TextArea from '../../components/bookings/TextArea';
import SubmitOverlay from '../../components/bookings/SubmitOverlay';
import countryLogo from '../../assets/header/right.png';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import FileUploadBox from '../../components/bookings/FileUploadBox';
import ClearFormIcon from '../../assets/icons/booking/clear.png'
import DropdownAdd from '../../components/bookings/DropdownAdd';
import { createCareer } from '@/api/PostApiCareer';
import Header3 from '@/components/Header3drawer';
import { uploadMultipleToCloudinary } from '@/api/uploadToCloudinary';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [experience, setExperience] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [coverMessage, setCoverMessage] = useState('');

  type FileItem = {
    uri: string;
    fileName?: string;
  };

  // photos
  const [selectedCV, setSelectedCV] = useState<FileItem[]>([]);
  const [selectedID, setSelectedID] = useState<FileItem[]>([]);

  // dropdown states
  const [selectedPosition, setSelectedPosition] = useState<string[]>([]);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<string[]>([]);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<'loading' | 'success'>('loading');

  // Shared active focus state system mapping layout changes
  const [activeInput, setActiveInput] = useState<string | null>(null);

  const clearAllFields = () => {
    setName('');
    setNumber('');
    setEmail('');
    setMessage('');
    setExperience('');
    setPolicyNumber('');
    setEmergencyNumber('');
    setCoverMessage('');
    setSelectedCV([]);
    setSelectedID([]);
    setSelectedPosition([]);
    setSelectedExpertise([]);
    setSelectedArea([]);
    setActiveInput(null);
  };

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
    const cleanEmergencyNumber = emergencyNumber.replace(/\s/g, '');

    if (!name.trim()) {
      return Alert.alert('Validation Error', 'Full Name is required');
    }

    if (!cleanNumber || cleanNumber.length !== 10) {
      return Alert.alert('Validation Error', 'Enter a valid 10-digit phone number');
    }

    if (!email.trim()) {
      return Alert.alert('Validation Error', 'Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return Alert.alert('Validation Error', 'Enter a valid email address');
    }

    if (!selectedPosition || selectedPosition.length === 0) {
      return Alert.alert('Validation Error', 'Please select at least one position');
    }

    if (!selectedExpertise || selectedExpertise.length === 0) {
      return Alert.alert('Validation Error', 'Please select at least one expertise');
    }

    if (!experience.trim()) {
      return Alert.alert('Validation Error', 'Experience is required');
    }

    if (!selectedID || selectedID.length === 0) {
      return Alert.alert('Validation Error', 'Please upload your ID');
    }

    if (!selectedArea || selectedArea.length === 0) {
      return Alert.alert('Validation Error', 'Please select area');
    }

    if (!policyNumber.trim()) {
      return Alert.alert('Validation Error', 'Policy number is required');
    }

    if (!cleanEmergencyNumber || cleanEmergencyNumber.length !== 10) {
      return Alert.alert('Validation Error', 'Enter a valid emergency contact number');
    }

    if (!selectedCV || selectedCV.length === 0) {
      return Alert.alert('Validation Error', 'Please upload your CV');
    }

    if (!coverMessage.trim()) {
      return Alert.alert('Validation Error', 'Cover message is required');
    }

    if (!message.trim()) {
      return Alert.alert('Validation Error', 'Message is required');
    }

    setOverlayStatus('loading');
    setOverlayVisible(true);

    try {
      const [idProofImages, cvImages] = await Promise.all([
        uploadMultipleToCloudinary(
          selectedID.map(item => ({
            uri: item.uri,
            fileName: item.fileName,
          }))
        ),
        uploadMultipleToCloudinary(
          selectedCV.map(item => ({
            uri: item.uri,
            fileName: item.fileName,
          }))
        ),
      ]);

      const career = {
        "Full Name": name,
        "Phone": number,
        "Email": email,
        "Position Applied For": selectedPosition,
        "Area of Expertise": selectedExpertise,
        "Years of Experience": experience,
        "Preferred Working Area": selectedArea,
        "Insurance Policy Number": policyNumber,
        "Emergency Contact Number": emergencyNumber,
        "Cover Letter": coverMessage,
        "Message": message,
        "Resume/CV": cvImages.map(url => ({ url })),
        "ID Proof": idProofImages.map(url => ({ url })),
      };

      await createCareer(career);
      setOverlayStatus('success');

    } catch (error) {
      console.log(error);
      setOverlayVisible(false);
      Alert.alert('Error', 'Submission failed. Please try again.');
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
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        enableResetScrollToCoords={false}
        resetScrollToCoords={undefined}
        enableAutomaticScroll={Platform.OS === 'ios'}
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.formContainer, { marginBottom: hp('5%') }]}>
          <Text style={styles.title}>RocketSingh - Join Now</Text>

          <View style={styles.spacerGap} />

          {/* Full Name */}
          <Text style={styles.label}>Full Name<Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            placeholder="Enter your Full Name"
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
          <Text style={styles.label}>Phone Number<Text style={{ color: 'red' }}>*</Text></Text>
          <View style={styles.phoneContainer}>
            <Image
              source={countryLogo}
              style={styles.icon}
              resizeMode="contain"
            />
            <TextInput
              placeholder="Enter your Phone Number"
              value={number}
              onFocus={() => setActiveInput('phone')}
              onBlur={() => setActiveInput(null)}
              onChangeText={(value) => {
                let cleaned = value.replace(/[^0-9]/g, '');
                cleaned = cleaned.slice(0, 10);
                let formatted = cleaned;

                if (cleaned.length > 3 && cleaned.length <= 6) {
                  formatted = cleaned.slice(0, 3) + ' ' + cleaned.slice(3);
                } else if (cleaned.length > 6) {
                  formatted =
                    cleaned.slice(0, 3) +
                    ' ' +
                    cleaned.slice(3, 6) +
                    ' ' +
                    cleaned.slice(6);
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
          <Text style={styles.label}>Email<Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            placeholder="Enter your email address"
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

          {/* Position Applied For */}
          <Text style={styles.label}>Position Applied For<Text style={{ color: 'red' }}>*</Text></Text>
          <DropdownAdd
            options={positionAppliedFor}
            placeholder="Select the position you are applying for"
            placeholderColor="#4B4B4B"
            value={selectedPosition}
            onSelectOption={setSelectedPosition}
            onOpen={() => setActiveInput('position')}
            onClose={() => setActiveInput(null)}
          />

          {/* Area of Expertise */}
          <Text style={styles.label}>Area of Expertise<Text style={{ color: 'red' }}>*</Text></Text>
          <DropdownAdd
            options={services}
            placeholder="Select the area of expertise (max 5)"
            placeholderColor="#4B4B4B"
            value={selectedExpertise}
            onSelectOption={setSelectedExpertise}
            onOpen={() => setActiveInput('expertise')}
            onClose={() => setActiveInput(null)}
            maxSelections={5}
          />

          {/* Years of Experience */}
          <Text style={styles.label}>Years of Experience<Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            placeholder="Enter your years of experience in the field"
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
          <Text style={styles.label}>ID Proof<Text style={{ color: 'red' }}>*</Text></Text>
          <FileUploadBox
            value={selectedID}
            onChange={setSelectedID}
          />

          {/* Preferred Working Area */}
          <Text style={styles.label}>Preferred Working Area<Text style={{ color: 'red' }}>*</Text></Text>
          <DropdownAdd
            options={area}
            placeholder="Select your preferred working area (max 5)"
            placeholderColor="#4B4B4B"
            value={selectedArea}
            onSelectOption={setSelectedArea}
            onOpen={() => setActiveInput('workingArea')}
            onClose={() => setActiveInput(null)}
            maxSelections={5}
          />

          {/* Insurance Policy Number */}
          <Text style={styles.label}>Insurance Policy Number<Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            placeholder="Enter the insurance policy number"
            value={policyNumber}
            onFocus={() => setActiveInput('policy')}
            onBlur={() => setActiveInput(null)}
            onChangeText={(text) => {
              const onlyNumbers = text.replace(/[^0-9]/g, '');
              setPolicyNumber(onlyNumbers);
            }}
            style={[
              styles.input,
              activeInput === 'policy' && styles.inputActive
            ]}
            placeholderTextColor={'#4B4B4B'}
            keyboardType="numeric"
          />

          {/* Emergency Contact Number */}
          <Text style={styles.label}>Emergency Contact Number<Text style={{ color: 'red' }}>*</Text></Text>
          <View style={styles.phoneContainer}>
            <Image
              source={countryLogo}
              style={styles.icon}
              resizeMode="contain"
            />
            <TextInput
              placeholder="Enter your emergency contact number"
              value={emergencyNumber}
              onFocus={() => setActiveInput('emergencyPhone')}
              onBlur={() => setActiveInput(null)}
              onChangeText={(value) => {
                let cleaned = value.replace(/[^0-9]/g, '');
                cleaned = cleaned.slice(0, 10);
                let formatted = cleaned;

                if (cleaned.length > 3 && cleaned.length <= 6) {
                  formatted = cleaned.slice(0, 3) + ' ' + cleaned.slice(3);
                } else if (cleaned.length > 6) {
                  formatted =
                    cleaned.slice(0, 3) +
                    ' ' +
                    cleaned.slice(3, 6) +
                    ' ' +
                    cleaned.slice(6);
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

          {/* CV/Resume */}
          <Text style={styles.label}>CV/Resume<Text style={{ color: 'red' }}>*</Text></Text>
          <FileUploadBox
            value={selectedCV}
            onChange={setSelectedCV}
          />

          {/* Cover Letter */}
          <Text style={styles.label}>Cover Letter<Text style={{ color: 'red' }}>*</Text></Text>
          <TextArea
            value={coverMessage}
            onChangeText={setCoverMessage}
            placeholder=""
            placeholderTextColor="#4B4B4B"
            maxHeight={160}
            onFocus={() => setActiveInput('coverLetter')}
            onBlur={() => setActiveInput(null)}
            style={activeInput === 'coverLetter' && styles.inputActive}
          />

          {/* Message */}
          <Text style={styles.label}>Message<Text style={{ color: 'red' }}>*</Text></Text>
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
    color: '#1A1A1A',
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
    borderColor: 'hsl(142, 71%, 45%)',      // Dynamic premium highlight glow color
    backgroundColor: '#F4F7FF',  // Soft backdrop selection tint color
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
    backgroundColor: '#000',
  },
  buttonClear: {
    color: '#0a7de1',
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
