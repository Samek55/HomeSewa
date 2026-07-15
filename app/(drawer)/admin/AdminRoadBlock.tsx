import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, TextInput, ScrollView, ActivityIndicator,
    FlatList, Image as RNImage,
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
import { uploadToStorage } from '../../../api/uploadToStorage';
import {
    ROAD_BLOCK_BUTTON_TEXT_OPTIONS, RoadBlockButtonText, RoadBlock,
    listRoadBlocks, createRoadBlock, updateRoadBlock, setRoadBlockActive,
} from '../../../api/roadBlocks';

type Tab = 'compose' | 'history';

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

export default function AdminRoadBlock() {
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
    const [countdownEnabled, setCountdownEnabled] = useState(false);
    const [countdownMinutes, setCountdownMinutes] = useState('10');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [saving, setSaving] = useState(false);

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
        setCountdownEnabled(false);
        setCountdownMinutes('10');
        setStartDate(new Date());
        setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
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
        setCountdownMinutes(String(Math.max(1, Math.round((rb.countdown_seconds || 600) / 60))));
        setStartDate(new Date(rb.start_at));
        setEndDate(new Date(rb.end_at));
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
        if (countdownEnabled && (!countdownMinutes || Number(countdownMinutes) <= 0)) {
            return Alert.alert('Invalid Countdown', 'Please enter a countdown length in minutes.');
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
                countdownSeconds: countdownEnabled ? Math.round(Number(countdownMinutes) * 60) : null,
                startAt: startOfDay(startDate).toISOString(),
                endAt: endOfDay(endDate).toISOString(),
                createdByPhone: adminPhone,
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
                    <Ionicons name="arrow-back" size={22} color="#fff" />
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
                <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                        <Text style={styles.label}>BANNER NAME (INTERNAL)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Monsoon Plumbing Flash Offer"
                            placeholderTextColor="#B0BEC5"
                            value={bannerName}
                            onChangeText={setBannerName}
                        />

                        <Text style={styles.label}>BANNER IMAGE</Text>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                            {imageUri || imageUrl ? (
                                <RNImage source={{ uri: imageUri || imageUrl! }} style={styles.imagePreview} resizeMode="cover" />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="image-outline" size={26} color="#9BBAB8" />
                                    <Text style={styles.imagePlaceholderText}>Tap to upload image</Text>
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
                            placeholderTextColor="#B0BEC5"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>MESSAGE</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder="Shown under the image — keep it short and specific."
                            placeholderTextColor="#B0BEC5"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>BUTTON TEXT</Text>
                        <View style={styles.chipRow}>
                            {ROAD_BLOCK_BUTTON_TEXT_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[styles.chip, buttonText === opt && styles.chipActive]}
                                    onPress={() => setButtonText(opt)}
                                >
                                    <Text style={[styles.chipText, buttonText === opt && styles.chipTextActive]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {buttonText === 'Other' && (
                            <TextInput
                                style={[styles.input, { marginTop: 10 }]}
                                placeholder="Custom button text"
                                placeholderTextColor="#B0BEC5"
                                value={buttonTextCustom}
                                onChangeText={setButtonTextCustom}
                            />
                        )}

                        <Text style={styles.label}>BUTTON LINK</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="https:// or an in-app route"
                            placeholderTextColor="#B0BEC5"
                            value={buttonLink}
                            onChangeText={setButtonLink}
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>COUNTDOWN TIMER</Text>
                        <View style={styles.countdownRow}>
                            <TouchableOpacity
                                style={[styles.toggle, countdownEnabled && styles.toggleOn]}
                                onPress={() => setCountdownEnabled(v => !v)}
                            >
                                <View style={[styles.toggleKnob, countdownEnabled && styles.toggleKnobOn]} />
                            </TouchableOpacity>
                            <Text style={styles.countdownLabel}>
                                {countdownEnabled ? 'Starts the moment each user opens the popup' : 'No countdown shown'}
                            </Text>
                        </View>
                        {countdownEnabled && (
                            <View style={styles.minutesRow}>
                                <TextInput
                                    style={styles.minutesInput}
                                    keyboardType="number-pad"
                                    value={countdownMinutes}
                                    onChangeText={setCountdownMinutes}
                                />
                                <Text style={styles.minutesSuffix}>minutes</Text>
                            </View>
                        )}

                        <Text style={styles.label}>SCHEDULE</Text>
                        <View style={styles.dateRow}>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                                <Ionicons name="calendar-outline" size={16} color="#295C59" />
                                <Text style={styles.dateBtnText}>{formatDate(startDate.toISOString())}</Text>
                            </TouchableOpacity>
                            <Text style={styles.dateDash}>–</Text>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                                <Ionicons name="calendar-outline" size={16} color="#295C59" />
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
                                            countdownSeconds: countdownEnabled ? Number(countdownMinutes || 0) * 60 : null,
                                            startAt: startDate.toISOString(),
                                            endAt: endDate.toISOString(),
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
                                <Text style={{ color: '#9BBAB8', fontWeight: '700', fontSize: 13 }}>Cancel edit, start new</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                historyLoading ? (
                    <View style={styles.historyCenter}><ActivityIndicator size="large" color="#295C59" /></View>
                ) : history.length === 0 ? (
                    <View style={styles.historyCenter}>
                        <Ionicons name="pricetags-outline" size={40} color="#9BBAB8" />
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
                                            <Ionicons name="create-outline" size={15} color="#295C59" />
                                            <Text style={styles.historyActionText}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.historyActionBtn} onPress={() => toggleActive(item)}>
                                            <Ionicons name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'} size={15} color="#295C59" />
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

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5F9F8' },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#295C59',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'), gap: wp('3%'),
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 },

    tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F4F3' },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: hp('1.6%'), borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnActive: { borderBottomColor: '#295C59' },
    tabText: { fontSize: 13.5, fontWeight: '700', color: '#9BBAB8' },
    tabTextActive: { color: '#295C59' },

    content: { padding: wp('4%'), paddingBottom: hp('8%') },
    label: {
        fontSize: 11, fontWeight: '800', color: '#295C59',
        textTransform: 'uppercase', letterSpacing: 0.6,
        marginBottom: 8, marginTop: hp('2%'),
    },
    input: {
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.5%'),
        fontSize: 14, color: '#1C2B2A',
    },
    textarea: { minHeight: hp('12%'), paddingTop: hp('1.5%') },

    imagePicker: { borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: '#D6E8E7' },
    imagePreview: { width: '100%', height: hp('18%'), backgroundColor: '#E8F4F3' },
    imagePlaceholder: { width: '100%', height: hp('18%'), alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F5F9F8' },
    imagePlaceholderText: { fontSize: 12.5, color: '#9BBAB8', fontWeight: '600' },
    imageUploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D6E8E7' },
    chipActive: { backgroundColor: '#295C59', borderColor: '#295C59' },
    chipText: { fontSize: 12.5, fontWeight: '700', color: '#5A7270' },
    chipTextActive: { color: '#fff' },

    countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#D6E8E7', padding: 3, justifyContent: 'center' },
    toggleOn: { backgroundColor: '#295C59' },
    toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    toggleKnobOn: { alignSelf: 'flex-end' },
    countdownLabel: { flex: 1, fontSize: 12.5, color: '#5A7270', fontWeight: '500' },
    minutesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    minutesInput: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#D6E8E7',
        paddingHorizontal: 14, paddingVertical: hp('1.2%'), fontSize: 14, color: '#1C2B2A', width: 80, textAlign: 'center',
    },
    minutesSuffix: { fontSize: 13, color: '#5A7270', fontWeight: '600' },

    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#D6E8E7', paddingHorizontal: wp('3.5%'), paddingVertical: hp('1.5%') },
    dateBtnText: { fontSize: 13, fontWeight: '600', color: '#1C2B2A' },
    dateDash: { color: '#9BBAB8', fontWeight: '700' },

    previewWrap: { marginTop: 4, alignItems: 'center' },

    publishBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#295C59', borderRadius: 16,
        paddingVertical: hp('2%'), marginTop: hp('3%'), gap: 8,
        elevation: 3,
    },
    publishBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    historyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyText: { fontSize: 14, color: '#9BBAB8', fontWeight: '500' },
    historyList: { padding: wp('4%'), paddingBottom: hp('5%') },
    historyCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E8F4F3', padding: wp('4%'), marginBottom: hp('1.5%') },
    historyCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    historyCardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1C2B2A' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusPillText: { fontSize: 10.5, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
    historyCardDates: { fontSize: 12, color: '#9BBAB8', fontWeight: '600', marginTop: 4, marginBottom: 10 },
    historyCardActions: { flexDirection: 'row', gap: 16 },
    historyActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    historyActionText: { fontSize: 12.5, fontWeight: '700', color: '#295C59' },
});
