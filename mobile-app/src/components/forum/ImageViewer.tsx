import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface ImageViewerProps {
  source: { uri: string };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  source,
  style,
  resizeMode = 'cover',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const handleImageLoad = (event: any) => {
    setLoading(false);
    const { width, height } = event.nativeEvent.source;
    setImageDimensions({ width, height });
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="image-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={() => setShowFullscreen(true)}
        activeOpacity={0.9}
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
        <Image
          source={source}
          style={[
            styles.image,
            { opacity: loading ? 0 : 1 },
          ]}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </TouchableOpacity>

      <Modal
        visible={showFullscreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullscreen(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setShowFullscreen(false)}
            activeOpacity={1}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFullscreen(false)}
              >
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
            </View>
            
            <Image
              source={source}
              style={[
                styles.fullscreenImage,
                {
                  width: screenWidth,
                  height: imageDimensions.height
                    ? (screenWidth * imageDimensions.height) / imageDimensions.width
                    : screenHeight * 0.8,
                },
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 200,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  errorText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  closeButton: {
    padding: 10,
  },
  fullscreenImage: {
    maxHeight: '90%',
  },
});