import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, Image, TouchableOpacity,
    StyleSheet, TextInput, Alert, ActivityIndicator,
    ScrollView, Dimensions, DeviceEventEmitter,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { uploadToStorage } from '../../../api/uploadToStorage';
import { invokeEdgeFunction } from '../../../api/functionsClient';
import Header4 from '@/components/Header4Admin';
import HeadshotCropModal from '../../../components/bookings/HeadshotCropModal';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { city as CITY_OPTIONS, area as AREA_OPTIONS } from '../../../src/data/Data';
import { servicesData2 } from '../../../src/data/ServiceData';
import DropdownAdd from '../../../components/bookings/DropdownAdd';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const { width } = Dimensions.get('window');
const scaleFont = (s: number) => (s * width) / 375;

export default function UpdateProfile() {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [phone, setPhone] = useState('');
    const [adminTable, setAdminTable] = useState('workforce');

    // Editable fields
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [gender, setGender] = useState('');
    const [city, setCity] = useState('');
    const [area, setArea] = useState<string[]>([]);
    const [experience, setExperience] = useState('');
    const [positions, setPositions] = useState<string[]>([]);

    // Photo
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [tempUri, setTempUri] = useState<string | null>(null);
    const [showCrop, setShowCrop] = useState(false);


    // Stats
    const [uin, setUin] = useState('');
    const [status, setStatus] = useState('');

    const [activeInput, setActiveInput] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const p = await AsyncStorage.getItem('adminPhone') || '';
            const t = await AsyncStorage.getItem('adminTable') || 'workforce';
            setPhone(p);
            setAdminTable(t);
            try {
                if (t === 'admins') {
                    const cleanP = p.replace(/\D/g, '').slice(-10);
                    const { data } = await supabase
                        .from('admin')
                        .select('full_name, status, photo_url')
                        .eq('phone', cleanP)
                        .single();
                    if (data) {
                        setFullName(data.full_name || '');
                        setStatus(data.status || '');
                        setPhotoUrl(data.photo_url || null);
                    }
                } else {
                    // Professional — full profile from workforce table.
                    const { data } = await supabase
                        .from('workforce')
                        .select('first_name, middle_name, last_name, headshot_url, email, gender, preferred_city, working_areas, years_experience, services, uin, profile_status')
                        .or(`phone.eq.${p},phone.eq.977${p}`)
                        .maybeSingle();
                    if (data) {
                        setFullName([data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' '));
                        setPhotoUrl(data.headshot_url || null);
                        setEmail(data.email || '');
                        setGender(data.gender || '');
                        setCity(data.preferred_city || '');
                        setArea(Array.isArray(data.working_areas) ? data.working_areas : []);
                        setExperience(String(data.years_experience || ''));
                        setPositions(Array.isArray(data.services) ? data.services : []);
                        setUin(data.uin || '');
                        setStatus(data.profile_status || '');
                    }
                }
            } catch {}
            setLoading(false);
        };
        load();
    }, []);

    const pickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: false,
            quality: 0.88,
        });
        if (!result.canceled && result.assets?.[0]) {
            let uri = result.assets[0].uri;
            // Copy content:// URIs (Android) to a local cache file so Animated.Image can read them
            if (uri.startsWith('content://')) {
                try {
                    const FileSystem = require('expo-file-system');
                    const dest = FileSystem.cacheDirectory + `pick_${Date.now()}.jpg`;
                    await FileSystem.copyAsync({ from: uri, to: dest });
                    uri = dest;
                } catch {}
            }
            setTempUri(uri);
            setShowCrop(true);
        }
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Validation', 'Name cannot be empty.');
            return;
        }
        setSaving(true);
        try {
            let newPhotoUrl = photoUrl;
            if (tempUri) {
                newPhotoUrl = await uploadToStorage(tempUri, `profile_${phone}.jpg`);
                setPhotoUrl(newPhotoUrl);
                setTempUri(null);
            }

            const cleanPhone = phone.replace(/\D/g, '').slice(-10);

            if (adminTable === 'admins') {
                // Super admin — only full_name and photo are editable here.
                const { data: updated, error } = await supabase
                    .from('admin')
                    .update({ full_name: fullName.trim(), photo_url: newPhotoUrl })
                    .eq('phone', cleanPhone)
                    .select();
                if (error) throw error;
                if (!updated || updated.length === 0) throw new Error('No admin record matched this phone number.');
            } else {
                // Professional — update full workforce profile.
                const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
                const { data: updated, error } = await supabase
                    .from('workforce')
                    .update({
                        first_name: nameParts[0] || null,
                        middle_name: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null,
                        last_name: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
                        headshot_url: newPhotoUrl,
                        email: email.trim(),
                        gender: gender.trim(),
                        preferred_city: city.trim() || null,
                        working_areas: area,
                        years_experience: experience ? Number(experience) : null,
                        services: positions,
                    })
                    .or(`phone.eq.${cleanPhone},phone.eq.977${cleanPhone}`)
                    .select();
                if (error) throw error;
                if (!updated || updated.length === 0) throw new Error('No workforce profile matched this phone number.');
            }
            DeviceEventEmitter.emit('authChanged');
            Alert.alert('Saved', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not save profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout', style: 'destructive', onPress: async () => {
                    // Revokes the session server-side — see AdminLogin.tsx's
                    // handleLogout for why this matters (real revocation, not
                    // just clearing local state).
                    invokeEdgeFunction('logout', {}, '', { requireSession: true }).catch(() => {});
                    await AsyncStorage.multiRemove(['adminPhone', 'adminTable', 'adminRole', 'adminSessionToken']);
                    try { const { OneSignal } = require('react-native-onesignal'); OneSignal.logout(); } catch {}
                    DeviceEventEmitter.emit('authChanged');
                    router.replace('/Home');
                }
            },
        ]);
    };

    const displayPhoto = tempUri || photoUrl;

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? colors.surface : colors.brand }}>
                <ActivityIndicator size="large" color={isDark ? colors.brand : '#fff'} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Header4 />

            {tempUri && (
                <HeadshotCropModal
                    visible={showCrop}
                    imageUri={tempUri}
                    onSave={(croppedUri: string) => { setTempUri(croppedUri); setShowCrop(false); }}
                    onCancel={() => { setTempUri(null); setShowCrop(false); }}
                />
            )}

            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1, paddingBottom: hp('8%') }}
            >

            {/* ── HERO ── */}
            <View style={styles.hero}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={isDark ? colors.brand : '#fff'} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Update Profile</Text>

                <TouchableOpacity onPress={pickPhoto} style={styles.avatarWrapper} activeOpacity={0.8}>
                    {displayPhoto ? (
                        <Image source={{ uri: displayPhoto }} style={styles.avatar} resizeMode="cover" />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={44} color={colors.textMuted} />
                        </View>
                    )}
                    <View style={styles.cameraChip}>
                        <Ionicons name="camera" size={13} color="#fff" />
                    </View>
                </TouchableOpacity>

                <Text style={styles.heroName}>{fullName || 'Your Name'}</Text>
                <Text style={styles.heroPhone}>+977 {phone}</Text>
            </View>

            {/* ── FORM CARD ── */}
            <View style={styles.card}>

                {/* Personal Info */}
                <SectionHeader icon="person-outline" title="Personal Information" colors={colors} />

                <Field label="Full Name" colors={colors}>
                    <TextInput
                        style={[styles.input, activeInput === 'name' && styles.inputActive]}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your Full Name"
                        placeholderTextColor={colors.textMuted}
                        onFocus={() => setActiveInput('name')}
                        onBlur={() => setActiveInput(null)}
                    />
                </Field>

                <Field label="Phone Number" colors={colors}>
                    <View style={styles.inputReadonly}>
                        <Text style={styles.inputReadonlyText}>+977 {phone}</Text>
                        <Ionicons name="lock-closed-outline" size={15} color={colors.textMuted} />
                    </View>
                </Field>

                {adminTable !== 'admins' && (
                    <>
                        <Field label="Email" colors={colors}>
                            <TextInput
                                style={[styles.input, activeInput === 'email' && styles.inputActive]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email address"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setActiveInput('email')}
                                onBlur={() => setActiveInput(null)}
                            />
                        </Field>

                        <Field label="Gender" colors={colors}>
                            <View style={styles.radioRow}>
                                {['Male', 'Female'].map(g => (
                                    <TouchableOpacity key={g} style={styles.radioOption} onPress={() => setGender(g)} activeOpacity={0.7}>
                                        <View style={styles.radioOuter}>
                                            {gender === g && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={styles.radioLabel}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Field>
                    </>
                )}

                {/* Professional Info — hidden for super admin */}
                {adminTable !== 'admins' && <SectionHeader icon="briefcase-outline" title="Professional Information" colors={colors} />}
                {adminTable === 'admins' && null}

                {adminTable !== 'admins' && (
                    <>
                        <Field label="Your Expertise" colors={colors}>
                            <DropdownAdd
                                options={servicesData2.map(s => s.name)}
                                placeholder="Select maximum UpTo 5"
                                placeholderColor={colors.textMuted}
                                value={positions}
                                onSelectOption={setPositions}
                                onOpen={() => setActiveInput('expertise')}
                                onClose={() => setActiveInput(null)}
                                maxSelections={5}
                            />
                        </Field>

                        <Field label="Years of Experience" colors={colors}>
                            <TextInput
                                style={[styles.input, activeInput === 'experience' && styles.inputActive]}
                                value={experience}
                                onChangeText={t => setExperience(t.replace(/[^0-9]/g, ''))}
                                placeholder="5"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                                onFocus={() => setActiveInput('experience')}
                                onBlur={() => setActiveInput(null)}
                            />
                        </Field>

                        <Field label="Preferred City" colors={colors}>
                            <DropdownAdd
                                options={CITY_OPTIONS}
                                placeholder="Select your preferred city"
                                placeholderColor={colors.textMuted}
                                value={city ? [city] : []}
                                onSelectOption={vals => { setCity(vals[vals.length - 1] ?? ''); setArea([]); }}
                                onOpen={() => setActiveInput('city')}
                                onClose={() => setActiveInput(null)}
                                maxSelections={1}
                            />
                        </Field>

                        <Field label="Preferred Working Area" colors={colors}>
                            <DropdownAdd
                                options={AREA_OPTIONS}
                                placeholder="Select maximum UpTo 5"
                                placeholderColor={colors.textMuted}
                                value={area}
                                onSelectOption={setArea}
                                onOpen={() => setActiveInput('workingArea')}
                                onClose={() => setActiveInput(null)}
                                maxSelections={5}
                            />
                        </Field>
                    </>
                )}

                {/* Account */}
                <SectionHeader icon="settings-outline" title="Account" colors={colors} />

                <TouchableOpacity style={styles.actionRow} onPress={() => router.push({ pathname: '/AdminChangePassword', params: { mode: 'change' } } as any)} activeOpacity={0.75}>
                    <View style={styles.actionIcon}>
                        <Ionicons name="key-outline" size={19} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.actionLabel}>Change PIN</Text>
                        <Text style={styles.actionSub}>Update your 4-digit login PIN</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Save */}
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={17} color={colors.danger} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

            </View>

            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function SectionHeader({ icon, title, colors }: { icon: any; title: string; colors: ThemeColors }) {
    const sectionStyles = createSectionStyles(colors);
    return (
        <View style={sectionStyles.row}>
            <Ionicons name={icon} size={15} color={colors.brand} />
            <Text style={sectionStyles.text}>{title}</Text>
        </View>
    );
}

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: ThemeColors }) {
    const fieldStyles = createFieldStyles(colors);
    return (
        <View>
            <Text style={fieldStyles.label}>{label}</Text>
            {children}
        </View>
    );
}

const createSectionStyles = (colors: ThemeColors) => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: hp('2.5%'), marginBottom: hp('1.2%') },
    text: { fontSize: scaleFont(12), fontWeight: '800', color: colors.brand, letterSpacing: 0.3 },
});

