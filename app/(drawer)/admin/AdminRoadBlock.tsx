import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, TextInput, ScrollView, ActivityIndicator,
    FlatList, Image as RNImage, Modal,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import RoadBlockCard from '@/components/RoadBlockCard';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { uploadToStorage } from '../../../api/uploadToStorage';
import { servicesData2 } from '../../../src/data/ServiceData';
import { city as CITIES, services as PROFESSIONS } from '../../../src/data/Data';
import {
    ROAD_BLOCK_BUTTON_TEXT_OPTIONS, RoadBlockButtonText, RoadBlockRole, RoadBlock,
    listRoadBlocks, createRoadBlock, updateRoadBlock, setRoadBlockActive,
} from '../../../api/roadBlocks';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

// UI label <-> stored role value for audience targeting (Section II of the HR wireframe).
const USER_TYPE_OPTIONS: { label: string; value: RoadBlockRole }[] = [
    { label: 'Public', value: 'public' },
    { label: 'Customer', value: 'customer' },
    { label: 'Workforce', value: 'workforce' },
    { label: 'Admin', value: 'admin' },
];
const roleLabelsToValues = (labels: string[]): RoadBlockRole[] =>
    USER_TYPE_OPTIONS.filter(o => labels.includes(o.label)).map(o => o.value);
const roleValuesToLabels = (values: string[] | null): string[] =>
    USER_TYPE_OPTIONS.filter(o => (values || []).includes(o.value)).map(o => o.label);

type Tab = 'compose' | 'history';

// Every page a button link could reasonably point to — kept in sync with the
// service catalog automatically, so a new service shows up here for free.
// Screens that only make sense mid-flow (OTP steps, booking confirmation,
// admin/login screens) are deliberately left out since a cold deep link
// into them has nothing to show.
type LinkSuggestion = { label: string; path: string };
const STATIC_PAGE_LINKS: LinkSuggestion[] = [
    { label: 'Home', path: '/Home' },
    { label: 'All Services', path: '/Service' },
    { label: 'Book a Service', path: '/Book' },
    { label: 'About Us', path: '/About' },
    { label: 'Contact', path: '/Contact' },
    { label: 'FAQs', path: '/FAQs' },
    { label: 'Glossary', path: '/Glossary' },
    { label: 'Notifications', path: '/Notifications' },
    { label: 'Join as Professional', path: '/Career' },
    { label: 'Become a Partner', path: '/Partnership' },
];
const LINK_SUGGESTIONS: LinkSuggestion[] = [
    ...STATIC_PAGE_LINKS,
    ...servicesData2.flatMap(s => [
        { label: `${s.name} — Service Details`, path: `/service/ServiceDetail?id=${s.id}` },
        { label: `${s.name} — Book Now`, path: `/Book?preSelectedService=${encodeURIComponent(s.name)}` },
    ]),
];

const startOfDay = (d: Date) => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
const endOfDay = (d: Date) => { const n = new Date(d); n.setHours(23, 59, 59, 999); return n; };

