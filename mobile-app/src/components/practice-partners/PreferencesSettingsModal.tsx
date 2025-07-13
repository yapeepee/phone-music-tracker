import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../../constants/colors';
import { practicePartnerService } from '../../services/practice-partner.service';
import {
  UserPracticePreferences,
  UserPracticePreferencesUpdate,
  CommunicationPreference,
  SkillLevel,
} from '../../types/practicePartner';

interface PreferencesSettingsModalProps {
  onClose: () => void;
}

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese',
  'Japanese',
  'Korean',
];

export const PreferencesSettingsModal: React.FC<PreferencesSettingsModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPracticePreferences | null>(null);
  
  // Form state
  const [isAvailable, setIsAvailable] = useState(false);
  const [communication, setCommunication] = useState<CommunicationPreference>(
    CommunicationPreference.IN_APP
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel | ''>('');
  const [practiceGoals, setPracticeGoals] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [maxPartners, setMaxPartners] = useState(5);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await practicePartnerService.getPracticePreferences();
      setPreferences(prefs);
      
      // Set form values from loaded preferences
      setIsAvailable(prefs.is_available_for_partners);
      setCommunication(prefs.preferred_communication);
      setSkillLevel(prefs.skill_level || '');
      setPracticeGoals(prefs.practice_goals || '');
      setSelectedLanguages(prefs.languages);
      setMaxPartners(prefs.max_partners);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const update: UserPracticePreferencesUpdate = {
        is_available_for_partners: isAvailable,
        preferred_communication: communication,
        skill_level: skillLevel || undefined,
        practice_goals: practiceGoals || undefined,
        languages: selectedLanguages,
        max_partners: maxPartners,
      };
      
      await practicePartnerService.updatePracticePreferences(update);
      Alert.alert('Success', 'Preferences updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(language)) {
        // Don't allow removing all languages
        if (prev.length === 1) {
          Alert.alert('Info', 'You must select at least one language');
          return prev;
        }
        return prev.filter(l => l !== language);
      } else {
        return [...prev, language];
      }
    });
  };

  const incrementPartners = () => {
    if (maxPartners < 20) {
      setMaxPartners(prev => prev + 1);
    }
  };

  const decrementPartners = () => {
    if (maxPartners > 1) {
      setMaxPartners(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Available for Practice Partners</Text>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.surface}
          />
        </View>
        <Text style={styles.hint}>
          When enabled, other users can discover you as a potential practice partner
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Communication</Text>
        <Text style={styles.label}>Preferred Communication Method</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={communication}
            onValueChange={(value) => setCommunication(value)}
            style={styles.picker}
          >
            <Picker.Item label="In-App Messaging" value={CommunicationPreference.IN_APP} />
            <Picker.Item label="Email" value={CommunicationPreference.EMAIL} />
            <Picker.Item label="Video Call" value={CommunicationPreference.VIDEO_CALL} />
          </Picker>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skill Level</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={skillLevel}
            onValueChange={(value) => setSkillLevel(value)}
            style={styles.picker}
          >
            <Picker.Item label="Not Specified" value="" />
            <Picker.Item label="Beginner" value={SkillLevel.BEGINNER} />
            <Picker.Item label="Intermediate" value={SkillLevel.INTERMEDIATE} />
            <Picker.Item label="Advanced" value={SkillLevel.ADVANCED} />
            <Picker.Item label="Professional" value={SkillLevel.PROFESSIONAL} />
          </Picker>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Practice Goals</Text>
        <TextInput
          style={styles.textArea}
          value={practiceGoals}
          onChangeText={setPracticeGoals}
          placeholder="Describe your practice goals and what you're looking for in a partner..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Languages</Text>
        <View style={styles.languageGrid}>
          {LANGUAGES.map(language => (
            <TouchableOpacity
              key={language}
              style={[
                styles.languageChip,
                selectedLanguages.includes(language) && styles.languageChipSelected
              ]}
              onPress={() => toggleLanguage(language)}
            >
              <Text style={[
                styles.languageChipText,
                selectedLanguages.includes(language) && styles.languageChipTextSelected
              ]}>
                {language}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Maximum Partners</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={decrementPartners}
            disabled={maxPartners <= 1}
          >
            <Ionicons 
              name="remove-circle-outline" 
              size={32} 
              color={maxPartners <= 1 ? Colors.border : Colors.primary} 
            />
          </TouchableOpacity>
          <Text style={styles.counterValue}>{maxPartners}</Text>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={incrementPartners}
            disabled={maxPartners >= 20}
          >
            <Ionicons 
              name="add-circle-outline" 
              size={32} 
              color={maxPartners >= 20 ? Colors.border : Colors.primary} 
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Maximum number of active practice partners at one time
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    minHeight: 100,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  languageChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  languageChipText: {
    fontSize: 14,
    color: Colors.text,
  },
  languageChipTextSelected: {
    color: Colors.surface,
    fontWeight: '600',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  counterButton: {
    padding: 4,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});