const createFieldStyles = (colors: ThemeColors) => StyleSheet.create({
    label: { fontSize: wp('3.6%'), fontWeight: '600', color: colors.textSecondary, marginBottom: 6, paddingLeft: 4 },
});

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    hero: {
        backgroundColor: isDark ? colors.surface : colors.brand,
        borderBottomWidth: isDark ? 1 : 0, borderBottomColor: colors.divider,
        alignItems: 'center',
        paddingBottom: hp('2.5%'),
        paddingTop: hp('0.5%'),
    },
    backBtn: { position: 'absolute', left: wp('4%'), top: hp('0.5%'), padding: 6 },
    screenTitle: { fontSize: scaleFont(13), fontWeight: '600', color: isDark ? colors.textMuted : 'rgba(255,255,255,0.6)', marginBottom: hp('1.5%'), letterSpacing: 1.2 },
    avatarWrapper: { width: wp('24%'), height: wp('24%'), borderRadius: wp('12%'), borderWidth: 3, borderColor: isDark ? colors.border : 'rgba(255,255,255,0.55)', overflow: 'visible', marginBottom: hp('1.2%'), position: 'relative' },
    avatar: { width: '100%', height: '100%', borderRadius: wp('12%') },
    avatarPlaceholder: { width: '100%', height: '100%', borderRadius: wp('12%'), backgroundColor: colors.brandDark, alignItems: 'center', justifyContent: 'center' },
    cameraChip: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.brand, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    heroName: { fontSize: scaleFont(18), fontWeight: '800', color: isDark ? colors.textPrimary : '#fff', letterSpacing: 0.3 },
    heroPhone: { fontSize: scaleFont(12), color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.65)', marginTop: 2 },

    card: { backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, flex: 1, paddingHorizontal: wp('5%'), paddingTop: hp('2%') },

    input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: wp('3.5%'), height: hp('6%'), fontSize: wp('3.5%'), fontWeight: '500', color: colors.textPrimary, marginBottom: hp('2%') },
    inputActive: { borderColor: colors.brand, backgroundColor: colors.surfaceMuted },
    inputReadonly: { backgroundColor: colors.surfaceMuted, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: wp('3.5%'), height: hp('6%'), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: hp('2%') },
    inputReadonlyText: { fontSize: wp('3.5%'), fontWeight: '500', color: colors.textMuted },

    radioRow: { flexDirection: 'row', alignItems: 'center', gap: wp('6%'), paddingLeft: 4, marginBottom: hp('2%') },
    radioOption: { flexDirection: 'row', alignItems: 'center', gap: wp('2%') },
    radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
    radioLabel: { fontSize: wp('3.6%'), color: colors.textSecondary, fontWeight: '500' },

    actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: wp('4%'), gap: wp('3%'), marginBottom: hp('0.8%'), elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
    actionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: scaleFont(14), fontWeight: '700', color: colors.textPrimary },
    actionSub: { fontSize: scaleFont(11), color: colors.textMuted, marginTop: 2 },

    saveBtn: { backgroundColor: colors.brand, borderRadius: 14, height: hp('6.5%'), alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#295C59', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, marginTop: hp('2.5%'), marginBottom: hp('1.5%') },
    saveBtnText: { color: '#fff', fontSize: scaleFont(15), fontWeight: '700', letterSpacing: 0.4 },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: hp('1.5%') },
    logoutText: { fontSize: scaleFont(14), fontWeight: '700', color: colors.danger },

});