const formatDate = (iso: string) => {
    try {
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`;
    } catch { return ''; }
};

function getStatus(rb: RoadBlock): { label: string; color: string } {
    const now = new Date();
    if (!rb.is_active) return { label: 'Disabled', color: '#9BBAB8' };
    if (now < new Date(rb.start_at)) return { label: 'Scheduled', color: '#C9922B' };
    if (now > new Date(rb.end_at)) return { label: 'Ended', color: '#B0532A' };
    return { label: 'Live', color: '#2F7D5A' };
}

function ButtonTextDropdown({ value, onChange, styles, colors }: { value: RoadBlockButtonText; onChange: (v: RoadBlockButtonText) => void; styles: ReturnType<typeof createStyles>; colors: ThemeColors }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
                <Text style={styles.dropdownValue}>{value}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Button Text</Text>
                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <Ionicons name="close" size={22} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: hp('55%') }}>
                            {ROAD_BLOCK_BUTTON_TEXT_OPTIONS.map(opt => {
                                const selected = opt === value;
                                return (
                                    <TouchableOpacity
                                        key={opt}
                                        style={styles.optionRow}
                                        onPress={() => { onChange(opt); setOpen(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.optionText, selected && styles.optionTextChecked]}>{opt}</Text>
                                        {selected && <Ionicons name="checkmark" size={18} color={colors.brand} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

function LinkPicker({ onSelect, styles, colors }: { onSelect: (path: string) => void; styles: ReturnType<typeof createStyles>; colors: ThemeColors }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const filtered = LINK_SUGGESTIONS.filter(s => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return s.label.toLowerCase().includes(q) || s.path.toLowerCase().includes(q);
    });

    const close = () => { setOpen(false); setQuery(''); };

    return (
        <>
            <TouchableOpacity style={styles.linkSuggestBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
                <Ionicons name="compass-outline" size={15} color={colors.brand} />
                <Text style={styles.linkSuggestBtnText}>Browse app pages…</Text>
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={close}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Link to an App Page</Text>
                            <TouchableOpacity onPress={close}>
                                <Ionicons name="close" size={22} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchRow}>
                            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search pages or services…"
                                placeholderTextColor={colors.textMuted}
                                value={query}
                                onChangeText={setQuery}
                                autoFocus
                            />
                        </View>
                        <FlatList
                            data={filtered}
                            keyExtractor={item => item.path}
                            style={{ maxHeight: hp('50%') }}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.optionRow}
                                    onPress={() => { onSelect(item.path); close(); }}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.optionText}>{item.label}</Text>
                                        <Text style={styles.optionSubtext}>{item.path}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptySearchText}>No matching pages.</Text>}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

export default function AdminRoadBlock() {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [hasAccess, setHasAccess] = useState(false);
    const [tab, setTab] = useState<Tab>('compose');
    const [adminPhone, setAdminPhone] = useState('');

    // Compose form
    const [editingId, setEditingId] = useState<number | null>(null);
    const [bannerName, setBannerName] = useState('');
    const [title, setTitle] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [message, setMessage] = useState('');
    const [buttonText, setButtonText] = useState<RoadBlockButtonText>('View More');
    const [buttonTextCustom, setButtonTextCustom] = useState('');
    const [buttonLink, setButtonLink] = useState('');
    const [countdownEnabled, setCountdownEnabled] = useState(true);
    const [countdownSecondsInput, setCountdownSecondsInput] = useState('10');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [saving, setSaving] = useState(false);

    // Audience targeting — empty selection means "all" for that dimension.
    const [targetCities, setTargetCities] = useState<string[]>([]);
    const [targetUserTypes, setTargetUserTypes] = useState<string[]>([]);
    const [targetProfessions, setTargetProfessions] = useState<string[]>([]);
    const targetsWorkforce = targetUserTypes.includes('Workforce');

    // History
    const [history, setHistory] = useState<RoadBlock[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('adminTable').then(table => {
            if (table !== 'admins') {
                Alert.alert('Access Denied', 'Admin access only.');
                router.back();
                return;
            }
            setHasAccess(true);
        });
        AsyncStorage.getItem('adminPhone').then(p => setAdminPhone(p || ''));
    }, []);

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            setHistory(await listRoadBlocks());
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not load banners.');
        }
        setHistoryLoading(false);
    }, []);

    useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);

    const resetForm = () => {
        setEditingId(null);
        setBannerName('');
        setTitle('');
        setImageUri(null);
        setImageUrl(null);
        setMessage('');
        setButtonText('View More');
        setButtonTextCustom('');
        setButtonLink('');
        setCountdownEnabled(true);
        setCountdownSecondsInput('10');
        setStartDate(new Date());
        setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        setTargetCities([]);
        setTargetUserTypes([]);
        setTargetProfessions([]);
    };

    const startEdit = (rb: RoadBlock) => {
        setEditingId(rb.id);
        setBannerName(rb.banner_name);
        setTitle(rb.title);
        setImageUri(null);
        setImageUrl(rb.image_url);
        setMessage(rb.message);
        setButtonText(rb.button_text);
        setButtonTextCustom(rb.button_text_custom || '');
        setButtonLink(rb.button_link);
        setCountdownEnabled(!!rb.countdown_seconds);
        setCountdownSecondsInput(String(rb.countdown_seconds || 10));
        setStartDate(new Date(rb.start_at));
        setEndDate(new Date(rb.end_at));
        setTargetCities(rb.target_cities || []);
        setTargetUserTypes(roleValuesToLabels(rb.target_roles));
        setTargetProfessions(rb.target_professions || []);
        setTab('compose');
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: false,
            quality: 0.88,
        });
        if (result.canceled || !result.assets?.[0]) return;

        const uri = result.assets[0].uri;
        setImageUri(uri);
        setUploadingImage(true);
        try {
            const url = await uploadToStorage(uri, `roadblock-${Date.now()}.jpg`);
            setImageUrl(url);
        } catch (e: any) {
            Alert.alert('Upload Failed', e.message || 'Could not upload image.');
            setImageUri(null);
        }
        setUploadingImage(false);
    };

    const handlePublish = async () => {
        if (!bannerName.trim()) return Alert.alert('Missing Field', 'Please name this banner (for your own reference).');
        if (!title.trim()) return Alert.alert('Missing Field', 'Please enter a title — this is the bold headline users see.');
        if (!imageUrl) return Alert.alert('Missing Field', 'Please upload a banner image.');
        if (!message.trim()) return Alert.alert('Missing Field', 'Please enter the message shown under the image.');
        if (!buttonLink.trim()) return Alert.alert('Missing Field', 'Please enter where the button should link to.');
        if (buttonText === 'Other' && !buttonTextCustom.trim()) return Alert.alert('Missing Field', 'Please enter the custom button text.');
        if (endDate <= startDate) return Alert.alert('Invalid Dates', 'End date must be after the start date.');
        if (countdownEnabled && (!countdownSecondsInput || Number(countdownSecondsInput) <= 0)) {
            return Alert.alert('Invalid Countdown', 'Please enter how many seconds the close button should count down.');
        }

        setSaving(true);
        try {
            const input = {
                bannerName: bannerName.trim(),
                title: title.trim(),
                imageUrl,
                message: message.trim(),
                buttonText,
                buttonTextCustom: buttonTextCustom.trim(),
                buttonLink: buttonLink.trim(),
                countdownSeconds: countdownEnabled ? Math.round(Number(countdownSecondsInput)) : null,
                startAt: startOfDay(startDate).toISOString(),
                endAt: endOfDay(endDate).toISOString(),
                createdByPhone: adminPhone,
                targetCities,
                targetRoles: roleLabelsToValues(targetUserTypes),
                targetProfessions: targetsWorkforce ? targetProfessions : [],
            };

            if (editingId) {
                await updateRoadBlock(editingId, input);
                Alert.alert('Saved', 'Banner updated.');
            } else {
                await createRoadBlock(input);
                Alert.alert('Published', 'Popup banner is now scheduled.');
            }
            resetForm();
            setTab('history');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not save banner.');
        }
        setSaving(false);
    };

    const toggleActive = async (rb: RoadBlock) => {
        try {
            await setRoadBlockActive(rb.id, !rb.is_active);
            loadHistory();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not update banner.');
        }
    };

    const resolvedButtonLabel = buttonText === 'Other' ? (buttonTextCustom || 'Other') : buttonText;

    if (!hasAccess) return null;

    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={isDark ? colors.brand : '#fff'} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Popup Banner</Text>
            </View>

            <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tabBtn, tab === 'compose' && styles.tabBtnActive]} onPress={() => setTab('compose')}>
                    <Text style={[styles.tabText, tab === 'compose' && styles.tabTextActive]}>{editingId ? 'Edit Banner' : 'Compose'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]} onPress={() => setTab('history')}>
                    <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>All Banners</Text>
                </TouchableOpacity>
            </View>

            {tab === 'compose' ? (
                <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                        <Text style={styles.label}>BANNER NAME (INTERNAL)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Monsoon Plumbing Flash Offer"
                            placeholderTextColor={colors.textMuted}
                            value={bannerName}
                            onChangeText={setBannerName}
                        />

                        <Text style={styles.label}>BANNER IMAGE (SQUARE, 1080×1080)</Text>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                            {imageUri || imageUrl ? (
                                <RNImage source={{ uri: imageUri || imageUrl! }} style={styles.imagePreview} resizeMode="cover" />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="image-outline" size={26} color={colors.textMuted} />
                                    <Text style={styles.imagePlaceholderText}>Tap to upload a 1080×1080 image</Text>
                                </View>
                            )}
                            {uploadingImage && (
                                <View style={styles.imageUploadingOverlay}>
                                    <ActivityIndicator color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>TITLE</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Bold headline shown above the countdown, e.g. Flat 20% Off Plumbing Repair"
                            placeholderTextColor={colors.textMuted}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>MESSAGE</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder="Shown under the image — keep it short and specific."
                            placeholderTextColor={colors.textMuted}
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>BUTTON TEXT</Text>
                        <ButtonTextDropdown value={buttonText} onChange={setButtonText} styles={styles} colors={colors} />
                        {buttonText === 'Other' && (
                            <TextInput
                                style={[styles.input, { marginTop: 10 }]}
                                placeholder="Custom button text"
                                placeholderTextColor={colors.textMuted}
                                value={buttonTextCustom}
                                onChangeText={setButtonTextCustom}
                            />
                        )}

                        <Text style={styles.label}>BUTTON LINK</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="https:// or an in-app route"
                            placeholderTextColor={colors.textMuted}
                            value={buttonLink}
                            onChangeText={setButtonLink}
                            autoCapitalize="none"
                        />
                        <LinkPicker onSelect={setButtonLink} styles={styles} colors={colors} />

                        <Text style={styles.label}>CLOSE BUTTON COUNTDOWN</Text>
                        <View style={styles.countdownRow}>
                            <TouchableOpacity
                                style={[styles.toggle, countdownEnabled && styles.toggleOn]}
                                onPress={() => setCountdownEnabled(v => !v)}
                            >
                                <View style={[styles.toggleKnob, countdownEnabled && styles.toggleKnobOn]} />
                            </TouchableOpacity>
                            <Text style={styles.countdownLabel}>
                                {countdownEnabled
                                    ? 'The × shows a countdown and can’t be tapped until it hits 0 — like a skippable ad'
                                    : 'The × is tappable right away, no delay'}
                            </Text>
                        </View>
                        {countdownEnabled && (
                            <View style={styles.minutesRow}>
                                <TextInput
                                    style={styles.minutesInput}
                                    keyboardType="number-pad"
                                    value={countdownSecondsInput}
                                    onChangeText={setCountdownSecondsInput}
                                />
                                <Text style={styles.minutesSuffix}>seconds</Text>
                            </View>
                        )}

                        <Text style={styles.label}>SCHEDULE</Text>
                        <View style={styles.dateRow}>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                                <Ionicons name="calendar-outline" size={16} color={colors.brand} />
                                <Text style={styles.dateBtnText}>{formatDate(startDate.toISOString())}</Text>
                            </TouchableOpacity>
                            <Text style={styles.dateDash}>–</Text>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                                <Ionicons name="calendar-outline" size={16} color={colors.brand} />
                                <Text style={styles.dateBtnText}>{formatDate(endDate.toISOString())}</Text>
                            </TouchableOpacity>
                        </View>
                        {showStartPicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display="default"
                                onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d); }}
                            />
                        )}
                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate}
                                mode="date"
                                display="default"
                                minimumDate={startDate}
                                onChange={(_, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
                            />
                        )}

                        <Text style={styles.label}>AUDIENCE TARGETING</Text>
                        <MultiSelectDropdown
                            label="CITY"
                            options={CITIES}
                            selected={targetCities}
                            onChange={setTargetCities}
                            placeholder="All cities"
                        />
                        <MultiSelectDropdown
                            label="USER TYPE"
                            options={USER_TYPE_OPTIONS.map(o => o.label)}
                            selected={targetUserTypes}
                            onChange={setTargetUserTypes}
                            placeholder="Everyone (Public, Customer, Workforce, Admin)"
                        />
                        {targetsWorkforce && (
                            <MultiSelectDropdown
                                label="PROFESSION"
                                options={PROFESSIONS}
                                selected={targetProfessions}
                                onChange={setTargetProfessions}
                                placeholder="All professions"
                            />
                        )}

                        {(imageUri || imageUrl) && title.trim() && message.trim() ? (
                            <>
                                <Text style={styles.label}>LIVE PREVIEW</Text>
                                <View style={styles.previewWrap}>
                                    <RoadBlockCard
                                        data={{
                                            title: title.trim(),
                                            imageUrl: (imageUri || imageUrl)!,
                                            message: message.trim(),
                                            buttonLabel: resolvedButtonLabel,
                                            countdownSeconds: countdownEnabled ? Number(countdownSecondsInput || 0) : null,
                                        }}
                                        runCountdown={false}
                                    />
                                </View>
                            </>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.publishBtn, saving && { opacity: 0.6 }]}
                            onPress={handlePublish}
                            disabled={saving || uploadingImage}
                        >
                            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                                <>
                                    <Ionicons name={editingId ? 'save-outline' : 'megaphone-outline'} size={18} color="#fff" />
                                    <Text style={styles.publishBtnText}>{editingId ? 'Save Changes' : 'Publish Banner'}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {editingId && (
                            <TouchableOpacity onPress={resetForm} style={{ alignSelf: 'center', marginTop: 10 }}>
                                <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>Cancel edit, start new</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                historyLoading ? (
                    <View style={styles.historyCenter}><ActivityIndicator size="large" color={colors.brand} /></View>
                ) : history.length === 0 ? (
                    <View style={styles.historyCenter}>
                        <Ionicons name="pricetags-outline" size={40} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No banners yet.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={history}
                        keyExtractor={item => String(item.id)}
                        contentContainerStyle={styles.historyList}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const status = getStatus(item);
                            return (
                                <View style={styles.historyCard}>
                                    <View style={styles.historyCardTop}>
                                        <Text style={styles.historyCardTitle} numberOfLines={1}>{item.banner_name}</Text>
                                        <View style={[styles.statusPill, { backgroundColor: status.color }]}>
                                            <Text style={styles.statusPillText}>{status.label}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.historyCardDates}>{formatDate(item.start_at)} – {formatDate(item.end_at)}</Text>
                                    <View style={styles.historyCardActions}>
                                        <TouchableOpacity style={styles.historyActionBtn} onPress={() => startEdit(item)}>
                                            <Ionicons name="create-outline" size={15} color={colors.brand} />
                                            <Text style={styles.historyActionText}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.historyActionBtn} onPress={() => toggleActive(item)}>
                                            <Ionicons name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'} size={15} color={colors.brand} />
                                            <Text style={styles.historyActionText}>{item.is_active ? 'Disable' : 'Enable'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                    />
                )
            )}
        </View>
    );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: isDark ? colors.surface : colors.brand,
        borderBottomWidth: isDark ? 1 : 0, borderBottomColor: colors.divider,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'), gap: wp('3%'),
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: isDark ? colors.textPrimary : '#fff', flex: 1 },

    tabRow: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: hp('1.6%'), borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnActive: { borderBottomColor: colors.brand },
    tabText: { fontSize: 13.5, fontWeight: '700', color: colors.textMuted },
    tabTextActive: { color: colors.brand },

    content: { padding: wp('4%'), paddingBottom: hp('8%') },
    label: {
        fontSize: 11, fontWeight: '800', color: colors.brand,
        textTransform: 'uppercase', letterSpacing: 0.6,
        marginBottom: 8, marginTop: hp('2%'),
    },
    input: {
        backgroundColor: colors.surface, borderRadius: 14,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
        fontSize: 14, color: colors.textPrimary,
    },
    textarea: { minHeight: hp('12%'), paddingTop: hp('1.5%') },

    imagePicker: { borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
    imagePreview: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceMuted },
    imagePlaceholder: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.background },
    imagePlaceholderText: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
    imageUploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },

    dropdownBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface, borderRadius: 14,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.8%'),
    },
    dropdownValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 8, paddingBottom: hp('2%'), maxHeight: hp('75%'),
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: wp('5%'), paddingVertical: hp('1.8%'),
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: hp('1.6%'), paddingHorizontal: wp('5%'),
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    optionText: { fontSize: 14, color: colors.textSecondary },
    optionTextChecked: { color: colors.textPrimary, fontWeight: '700' },
    optionSubtext: { fontSize: 11.5, color: colors.textMuted, fontWeight: '500', marginTop: 2 },

    linkSuggestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8 },
    linkSuggestBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.brand, textDecorationLine: 'underline' },
    searchRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: wp('5%'), marginBottom: 8,
        backgroundColor: colors.background, borderRadius: 12,
        paddingHorizontal: wp('3.5%'), paddingVertical: hp('1.2%'),
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
    emptySearchText: { textAlign: 'center', fontSize: 13, color: colors.textMuted, fontWeight: '500', paddingVertical: hp('3%') },

    countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 3, justifyContent: 'center' },
    toggleOn: { backgroundColor: colors.brand },
    toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    toggleKnobOn: { alignSelf: 'flex-end' },
    countdownLabel: { flex: 1, fontSize: 12.5, color: colors.textSecondary, fontWeight: '500' },
    minutesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    minutesInput: {
        backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: 14, paddingVertical: hp('1.2%'), fontSize: 14, color: colors.textPrimary, width: 80, textAlign: 'center',
    },
    minutesSuffix: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: wp('3.5%'), paddingVertical: hp('1.5%') },
    dateBtnText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    dateDash: { color: colors.textMuted, fontWeight: '700' },

    previewWrap: { marginTop: 4, alignItems: 'center' },

    publishBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.brand, borderRadius: 16,
        paddingVertical: hp('2%'), marginTop: hp('3%'), gap: 8,
        elevation: 3,
    },
    publishBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    historyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
    historyList: { padding: wp('4%'), paddingBottom: hp('5%') },
    historyCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: wp('4%'), marginBottom: hp('1.5%') },
    historyCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    historyCardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusPillText: { fontSize: 10.5, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
    historyCardDates: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 10 },
    historyCardActions: { flexDirection: 'row', gap: 16 },
    historyActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    historyActionText: { fontSize: 12.5, fontWeight: '700', color: colors.brand },
});
