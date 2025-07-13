import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface MediaUploadButtonProps {
  onMediaSelected: (uri: string, type: 'image' | 'video', fileName: string) => void;
  disabled?: boolean;
}

export const MediaUploadButton: React.FC<MediaUploadButtonProps> = ({
  onMediaSelected,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected(asset.uri, 'image', asset.fileName || 'image.jpg');
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected(asset.uri, 'video', asset.fileName || 'video.mp4');
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onMediaSelected(asset.uri, 'image', asset.fileName || 'photo.jpg');
    }
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Add Media',
      'Choose how to add media to your post',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose Photo', onPress: pickImage },
        { text: 'Choose Video', onPress: pickVideo },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={showMediaOptions}
      disabled={disabled || uploading}
    >
      {uploading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <>
          <Ionicons name="attach-outline" size={24} color={Colors.primary} />
          <Text style={styles.buttonText}>Add Media</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
});