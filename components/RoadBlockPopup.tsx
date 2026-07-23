import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import RoadBlockCard, { ROAD_BLOCK_BACKDROP_COLOR } from './RoadBlockCard';
import { fetchActiveRoadBlock, RoadBlock, RoadBlockViewer } from '../api/roadBlocks';

// Resolves who is currently using the app so the banner fetch can match its
// city/role/profession targeting — same identity signals used elsewhere
// (see app/_layout.tsx's refreshProfessionalTags and AdminRoadBlock.tsx).
async function resolveViewer(): Promise<RoadBlockViewer> {
    const adminPhone = await AsyncStorage.getItem('adminPhone');
    if (adminPhone) {
        const { data: workforce } = await supabase
            .from('workforce')
            .select('preferred_city, services')
            .or(`phone.eq.${adminPhone},phone.eq.977${adminPhone}`)
            .maybeSingle();

        if (workforce) {
            return { role: 'workforce', city: workforce.preferred_city || null, professions: workforce.services || [] };
        }
        return { role: 'admin' };
    }

    const customerPhone = await AsyncStorage.getItem('customerPhone');
    if (customerPhone) {
        // Customers have no stored "home city" (the `customers` table only tracks
        // phone/name — see 0005_fix_customers_rls_trigger.sql), so without this a
        // city-targeted banner's city filter always no-ops for every customer
        // (matchesViewer in api/roadBlocks.ts skips the filter when viewer.city is
        // unset). Their most recent booking's city is the closest available signal.
        const { data: latestBooking } = await supabase
            .from('booking')
            .select('city')
            .eq('phone', customerPhone)
            .order('booking_id', { ascending: false })
            .limit(1)
            .maybeSingle();
        return { role: 'customer', city: latestBooking?.city || null };
    }

    return { role: 'public' };
}

// Shows the active banner once per app open — no per-device dismissal memory, so
// closing it once doesn't hide it from that device on the next launch, but it
// won't re-show again this session just from navigating between pages (this
// component now stays mounted for the app's whole lifetime; see app/_layout.tsx).
export default function RoadBlockPopup({ suppressed }: { suppressed: boolean }) {
    const [roadBlock, setRoadBlock] = useState<RoadBlock | null>(null);
    const [visible, setVisible] = useState(false);
    const alreadyShownRef = useRef(false);

    useEffect(() => {
        (async () => {
            try {
                const viewer = await resolveViewer();
                const active = await fetchActiveRoadBlock(viewer);
                if (active) setRoadBlock(active);
            } catch (e) {
                console.warn('RoadBlockPopup: could not load active banner', e);
            }
        })();
    }, []);

    // Shows the banner the first time we're eligible (loaded and not in the admin
    // area) and never again after that for the rest of this app session, even if
    // the user dismisses it or moves in and out of the admin area repeatedly.
    useEffect(() => {
        if (roadBlock && !suppressed && !alreadyShownRef.current) {
            alreadyShownRef.current = true;
            setVisible(true);
        }
    }, [roadBlock, suppressed]);

    const dismiss = () => setVisible(false);

    const handlePressButton = () => {
        if (!roadBlock) return;
        const link = roadBlock.button_link;
        dismiss();
        if (/^https?:\/\//i.test(link)) {
            Linking.openURL(link).catch(() => { });
        } else if (link.startsWith('/')) {
            router.push(link as any);
        }
    };

    if (!roadBlock) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
            <View style={styles.backdrop}>
                <View style={styles.cardWrap}>
                    <RoadBlockCard
                        data={{
                            title: roadBlock.title,
                            imageUrl: roadBlock.image_url,
                            message: roadBlock.message,
                            buttonLabel: roadBlock.button_text === 'Other'
                                ? (roadBlock.button_text_custom || 'View More')
                                : roadBlock.button_text,
                            countdownSeconds: roadBlock.countdown_seconds,
                        }}
                        onPressButton={handlePressButton}
                        onClose={dismiss}
                        runCountdown
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: ROAD_BLOCK_BACKDROP_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    cardWrap: { width: '100%', maxWidth: 360 },
});
