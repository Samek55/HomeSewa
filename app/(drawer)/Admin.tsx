import { auth } from "@/src/firebase/firebaseConfig";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

export default function Admin() {
  useFocusEffect(
    useCallback(() => {
      if (auth.currentUser) {
        router.replace("/admin/BookingHistory");
      } else {
        router.replace("/admin/AdminLogin");
      }
    }, [])
  );

  return null;
}