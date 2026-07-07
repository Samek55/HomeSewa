import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

export default function Admin() {
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('adminPhone').then((phone) => {
        if (phone) {
          router.replace("/admin/BookingHistory");
        } else {
          router.replace("/admin/AdminLogin");
        }
      });
    }, [])
  );

  return null;
}