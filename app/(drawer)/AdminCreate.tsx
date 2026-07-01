import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Text,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";

import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../../src/firebase/firebaseConfig";
import { router } from "expo-router";
import Header4 from "@/components/Header4Admin";

type Role = "admin" | "career" | "user";

const AIRTABLE_API_URL = process.env.EXPO_PUBLIC_AIRTABLE_API_URL_CAREER;
const SERVICES_URL = process.env.EXPO_PUBLIC_AIRTABLE_API_URL_SERVICES;
const AIRTABLE_TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN;

let servicesCache: Record<string, string> | null = null;
let servicesPromise: Promise<Record<string, string>> | null = null;

const fetchServicesMap = async () => {
  try {
    if (servicesCache) return servicesCache;
    if (servicesPromise) return servicesPromise;

    servicesPromise = (async () => {
      const res = await fetch(SERVICES_URL!, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        },
      });

      const data = await res.json();
      const map: Record<string, string> = {};

      data.records?.forEach((item: any) => {
        const id = item.id;
        const name = item.fields?.["Name"];
        if (id && name) {
          map[id] = name;
        }
      });

      servicesCache = map;
      return map;
    })();

    return await servicesPromise;
  } catch (error) {
    console.log("Services fetch error:", error);
    return {};
  }
};

export default function CreateUser() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("admin");

  const fetchCareerData = async (cleanPhone: string) => {
    try {
      if (!AIRTABLE_API_URL || !AIRTABLE_TOKEN) {
        throw new Error("Airtable environment variables are missing.");
      }

      const formula = encodeURIComponent(`{Phone} = '${cleanPhone}'`);
      const url = `${AIRTABLE_API_URL}?filterByFormula=${formula}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Airtable Server Error (${response.status}):`, errText);
        throw new Error(`Airtable error status: ${response.status}`);
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        return data.records[0].fields;
      }
      return null;
    } catch (error) {
      console.error("Airtable fetch error:", error);
      throw new Error("Failed to verify user status in the Career database.");
    }
  };

  const createUser = async () => {
    try {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
      const cleanPin = pin.replace(/[^0-9]/g, "");

      if (cleanPhone.length !== 10) {
        Alert.alert("Error", "Phone number must be exactly 10 digits");
        return;
      }

      if (cleanPin.length !== 6) {
        Alert.alert("Error", "PIN must be exactly 6 digits");
        return;
      }

      let localizedServiceNames: string[] = [];
      let preferredAreaValues: string[] = [];

      // 🔍 STRICT CHECK: Only check Airtable if role is exactly "career"
      if (selectedRole === "career") {
        const careerRecord = await fetchCareerData(cleanPhone);

        if (!careerRecord) {
          Alert.alert("Access Denied", "Please fill up the career form first.");
          return;
        }

        const servicesMap = await fetchServicesMap();

        const expertiseIds: string[] = Array.isArray(careerRecord["Area of Expertise"])
          ? careerRecord["Area of Expertise"]
          : careerRecord["Area of Expertise"]
            ? [careerRecord["Area of Expertise"]]
            : [];

        preferredAreaValues = Array.isArray(careerRecord["Preferred Working Area"])
          ? careerRecord["Preferred Working Area"]
          : careerRecord["Preferred Working Area"]
            ? [careerRecord["Preferred Working Area"]]
            : [];

        localizedServiceNames = expertiseIds
          .map((id) => servicesMap[id] || id)
          .filter(Boolean);
      }

      // 🔐 Firebase Setup
      const email = `${cleanPhone}@homesewa.app`;

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        cleanPin
      );

      const user = userCredential.user;

      // 🔥 Conditional OneSignal Registration
      try {
        const { OneSignal } = require("react-native-onesignal");
        OneSignal.login(user.uid);

        // ✅ Conditional logic for OneSignal tracking segment tags
        if (selectedRole === "user") {
          OneSignal.User.addTags({
            phone: cleanPhone,
            role: "user",
          });
        } else if (selectedRole === "admin") {
          OneSignal.User.addTags({
            phone: cleanPhone,
            role: "admin",
          });
        } else if (selectedRole === "career") {
          OneSignal.User.addTags({
            role: "career",
            services: localizedServiceNames.join(","),
            area: preferredAreaValues.join(","),
          });
        }
      } catch (e) {
        console.warn("OneSignal tag setup error:", e);
      }

      Alert.alert("Success", `${selectedRole} created successfully`);

      setPhoneNumber("");
      setPin("");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      try {
        const { OneSignal } = require("react-native-onesignal");
        OneSignal.logout();
      } catch (e) {
        console.warn("OneSignal logout error:", e);
      }
      Alert.alert("Logged Out", "You have been logged out.", [
        {
          text: "OK",
          onPress: () => router.replace("/admin/AdminLogin"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Logout Error", error.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Header4 />
      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1 }}
        onPress={Keyboard.dismiss}
      >
        <View style={styles.container}>
          <View style={styles.box}>

            {/* PHONE */}
            <TextInput
              placeholder="Phone Number (10 digits)"
              value={phoneNumber}
              keyboardType="number-pad"
              onChangeText={(v) => {
                const cleaned = v.replace(/[^0-9]/g, "");
                setPhoneNumber(cleaned.slice(0, 10));
              }}
              style={styles.input}
            />

            {/* PIN */}
            <TextInput
              placeholder="PIN (6 digits)"
              value={pin}
              secureTextEntry
              keyboardType="number-pad"
              onChangeText={(v) => {
                const cleaned = v.replace(/[^0-9]/g, "");
                setPin(cleaned.slice(0, 6));
              }}
              style={styles.input}
            />

            {/* ROLE SELECT */}
            <View style={styles.roleRow}>
              {(["admin", "career", "user"] as Role[]).map((role) => {
                const isActive = selectedRole === role;
                return (
                  <TouchableOpacity
                    key={role}
                    onPress={() => setSelectedRole(role)}
                    style={[
                      styles.roleButton,
                      isActive ? styles.activeRoleButton : styles.inactiveRoleButton
                    ]}
                  >
                    <Text style={[styles.roleText, isActive && styles.activeRoleText]}>
                      {role.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ACTIONS */}
            <Button title={`Create ${selectedRole}`} onPress={createUser} color="green" />
            <Button title="Logout" onPress={handleLogout} color="red" />
          </View>
        </View>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  box: {
    width: "85%",
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    gap: 6,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  activeRoleButton: {
    backgroundColor: "green",
    borderColor: "green",
  },
  inactiveRoleButton: {
    backgroundColor: "#e0e0e0",
    borderColor: "#ccc",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  activeRoleText: {
    color: "#fff",
  },
});