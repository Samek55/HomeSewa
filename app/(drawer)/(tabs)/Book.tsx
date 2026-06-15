import React, { useRef, useState, useMemo, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Image,
  Pressable,
  ActivityIndicator,
  findNodeHandle,
} from 'react-native';
import Dropdown from '../../../components/bookings/Dropdown';
import { Ionicons } from '@expo/vector-icons';
import { areasByCity, city, services, shifts, budget, priority } from '../../../src/data/Data';
import DateTimePicker from '@react-native-community/datetimepicker';
import CalenderIcon from '../../../assets/icons/booking/calendar.png';
import TextArea from '../../../components/bookings/TextArea';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import countryLogo from '../../../assets/images/NEW-Flag_of_Nepal.png';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Header2 from '@/components/Header2';
import ClearFormIcon from '../../../assets/icons/booking/clear.png'

const { width, height } = Dimensions.get('window');

const Button = ({ children, style, textStyle, onPress, disabled }: any) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={disabled}>
      <LinearGradient
        colors={disabled ? ['#9ca3af', '#6b7280', '#4b5563'] : ['#295C59', '#3D7A76', '#295C59']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button1, style]}
      >
        <Text style={[styles.text, textStyle]}>
          {children}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function ServiceBookingScreen() {
  const scrollRef = useRef<any>(null);
  const serviceFieldRef = useRef<View>(null);
  const shiftFieldRef = useRef<View>(null);
  const cityFieldRef = useRef<View>(null);
  const areaFieldRef = useRef<View>(null);
  const priorityFieldRef = useRef<View>(null);
  const budgetFieldRef = useRef<View>(null);

  const scrollToField = (fieldRef: React.RefObject<View>) => {
    if (!fieldRef.current || !scrollRef.current) return;
    const node = findNodeHandle(scrollRef.current);
    if (!node) return;
    (fieldRef.current as any).measureLayout(
      node,
      (_x: number, y: number) => {
        scrollRef.current?.scrollToPosition(0, Math.max(0, y - 80), true);
      },
      () => {}
    );
  };
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [areaQuery, setAreaQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [show, setShow] = useState<boolean>(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const pickPhotos = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, 5));
    }
  }, [photos.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const filteredAreas = useMemo(() => {
    if (!selectedCity || !areasByCity[selectedCity]) return [];
    const q = areaQuery.toLowerCase().trim();
    const all = areasByCity[selectedCity];
    return q ? all.filter(a => a.toLowerCase().includes(q)) : all;
  }, [selectedCity, areaQuery]);

  const handleCitySelect = (c: string) => {
    setSelectedCity(c);
    setSelectedArea('');
    setAreaQuery('');
    setShowSuggestions(false);
  };

  const handleAreaSelect = (a: string) => {
    setSelectedArea(a);
    setAreaQuery(a);
    setShowSuggestions(false);
  };

  const clearAllFields = () => {
    setName('');
    setNumber('');
    setSelectedService('');
    setSelectedShift('');
    setDate(null);
    setSelectedCity('');
    setSelectedArea('');
    setAreaQuery('');
    setShowSuggestions(false);
    setSelectedPriority('');
    setSelectedBudget('');
    setMessage('');
    setActiveInput(null);
  };

  const handleClearForm = () => {
    Alert.alert(
      'Clear Form',
      'Are you sure you want to clear all fields?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Clear', style: 'destructive', onPress: clearAllFields },
      ]
    );
  };

  // 🛠️ Function to check daily limit from Airtable
  const BASE_URL = process.env.EXPO_PUBLIC_AIRTABLE_API_URL_BOOKING;
  const TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN;

  /**
   * Checks if a specific phone number has reached the maximum allowance 
   * of 5 bookings for today's date.
   */
  /**
   * Checks if a specific phone number has reached the maximum allowance 
   * of 5 bookings for today's current calendar date.
   */
  const checkDailyBookingLimit = async (phoneNumber: string): Promise<boolean> => {
    try {
      if (!BASE_URL || !TOKEN) {
        console.warn("Airtable environment configuration is missing.");
        return false;
      }

      // 1. Get today's local date (ignoring UTC timezone offsets)
      const localDate = new Date();
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0'); // Ensures 2 digits e.g. "06"
      const day = String(localDate.getDate()).padStart(2, '0');        // Ensures 2 digits e.g. "13"

      // Generates standard "2026-06-13" string structure accepted universally by dates
      const todayStr = `${year}-${month}-${day}`;

      // 2. Build the Airtable Formula 
      // This looks at your exact {Phone} string and extracts the date part of {Service Booking Date & Time *} 
      // to compare it to today's date stamp.
      const formula = `AND({Phone} = '${phoneNumber}', DATETIME_FORMAT({Service Booking Date & Time *}, 'YYYY-MM-DD') = '${todayStr}')`;

      // 3. Append the formula as a URL query parameter
      const requestUrl = `${BASE_URL}?filterByFormula=${encodeURIComponent(formula)}`;

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("Airtable Rate Limit Check Error:", data);
        return false; // Fail open to keep app usable if network drops
      }

      // If Airtable returns 5 or more rows for today, block them!
      return data.records.length >= 5;

    } catch (error) {
      console.log("Rate Limit Check Fetch Error:", error);
      return false;
    }
  };

  const handleSubmit = async () => {
    const cleanNumber = number.replace(/\s/g, '');

    // Standard Form Field Validations
    if (!name.trim()) { return Alert.alert('Validation Error', 'Full Name is required'); }
    if (!cleanNumber || cleanNumber.length !== 10) { return Alert.alert('Validation Error', 'Enter a valid 10-digit phone number'); }
    if (!selectedService) { return Alert.alert('Validation Error', 'Please select a service'); }
    if (!date) { return Alert.alert('Validation Error', 'Please select a date'); }
    if (!selectedShift) { return Alert.alert('Validation Error', 'Please choose a time shift'); }
    if (!selectedCity) { return Alert.alert('Validation Error', 'Please select your city'); }
    if (!selectedArea.trim()) { return Alert.alert('Validation Error', 'Please enter your area'); }
    if (!selectedBudget.trim()) { return Alert.alert('Validation Error', 'Budget cannot be empty'); }
    if (!selectedPriority.trim()) { return Alert.alert('Validation Error', 'Please choose a Priority'); }
    if (!message.trim()) { return Alert.alert('Validation Error', 'Message cannot be empty'); }

    setIsSubmitting(true);

    // 🚀 Airtable Rate Limit Check Execution
    const isLimitReached = await checkDailyBookingLimit(cleanNumber);

    if (isLimitReached) {
      setIsSubmitting(false);
      Alert.alert(
        'Limit Reached',
        'This phone number has reached the maximum allowance of 5 bookings for today. Please try again tomorrow.'
      );
      return;
    }

    try {
      router.push({
        pathname: '/booking/BookingDetail',
        params: {
          name: name.trim(),
          number: cleanNumber,
          selectedService,
          selectedShift,
          selectedArea: selectedArea + ', ' + selectedCity,
          selectedPriority,
          selectedBudget,
          message: message.trim(),
          date: date.toISOString(),
        },
      });
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#295C59' }}>
      <Header2 />
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        enableResetScrollToCoords={false}
        resetScrollToCoords={undefined}
        enableAutomaticScroll
        keyboardDismissMode="on-drag"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Book a Service</Text>

          <View style={styles.inputGroup}>
            {/* Full Name */}
            <Text style={styles.label}>Full Name<Text style={{ color: 'red' }}>*</Text></Text>
            <TextInput
              placeholder="Enter your Full Name"
              value={name}
              onChangeText={setName}
              onFocus={() => setActiveInput('name')}
              onBlur={() => setActiveInput(null)}
              style={[styles.input, activeInput === 'name' && styles.inputActive]}
              placeholderTextColor={'#4B4B4B'}
            />

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number<Text style={{ color: 'red' }}>*</Text></Text>
            <View style={styles.phoneContainer}>
              <Image source={countryLogo} style={styles.icon} resizeMode="contain" />
              <TextInput
                placeholder="98520 24 365"
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
                style={[styles.phoneInput, activeInput === 'phone' && styles.inputActive]}
                placeholderTextColor={'#4B4B4B'}
              />
            </View>

            {/* Select Service */}
            <Text style={styles.label}>Select Service<Text style={{ color: 'red' }}>*</Text></Text>
            <View ref={serviceFieldRef}>
              <Dropdown
                value={selectedService}
                options={services}
                placeholder="Select Services"
                placeholderColor="#4B4B4B"
                onSelectOption={setSelectedService}
                onOpen={() => { setActiveInput('service'); scrollToField(serviceFieldRef); }}
                onClose={() => setActiveInput(null)}
              />
            </View>

            {/* Choose Date */}
            <Text style={styles.label}>Choose Date<Text style={{ color: 'red' }}>*</Text></Text>
            <View style={{ marginBottom: height * 0.025 }}>
              <TouchableOpacity
                onPress={() => {
                  setShow(true);
                  setActiveInput('date');
                }}
                style={[styles.datePicker, activeInput === 'date' && styles.inputActive]}
              >
                <Text style={[styles.datePickerText, { color: date ? '#1A1A1A' : '#4B4B4B' }]}>
                  {date ? `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}` : 'Pick a Date (DD/MM/YYYY)'}
                </Text>
                <Image
                  source={CalenderIcon}
                  style={[styles.calendarIcon, activeInput === 'date' && { tintColor: '#295C59' }]}
                />
              </TouchableOpacity>

              {show && (
                <View>
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShow(Platform.OS === 'ios');
                      if (Platform.OS === 'android') { setActiveInput(null); }
                      if (event.type === 'set' && selectedDate) { setDate(selectedDate); }
                    }}
                  />
                </View>
              )}
            </View>

            {/* Preferred Time */}
            <Text style={styles.label}>Preferred Time<Text style={{ color: 'red' }}>*</Text></Text>
            <View ref={shiftFieldRef}>
              <Dropdown
                options={shifts}
                placeholder="Choose a Shift"
                placeholderColor="#4B4B4B"
                onSelectOption={setSelectedShift}
                dropdownType="shift"
                onOpen={() => { setActiveInput('shift'); scrollToField(shiftFieldRef); }}
                onClose={() => setActiveInput(null)}
                value={selectedShift}
              />
            </View>

            {/* City */}
            <Text style={styles.label}>City<Text style={{ color: 'red' }}>*</Text></Text>
            <View ref={cityFieldRef}>
              <Dropdown
                options={city}
                placeholder="Select your city"
                placeholderColor="#4B4B4B"
                onSelectOption={handleCitySelect}
                onOpen={() => { setActiveInput('city'); scrollToField(cityFieldRef); }}
                onClose={() => setActiveInput(null)}
                value={selectedCity}
              />
            </View>

            {/* Area with typing suggestions */}
            <Text style={styles.label}>Area<Text style={{ color: 'red' }}>*</Text></Text>
            <View ref={areaFieldRef} style={[styles.areaWrapper, { zIndex: showSuggestions ? 999 : 1 }]}>
              <TextInput
                value={areaQuery}
                onChangeText={(text) => {
                  setAreaQuery(text);
                  setSelectedArea(text);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setActiveInput('area');
                  if (selectedCity) setShowSuggestions(true);
                  scrollToField(areaFieldRef);
                }}
                onBlur={() => setTimeout(() => {
                  setShowSuggestions(false);
                  setActiveInput(null);
                }, 200)}
                placeholder={selectedCity ? 'Type your area...' : 'Select a city first'}
                placeholderTextColor="#4B4B4B"
                editable={!!selectedCity}
                style={[
                  styles.input,
                  { marginBottom: 0 },
                  activeInput === 'area' && styles.inputActive,
                  !selectedCity && { backgroundColor: '#f5f5f5' },
                ]}
              />

              {showSuggestions && filteredAreas.length > 0 && (
                <View style={styles.suggestionBox}>
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                    bounces={false}
                  >
                    {filteredAreas.map((s, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.suggestionItem,
                          i < filteredAreas.length - 1 && styles.suggestionDivider,
                        ]}
                        onPress={() => {
                          handleAreaSelect(s);
                          setActiveInput(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={{ height: height * 0.02 }} />

            {/* Priority */}
            <Text style={styles.label}>Priority<Text style={{ color: 'red' }}>*</Text></Text>
            <View ref={priorityFieldRef}>
              <Dropdown
                options={priority}
                placeholder="Select Priority"
                placeholderColor="#4B4B4B"
                onSelectOption={setSelectedPriority}
                value={selectedPriority}
                onOpen={() => { setActiveInput('priority'); scrollToField(priorityFieldRef); }}
                onClose={() => setActiveInput(null)}
              />
            </View>

            {/* Select Budget */}
            <Text style={styles.label}>Select Budget<Text style={{ color: 'red' }}>*</Text></Text>
            <View ref={budgetFieldRef}>
              <Dropdown
                value={selectedBudget}
                options={budget}
                placeholder="Select Budget"
                placeholderColor="#4B4B4B"
                onSelectOption={setSelectedBudget}
                onOpen={() => { setActiveInput('budget'); scrollToField(budgetFieldRef); }}
                onClose={() => setActiveInput(null)}
              />
            </View>

            {/* Photos */}
            <Text style={styles.label}>Photos <Text style={{ color: '#888', fontWeight: '400' }}>(up to 5)</Text></Text>
            <TouchableOpacity
              style={styles.photoDropZone}
              onPress={photos.length < 5 ? pickPhotos : undefined}
              activeOpacity={0.75}
            >
              {photos.length === 0 ? (
                <>
                  <Ionicons name="arrow-down-circle-outline" size={32} color="#295C59" />
                  <Text style={styles.photoDropText}>Drop files/photos here</Text>
                </>
              ) : (
                <View style={styles.photoSection}>
                  {photos.map((uri, i) => (
                    <View key={i} style={styles.photoThumb}>
                      <Image source={{ uri }} style={styles.photoImg} />
                      <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                        <Text style={styles.photoRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < 5 && (
                    <TouchableOpacity style={styles.photoAdd} onPress={pickPhotos} activeOpacity={0.8}>
                      <Text style={styles.photoAddIcon}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>

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
              style={activeInput === 'message' ? styles.inputActive : undefined}
            />

            {/* Bottom Actions: Clear left | Submit right */}
            <View style={styles.bottomRow}>
              <Pressable style={styles.buttonClearFlex} onPress={handleClearForm}>
                <Image source={ClearFormIcon} style={styles.clearIcon} />
                <Text style={styles.buttonClear}>Clear form</Text>
              </Pressable>

              <Button
                style={styles.button1}
                textStyle={{ color: 'white', textAlign: 'center' }}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : 'SUBMIT'}
              </Button>
            </View>

          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

// ... styles remain unchanged ...
const styles = StyleSheet.create({
  container: { backgroundColor: '#295C59', flexGrow: 1 },
  formContainer: { paddingHorizontal: width * 0.05, paddingTop: height * 0.02, backgroundColor: '#295C59' },
  title: { fontSize: width * 0.06, fontWeight: '700', color: 'white', paddingLeft: 8, marginBottom: 10 },
  inputGroup: { marginTop: height * 0.015, padding: 20, borderRadius: 20, backgroundColor: '#fff', elevation: 10, marginBottom: height * 0.05 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: width * 0.035, height: height * 0.055, marginBottom: height * 0.02, fontSize: width * 0.035, fontWeight: '500', borderColor: '#E2E8F0', color: '#1A1A1A', backgroundColor: '#fff' },
  inputActive: { borderColor: '#295C59', backgroundColor: '#EFF8F7' },
  phoneContainer: { position: 'relative', justifyContent: 'center', marginBottom: height * 0.02 },
  icon: { width: wp('7%'), height: hp('3%'), position: 'absolute', left: 10, zIndex: 2 },
  phoneInput: { borderWidth: 1.5, borderRadius: 12, borderColor: '#E2E8F0', height: height * 0.055, paddingLeft: wp('12%'), paddingRight: 10, fontSize: width * 0.035, fontWeight: '500', color: '#1A1A1A', backgroundColor: '#fff' },
  datePicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: width * 0.035, height: height * 0.055, justifyContent: 'space-between', backgroundColor: '#fff' },
  datePickerText: { fontSize: width * 0.035, fontWeight: '500', color: '#4a4a4a' },
  label: { marginBottom: hp('0.6%'), paddingLeft: wp('1%'), fontSize: wp('3.5%'), fontWeight: '600', color: '#4A4A4A' },
  calendarIcon: { height: hp('2.5%'), width: hp('2.5%'), resizeMode: 'contain' },
  buttonPadding: { paddingBottom: 10, alignItems: 'center' },
  button1: { width: width * 0.4, height: height * 0.06, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  photoDropZone: { borderWidth: 1.5, borderRadius: 12, borderColor: '#295C59', borderStyle: 'dashed', backgroundColor: '#fff', paddingVertical: 22, paddingHorizontal: 12, marginBottom: height * 0.02, alignItems: 'center', justifyContent: 'center' },
  photoDropText: { fontSize: wp('3.5%'), color: '#295C59', fontWeight: '500', marginTop: 8 },
  photoSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start', width: '100%' },
  photoThumb: { width: width * 0.17, height: width * 0.17, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoRemove: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoAdd: { width: width * 0.17, height: width * 0.17, borderRadius: 10, borderWidth: 1.5, borderColor: '#295C59', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#EFF8F7' },
  photoAddIcon: { fontSize: 24, color: '#295C59', lineHeight: 28, textAlign: 'center' },
  photoAddLabel: { fontSize: wp('2.4%'), color: '#295C59', fontWeight: '600' },
  text: { color: '#fff', fontSize: width * 0.04, fontWeight: '600' },
  buttonClearFlex: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  buttonClear: { color: '#0a7de1', fontSize: width * 0.038, fontWeight: '500' },
  clearIcon: { width: wp('6%'), height: hp('2.5%'), resizeMode: 'contain', marginRight: 2 },
  areaWrapper: { position: 'relative', marginBottom: 0 },
  suggestionBox: {
    position: 'absolute',
    top: height * 0.058,
    left: 0,
    right: 0,
    maxHeight: height * 0.35,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#295C59',
    elevation: 20,
    shadowColor: '#295C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 999,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.016,
  },
  suggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F7F6',
  },
  suggestionText: {
    fontSize: width * 0.035,
    fontWeight: '500',
    color: '#1C2B2A',
  },
});