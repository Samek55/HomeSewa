import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

type Props = {
  visible: boolean;
  status: 'loading' | 'success';
  onClear: () => void;
  onClose: () => void;
};

export default function SubmitOverlay({ visible, status, onClear, onClose }: Props) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      cardScale.setValue(0.85);
      successOpacity.setValue(0);
      successScale.setValue(0.7);
    }
  }, [visible]);

  useEffect(() => {
    if (status === 'success') {
      Animated.parallel([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(successScale, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
          {status === 'loading' ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#111" />
              <Text style={styles.loadingText}>Submitting...</Text>
            </View>
          ) : (
            <Animated.View
              style={[
                styles.successContent,
                { opacity: successOpacity, transform: [{ scale: successScale }] },
              ]}
            >
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Submitted!</Text>
              <Text style={styles.successMessage}>
                Your application has been received successfully.
              </Text>
              <Text style={styles.clearPrompt}>Would you like to clear the form?</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.keepBtn} onPress={onClose}>
                  <Text style={styles.keepBtnText}>Keep</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
                  <Text style={styles.clearBtnText}>Clear Form</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.82,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
    marginTop: 4,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  checkMark: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearPrompt: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  keepBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keepBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  clearBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
