import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ThemeColors } from '@/theme/colors';
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
  Keyboard,
} from 'react-native';
import Dropdown from '../../../components/bookings/Dropdown';
import { Ionicons } from '@expo/vector-icons';
import { areasByCity, city, services, shifts, budget, priority } from '../../../src/data/Data';
import DateTimePicker from '@react-native-community/datetimepicker';
import CalenderIcon from '../../../assets/icons/booking/calendar.png';
import TextArea from '../../../components/bookings/TextArea';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import countryLogo from '../../../assets/images/NEW-Flag_of_Nepal.png';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Header2 from '@/components/Header2';
import ClearFormIcon from '../../../assets/icons/booking/clear.png';
import { uploadMultipleToStorage } from '../../../api/uploadToStorage';
import { supabase } from '../../../lib/supabase';
import TermsCheckbox from '../../../components/bookings/TermsCheckbox';
import { logEvent } from '../../../lib/analytics';

const { width, height } = Dimensions.get('window');

const staticStyles = StyleSheet.create({
  button1: { width: width * 0.4, height: height * 0.06, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  text: { color: '#fff', fontSize: width * 0.04, fontWeight: '600' },
});

const Button = ({ children, style, textStyle, onPress, disabled }: any) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={disabled}>
      <LinearGradient
        colors={disabled ? ['#9ca3af', '#6b7280', '#4b5563'] : ['#295C59', '#3D7A76', '#295C59']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[staticStyles.button1, style]}
      >
        <Text style={[staticStyles.text, textStyle]}>
          {children}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function ServiceBookingScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const inputGroupY = useRef<number>(0);
  const fieldYPositions = useRef<Partial<Record<string, number>>>({});

  const scrollToField = (key: string) => {
    if (!scrollRef.current) return;
    const y = inputGroupY.current + (fieldYPositions.current[key] ?? 0);
    scrollRef.current.scrollTo({ y: Math.max(0, y - 80), animated: true });
  };
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const { preSelectedService } = useLocalSearchParams<{ preSelectedService?: string }>();
  const [selectedService, setSelectedService] = useState(preSelectedService ?? '');

  useEffect(() => {
    if (preSelectedService) setSelectedService(preSelectedService);
  }, [preSelectedService]);
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
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEnd, setShowEnd] = useState<boolean>(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const pickPhotos = useCallback(async () => {
    // No manual permission gate here — launchImageLibraryAsync opens the OS's
    // native Photo Picker (Android) / PHPickerViewController (iOS), neither of
    // which needs app-level media permission at all. Gating it behind
    // requestMediaLibraryPermissionsAsync() (which also asks for write access
    // that this read-only picker never needs) was causing "Permission needed"
    // even when the user had already allowed photo access.
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
    Keyboard.dismiss();
  };

  const clearAllFields = () => {
    setName('');
    setNumber('');
    setSelectedService('');
    setSelectedShift('');
    setDate(null);
    setEndDate(null);
    setSelectedCity('');
    setSelectedArea('');
    setAreaQuery('');
    setShowSuggestions(false);
    setSelectedPriority('');
    setSelectedBudget('');
    setMessage('');
    setActiveInput(null);
    setAcceptedTerms(false);
  };

  const handleClearForm = () => {
    Alert.alert(
      t('book.clearFormTitle'),
      t('book.clearFormMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('book.yesClear'), style: 'destructive', onPress: () => { clearAllFields(); logEvent('booking_form_cleared'); } },
      ]
    );
  };

  const checkDailyBookingLimit = async (phoneNumber: string): Promise<boolean> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // head:true never returns row data anyway (just the count), so there's
      // no reason to ask for every column — narrows what this query touches.
      const { count } = await supabase
        .from('booking')
        .select('booking_id', { count: 'exact', head: true })
        .eq('phone', phoneNumber)
        .gte('service_booking_datetime', `${today}T00:00:00`)
        .lte('service_booking_datetime', `${today}T23:59:59`);
      return (count ?? 0) >= 5;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    const cleanNumber = number.replace(/\s/g, '');

    // Standard Form Field Validations
    if (!name.trim()) { return Alert.alert(t('book.validationErrorTitle'), t('book.errFullNameRequired')); }
    if (!cleanNumber || cleanNumber.length !== 10) { return Alert.alert(t('book.validationErrorTitle'), t('book.errPhoneInvalid')); }
    if (!selectedService) { return Alert.alert(t('book.validationErrorTitle'), t('book.errSelectService')); }
    if (!date) { return Alert.alert(t('book.validationErrorTitle'), t('book.errSelectStartDate')); }
    if (!endDate) { return Alert.alert(t('book.validationErrorTitle'), t('book.errSelectEndDate')); }
    if (!selectedShift) { return Alert.alert(t('book.validationErrorTitle'), t('book.errChooseShift')); }
    if (!selectedCity) { return Alert.alert(t('book.validationErrorTitle'), t('book.errSelectCity')); }
    if (!selectedArea.trim()) { return Alert.alert(t('book.validationErrorTitle'), t('book.errEnterArea')); }
    if (!selectedBudget.trim()) { return Alert.alert(t('book.validationErrorTitle'), t('book.errBudgetEmpty')); }
    if (!selectedPriority.trim()) { return Alert.alert(t('book.validationErrorTitle'), t('book.errChoosePriority')); }
    if (!acceptedTerms) { return Alert.alert(t('book.validationErrorTitle'), t('book.errAcceptTerms')); }


    setIsSubmitting(true);

    // 🚀 Daily Booking Limit Check Execution
    const isLimitReached = await checkDailyBookingLimit(cleanNumber);

    if (isLimitReached) {
      setIsSubmitting(false);
      logEvent('booking_limit_reached');
      Alert.alert(
        t('book.limitReachedTitle'),
        t('book.limitReachedMessage')
      );
      return;
    }

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadMultipleToStorage(
          photos.map(uri => ({ uri, fileName: uri.split('/').pop() || 'photo.jpg' }))
        );
      }

      logEvent('booking_submitted', {
        service: selectedService,
        city: selectedCity,
        shift: selectedShift,
        priority: selectedPriority,
        budget: selectedBudget,
        photo_count: photoUrls.length,
      });

      router.push({
        pathname: '/booking/BookingDetail',
        params: {
          name: name.trim(),
          number: cleanNumber,
          selectedService,
          selectedShift,
          selectedCity,
          selectedArea,
          selectedPriority,
          selectedBudget,
          message: message.trim(),
          date: date.toISOString(),
          endDate: endDate!.toISOString(),
          photos: JSON.stringify(photoUrls),
        },
      });
    } catch (error) {
      console.log(error);
      Alert.alert(t('common.error'), t('common.somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand }}>
      <Header2 />
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bottomOffset={120}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>{t('book.title')}</Text>

          <View style={styles.inputGroup} onLayout={(e) => { inputGroupY.current = e.nativeEvent.layout.y; }}>
            {/* Full Name */}
            <Text style={styles.label}>{t('book.fullName')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <TextInput
              placeholder={activeInput === 'name' ? '' : t('book.fullNamePlaceholder')}
              value={name}
              onChangeText={setName}
              onFocus={() => setActiveInput('name')}
              onBlur={() => setActiveInput(null)}
              style={[styles.input, activeInput === 'name' && styles.inputActive]}
              placeholderTextColor={colors.textSecondary}
            />

            {/* Phone Number */}
            <Text style={styles.label}>{t('book.phoneNumber')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View style={styles.phoneContainer}>
              <Image source={countryLogo} style={styles.icon} resizeMode="contain" />
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
                style={[styles.phoneInput, activeInput === 'phone' && styles.inputActive]}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Select Service */}
            <Text style={styles.label}>{t('book.selectService')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View onLayout={(e) => { fieldYPositions.current['service'] = e.nativeEvent.layout.y; }}>
              <Dropdown
                value={selectedService}
                options={services}
                placeholder="Garden Care"
                placeholderColor={colors.textSecondary}
                onSelectOption={setSelectedService}
                onOpen={() => { setActiveInput('service'); scrollToField('service'); }}
                onClose={() => setActiveInput(null)}
              />
            </View>

            {/* Choose Date */}
            <Text style={styles.label}>{t('book.chooseDate')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View style={{ marginBottom: height * 0.025 }}>
              <TouchableOpacity
                onPress={() => {
                  setShow(true);
                  setActiveInput('date');
                }}
                style={[styles.datePicker, activeInput === 'date' && styles.inputActive]}
              >
                <Text style={[styles.datePickerText, { color: date ? colors.textPrimary : colors.textSecondary }]}>
                  {date ? `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}` : t('book.pickDatePlaceholder')}
                </Text>
                <Image
                  source={CalenderIcon}
                  style={[styles.calendarIcon, activeInput === 'date' && { tintColor: colors.brand }]}
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

            {/* Service Ending Date */}
            <Text style={styles.label}>{t('book.serviceEndingDate')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View style={{ marginBottom: height * 0.025 }}>
              <TouchableOpacity
                onPress={() => { setShowEnd(true); setActiveInput('endDate'); }}
                style={[styles.datePicker, activeInput === 'endDate' && styles.inputActive]}
              >
                <Text style={[styles.datePickerText, { color: endDate ? colors.textPrimary : colors.textSecondary }]}>
                  {endDate
                    ? `${String(endDate.getDate()).padStart(2,'0')}/${String(endDate.getMonth()+1).padStart(2,'0')}/${endDate.getFullYear()}`
                    : t('book.pickEndingDatePlaceholder')}
                </Text>
                <Image source={CalenderIcon} style={[styles.calendarIcon, activeInput === 'endDate' && { tintColor: colors.brand }]} />
              </TouchableOpacity>
              {showEnd && (
                <DateTimePicker
                  value={endDate || date || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={date || new Date()}
                  onChange={(event, selectedDate) => {
                    setShowEnd(Platform.OS === 'ios');
                    if (Platform.OS === 'android') { setActiveInput(null); }
                    if (event.type === 'set' && selectedDate) { setEndDate(selectedDate); }
                  }}
                />
              )}
            </View>

            {/* Preferred Time */}
            <Text style={styles.label}>{t('book.preferredTime')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View onLayout={(e) => { fieldYPositions.current['shift'] = e.nativeEvent.layout.y; }}>
              <Dropdown
                options={shifts}
                placeholder={t('book.chooseShiftPlaceholder')}
                placeholderColor={colors.textSecondary}
                onSelectOption={setSelectedShift}
                dropdownType="shift"
                onOpen={() => { setActiveInput('shift'); scrollToField('shift'); }}
                onClose={() => setActiveInput(null)}
                value={selectedShift}
              />
            </View>

            {/* City */}
            <Text style={styles.label}>{t('book.city')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View onLayout={(e) => { fieldYPositions.current['city'] = e.nativeEvent.layout.y; }}>
              <Dropdown
                options={city}
                placeholder={t('book.selectCityPlaceholder')}
                placeholderColor={colors.textSecondary}
                onSelectOption={handleCitySelect}
                onOpen={() => { setActiveInput('city'); scrollToField('city'); }}
                onClose={() => setActiveInput(null)}
                value={selectedCity}
              />
            </View>

            {/* Area with typing suggestions */}
            <Text style={styles.label}>{t('book.area')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View onLayout={(e) => { fieldYPositions.current['area'] = e.nativeEvent.layout.y; }} style={[styles.areaWrapper, { zIndex: showSuggestions ? 999 : 1 }]}>
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
                }}
                onBlur={() => {
                  // Explicitly close the keyboard the moment Area loses focus. Without
                  // this, Android can leave the keyboard open with no clear focus target
                  // (keyboardShouldPersistTaps="handled" below means the tap that blurred
                  // us isn't itself treated as "dismiss the keyboard") and auto-refocuses
                  // the next real text input in the tree — the Message field — to keep
                  // the keyboard attached to something.
                  Keyboard.dismiss();
                  setTimeout(() => {
                    setShowSuggestions(false);
                    setActiveInput(null);
                  }, 200);
                }}
                placeholder={activeInput === 'area' ? '' : (selectedCity ? t('book.findAreaPlaceholder') : t('book.selectCityFirstPlaceholder'))}
                placeholderTextColor={colors.textSecondary}
                editable={!!selectedCity}
                style={[
                  styles.input,
                  { marginBottom: 0 },
                  activeInput === 'area' && styles.inputActive,
                  !selectedCity && { backgroundColor: colors.surfaceMuted },
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
            <Text style={styles.label}>{t('book.priority')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View onLayout={(e) => { fieldYPositions.current['priority'] = e.nativeEvent.layout.y; }}>
              <Dropdown
                options={priority}
                placeholder={t('book.selectPriorityPlaceholder')}
                placeholderColor={colors.textSecondary}
                onSelectOption={setSelectedPriority}
                value={selectedPriority}
                onOpen={() => { setActiveInput('priority'); scrollToField('priority'); }}
                onClose={() => setActiveInput(null)}
              />
            </View>

            {/* Select Budget */}
            <Text style={styles.label}>{t('book.selectBudget')} <Text style={{ color: colors.danger }}>*</Text></Text>
            <View onLayout={(e) => { fieldYPositions.current['budget'] = e.nativeEvent.layout.y; }}>
              <Dropdown
                value={selectedBudget}
                options={budget}
                placeholder={t('book.selectBudget')}
                placeholderColor={colors.textSecondary}
                onSelectOption={setSelectedBudget}
                onOpen={() => { setActiveInput('budget'); scrollToField('budget'); }}
                onClose={() => setActiveInput(null)}
              />
            </View>

            {/* Photos */}
            <Text style={styles.label}>{t('book.photos')} <Text style={{ color: colors.textMuted, fontWeight: '400' }}>{t('book.upTo5')}</Text></Text>
            <TouchableOpacity
              style={styles.photoDropZone}
              onPress={photos.length < 5 ? pickPhotos : undefined}
              activeOpacity={0.75}
            >
              {photos.length === 0 ? (
                <>
                  <Ionicons name="arrow-down-circle-outline" size={32} color={colors.brand} />
                  <Text style={styles.photoDropText}>{t('book.dropPhotosPlaceholder')}</Text>
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
            <Text style={styles.label}>{t('book.message')}</Text>
            <View onLayout={(e) => { fieldYPositions.current['message'] = e.nativeEvent.layout.y; }}>
              <TextArea
                value={message}
                onChangeText={setMessage}
                placeholder=""
                placeholderTextColor={colors.textSecondary}
                maxHeight={160}
                onFocus={() => { setActiveInput('message'); scrollToField('message'); }}
                onBlur={() => setActiveInput(null)}
                style={activeInput === 'message' ? styles.inputActive : undefined}
              />
            </View>

            <TermsCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} />

            {/* Bottom Actions: Clear left | Submit right */}
            <View style={styles.bottomRow}>
              <Pressable style={styles.buttonClearFlex} onPress={handleClearForm}>
                <Image source={ClearFormIcon} style={styles.clearIcon} />
                <Text style={styles.buttonClear}>{t('book.clearForm')}</Text>
              </Pressable>

              <Button
                style={staticStyles.button1}
                textStyle={{ color: 'white', textAlign: 'center' }}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : t('book.submit')}
              </Button>
            </View>

          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: colors.brand, flexGrow: 1, paddingBottom: hp('4%') },
  formContainer: { paddingHorizontal: width * 0.05, paddingTop: height * 0.02, backgroundColor: colors.brand },
  title: { fontSize: width * 0.06, fontWeight: '700', color: 'white', paddingLeft: 8, marginBottom: 10 },
  inputGroup: { marginTop: height * 0.015, padding: 20, borderRadius: 20, backgroundColor: colors.surface, elevation: 10, marginBottom: height * 0.05 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: width * 0.035, height: height * 0.055, marginBottom: height * 0.02, fontSize: width * 0.035, fontWeight: '500', borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface },
  inputActive: { borderColor: colors.brand, backgroundColor: colors.surfaceMuted },
  phoneContainer: { position: 'relative', justifyContent: 'center', marginBottom: height * 0.02 },
  icon: { width: wp('7%'), height: hp('3%'), position: 'absolute', left: 10, zIndex: 2 },
  phoneInput: { borderWidth: 1.5, borderRadius: 12, borderColor: colors.border, height: height * 0.055, paddingLeft: wp('12%'), paddingRight: 10, fontSize: width * 0.035, fontWeight: '500', color: colors.textPrimary, backgroundColor: colors.surface },
  datePicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: width * 0.035, height: height * 0.055, justifyContent: 'space-between', backgroundColor: colors.surface },
  datePickerText: { fontSize: width * 0.035, fontWeight: '500', color: colors.textSecondary },
  label: { marginBottom: hp('0.6%'), paddingLeft: wp('1%'), fontSize: wp('3.5%'), fontWeight: '600', color: colors.textSecondary },
  calendarIcon: { height: hp('2.5%'), width: hp('2.5%'), resizeMode: 'contain' },
  buttonPadding: { paddingBottom: 10, alignItems: 'center' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  photoDropZone: { borderWidth: 1.5, borderRadius: 12, borderColor: colors.brand, borderStyle: 'dashed', backgroundColor: colors.surface, paddingVertical: 22, paddingHorizontal: 12, marginBottom: height * 0.02, alignItems: 'center', justifyContent: 'center' },
  photoDropText: { fontSize: wp('3.5%'), color: colors.brand, fontWeight: '500', marginTop: 8 },
  photoSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start', width: '100%' },
  photoThumb: { width: width * 0.17, height: width * 0.17, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoRemove: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoAdd: { width: width * 0.17, height: width * 0.17, borderRadius: 10, borderWidth: 1.5, borderColor: colors.brand, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceMuted },
  photoAddIcon: { fontSize: 24, color: colors.brand, lineHeight: 28, textAlign: 'center' },
  photoAddLabel: { fontSize: wp('2.4%'), color: colors.brand, fontWeight: '600' },
  buttonClearFlex: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  buttonClear: { color: colors.brand, fontSize: width * 0.038, fontWeight: '500' },
  clearIcon: { width: wp('6%'), height: hp('2.5%'), resizeMode: 'contain', marginRight: 2, tintColor: colors.brand },
  areaWrapper: { position: 'relative', marginBottom: 0 },
  suggestionBox: {
    position: 'absolute',
    top: height * 0.058,
    left: 0,
    right: 0,
    maxHeight: height * 0.35,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brand,
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
    borderBottomColor: colors.divider,
  },
  suggestionText: {
    fontSize: width * 0.035,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});