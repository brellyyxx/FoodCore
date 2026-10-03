import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

// Speicher-Key für AsyncStorage
const STORAGE_KEY = '@food_list_data';

// Standard-Daten falls noch nichts gespeichert ist
const INITIAL_FOOD_ITEMS = [
  { id: '1', name: 'Hafermilch', isMissing: false },
  { id: '2', name: 'Vegane Steaks', isMissing: false },
  { id: '3', name: 'Kania Vegane Mayo', isMissing: false },
];

const Tab = createBottomTabNavigator();

// --- SCREENS ---

function HomeScreen({ foodList, newItemName, setNewItemName, addItem, toggleMissingStatus, deleteItem }) {
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mein Essen</Text>
          <Text style={styles.headerSubtitle}>Alles was ich esse</Text>
        </View>

        {/* Eingabebereich für neue Lebensmittel */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Neues Lebensmittel eintragen..."
            placeholderTextColor="#777777"
            value={newItemName}
            onChangeText={setNewItemName}
            keyboardAppearance="dark"
          />
          <TouchableOpacity style={styles.addButton} onPress={addItem} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={foodList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, item.isMissing && styles.cardMissing]}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => toggleMissingStatus(item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.itemTitle}>{item.name}</Text>
              </TouchableOpacity>

              <View style={styles.cardRight}>
                <TouchableOpacity 
                  onPress={() => toggleMissingStatus(item.id)}
                  style={[styles.statusBadge, item.isMissing ? styles.badgeMissing : styles.badgeOk]}
                >
                  <Text style={styles.badgeText}>
                    {item.isMissing ? 'Fehlt' : 'Vorrat da'}
                  </Text>
                </TouchableOpacity>

                {/* Löschen-Button */}
                <TouchableOpacity 
                  onPress={() => deleteItem(item.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#888888" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ShoppingListScreen({ foodList, toggleMissingStatus }) {
  const missingItems = foodList.filter((item) => item.isMissing);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Einkaufsliste</Text>
        <Text style={styles.headerSubtitle}>Was beim nächsten Mal mit muss</Text>
      </View>

      {missingItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#4ade80" />
          <Text style={styles.emptyText}>Alles da! Nichts fehlt gerade.</Text>
        </View>
      ) : (
        <FlatList
          data={missingItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardShopping}
              onPress={() => toggleMissingStatus(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.itemTitleShopping}>{item.name}</Text>
              <View style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Gekauft ✓</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

function SettingsScreen({ exportData, importData }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Einstellungen</Text>
        <Text style={styles.headerSubtitle}>Backup & Datenverwaltung</Text>
      </View>

      <View style={styles.settingsContainer}>
        <TouchableOpacity style={styles.settingsButton} onPress={exportData} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={22} color="#ffffff" style={{ marginRight: 12 }} />
          <View>
            <Text style={styles.settingsButtonText}>Liste exportieren</Text>
            <Text style={styles.settingsButtonSub}>Als Backup-Datei speichern / teilen</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsButton} onPress={importData} activeOpacity={0.8}>
          <Ionicons name="cloud-download-outline" size={22} color="#ffffff" style={{ marginRight: 12 }} />
          <View>
            <Text style={styles.settingsButtonText}>Liste importieren</Text>
            <Text style={styles.settingsButtonSub}>Vorrat aus Backup-Datei laden</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- HAUPTKOMPONENTE ---

export default function App() {
  const [foodList, setFoodList] = useState(INITIAL_FOOD_ITEMS);
  const [newItemName, setNewItemName] = useState('');

  // 1. Beim Start gespeicherte Daten laden
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData !== null) {
        setFoodList(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    }
  };

  // 2. Funktion zum Speichern (wird bei jeder Änderung aufgerufen)
  const saveData = async (newList) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (error) {
      console.error('Fehler beim Speichern der Daten:', error);
    }
  };

  // Status umschalten: Fehlt es oder ist es da?
  const toggleMissingStatus = (id) => {
    const updatedList = foodList.map((item) =>
      item.id === id ? { ...item, isMissing: !item.isMissing } : item
    );
    setFoodList(updatedList);
    saveData(updatedList);
  };

  // Neues Lebensmittel hinzufügen
  const addItem = () => {
    if (newItemName.trim() === '') return;

    const newItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      isMissing: false,
    };

    const updatedList = [newItem, ...foodList];
    setFoodList(updatedList);
    saveData(updatedList);
    setNewItemName('');
  };

  // Lebensmittel komplett löschen
  const deleteItem = (id) => {
    const updatedList = foodList.filter((item) => item.id !== id);
    setFoodList(updatedList);
    saveData(updatedList);
  };

  // 3. Export-Funktion
  const exportData = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'foodcore_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(foodList, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Fehler', 'Teilen ist auf diesem Gerät nicht verfügbar.');
      }
    } catch (error) {
      console.error('Export-Fehler:', error);
      Alert.alert('Fehler', 'Exportieren fehlgeschlagen.');
    }
  };

  // 4. Import-Funktion über Dateiauswahl
  const importData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const parsedData = JSON.parse(fileContent);

        if (Array.isArray(parsedData)) {
          setFoodList(parsedData);
          saveData(parsedData);
          Alert.alert('Erfolg', 'Die Liste wurde erfolgreich importiert!');
        } else {
          Alert.alert('Fehler', 'Die Datei hat ein ungültiges Format.');
        }
      }
    } catch (error) {
      console.error('Import-Fehler:', error);
      Alert.alert('Fehler', 'Importieren fehlgeschlagen.');
    }
  };

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1e1e1e',
            borderTopColor: '#2d2d2d',
            height: 75,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#888888',
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Mein Vorrat') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Einkaufsliste') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (route.name === 'Einstellungen') {
              iconName = focused ? 'settings' : 'settings-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Mein Vorrat">
          {() => (
            <HomeScreen
              foodList={foodList}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              addItem={addItem}
              toggleMissingStatus={toggleMissingStatus}
              deleteItem={deleteItem}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Einkaufsliste">
          {() => (
            <ShoppingListScreen
              foodList={foodList}
              toggleMissingStatus={toggleMissingStatus}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Einstellungen">
          {() => (
            <SettingsScreen
              exportData={exportData}
              importData={importData}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaaaaa',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    height: 48,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
    borderRadius: 12,
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 6,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  cardMissing: {
    borderColor: '#f87171',
    backgroundColor: '#2a1a1a',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  badgeOk: {
    backgroundColor: '#064e3b',
  },
  badgeMissing: {
    backgroundColor: '#7f1d1d',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  cardShopping: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  itemTitleShopping: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#888888',
    fontSize: 16,
    marginTop: 12,
  },
  settingsContainer: {
    padding: 16,
  },
  settingsButton: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButtonSub: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
});