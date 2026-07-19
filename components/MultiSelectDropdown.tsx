import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

export default function MultiSelectDropdown({ label, options, selected, onChange, placeholder }: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (items: string[]) => void;
    placeholder: string;
}) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [open, setOpen] = useState(false);
    const [temp, setTemp] = useState<string[]>([]);
    const insets = useSafeAreaInsets();

    const handleOpen = () => {
        setTemp([...selected]);
        setOpen(true);
    };

    const toggle = (item: string) => {
        setTemp(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    const handleConfirm = () => {
        onChange(temp);
        setOpen(false);
    };

    const removeOne = (item: string) => {
        onChange(selected.filter(i => i !== item));
    };

    return (
        <>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity style={styles.dropdownBtn} onPress={handleOpen} activeOpacity={0.8}>
                <Text style={selected.length > 0 ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
                    {selected.length > 0 ? `${selected.length} selected` : placeholder}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {selected.length > 0 && (
                <View style={styles.chipsRow}>
                    {selected.map(item => (
                        <View key={item} style={styles.chip}>
                            <Text style={styles.chipText}>{item}</Text>
                            <TouchableOpacity onPress={() => removeOne(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Ionicons name="close" size={12} color={colors.brand} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <Ionicons name="close" size={22} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={item => item}
                            style={{ maxHeight: hp('50%') }}
                            ListHeaderComponent={() => {
                                const allChecked = options.length > 0 && temp.length === options.length;
                                return (
                                    <TouchableOpacity
                                        style={styles.optionRow}
                                        onPress={() => setTemp(allChecked ? [] : [...options])}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.checkbox, allChecked && styles.checkboxChecked]}>
                                            {allChecked && <Ionicons name="checkmark" size={13} color="#fff" />}
                                        </View>
                                        <Text style={[styles.optionText, styles.optionTextChecked]}>Select All</Text>
                                    </TouchableOpacity>
                                );
                            }}
                            renderItem={({ item }) => {
                                const checked = temp.includes(item);
                                return (
                                    <TouchableOpacity
                                        style={styles.optionRow}
                                        onPress={() => toggle(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                            {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                                        </View>
                                        <Text style={[styles.optionText, checked && styles.optionTextChecked]}>{item}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        <View style={[styles.modalFooter, { paddingBottom: hp('1.5%') + Math.max(insets.bottom, hp('1.5%')) }]}>
                            <TouchableOpacity style={styles.clearBtn} onPress={() => setTemp([])}>
                                <Text style={styles.clearBtnText}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                                <Text style={styles.confirmBtnText}>Confirm ({temp.length})</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    label: {
        fontSize: 11, fontWeight: '800', color: colors.brand,
        textTransform: 'uppercase', letterSpacing: 0.6,
        marginBottom: 8, marginTop: hp('2%'),
    },
    dropdownBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface, borderRadius: 14,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: wp('4%'), paddingVertical: hp('1.8%'),
    },
    dropdownValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '500', flex: 1 },
    dropdownPlaceholder: { fontSize: 14, color: colors.textMuted, flex: 1 },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: colors.surfaceMuted, borderRadius: 20,
        paddingVertical: 5, paddingHorizontal: 10,
    },
    chipText: { fontSize: 12, color: colors.brand, fontWeight: '600' },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 8, maxHeight: hp('75%'),
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: wp('5%'), paddingVertical: hp('1.8%'),
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: hp('1.5%'), paddingHorizontal: wp('5%'),
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
    optionText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
    optionTextChecked: { color: colors.textPrimary, fontWeight: '600' },
    modalFooter: {
        flexDirection: 'row', gap: 12,
        padding: wp('4%'), borderTopWidth: 1, borderTopColor: colors.divider,
    },
    clearBtn: {
        flex: 1, paddingVertical: hp('1.5%'), borderRadius: 14,
        borderWidth: 1.5, borderColor: colors.border,
        alignItems: 'center',
    },
    clearBtnText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
    confirmBtn: {
        flex: 2, paddingVertical: hp('1.5%'), borderRadius: 14,
        backgroundColor: colors.brand, alignItems: 'center',
    },
    confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
