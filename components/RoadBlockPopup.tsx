import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RoadBlockCard, { ROAD_BLOCK_BACKDROP_COLOR } from './RoadBlockCard';
import { fetchActiveRoadBlock, RoadBlock } from '../api/roadBlocks';

const DISMISSED_KEY = 'roadBlockDismissedId';

export default function RoadBlockPopup() {
    const [roadBlock, setRoadBlock] = useState<RoadBlock | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const active = await fetchActiveRoadBlock();
                if (!active) return;

                const dismissedId = await AsyncStorage.getItem(DISMISSED_KEY);
                if (dismissedId === String(active.id)) return;

                setRoadBlock(active);
                setVisible(true);
            } catch (e) {
                console.warn('RoadBlockPopup: could not load active banner', e);
            }
        })();
    }, []);

    const dismiss = async () => {
        setVisible(false);
        if (roadBlock) await AsyncStorage.setItem(DISMISSED_KEY, String(roadBlock.id));
    };

    const handlePressButton = async () => {
        if (!roadBlock) return;
        const link = roadBlock.button_link;
        await dismiss();
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
