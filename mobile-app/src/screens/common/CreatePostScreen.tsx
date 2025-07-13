import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { forumService } from '../../services/forum.service';
import { forumMediaService } from '../../services/forum-media.service';
import { TagPicker } from '../../components/tags/TagPicker';
import { TagChip } from '../../components/tags/TagChip';
import { PiecePicker } from '../../components/forum/PiecePicker';
import { useAppSelector } from '../../hooks/redux';
import { Tag } from '../../types/practice';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { tagService } from '../../services/tag.service';

type CreatePostRouteProp = RouteProp<any, 'CreatePost'>;

export const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreatePostRouteProp>();
  const user = useAppSelector((state) => state.auth.user);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(route.params?.initialContent || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showPiecePicker, setShowPiecePicker] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<{uri: string, type: string}[]>([]);
  const [loadingPiece, setLoadingPiece] = useState(false);

  // Pre-populate related piece if provided
  useEffect(() => {
    if (route.params?.relatedPieceId) {
      loadRelatedPiece(route.params.relatedPieceId);
    }
  }, [route.params?.relatedPieceId]);

  const loadRelatedPiece = async (pieceId: string) => {
    setLoadingPiece(true);
    try {
      const pieces = await tagService.getPieceTags();
      const piece = pieces.find(p => p.id === pieceId);
      if (piece) {
        setSelectedPiece(piece);
        // Pre-populate title with piece name if title is empty
        if (!title && route.params?.relatedPieceName) {
          setTitle(`Question about ${route.params.relatedPieceName}`);
        }
      }
    } catch (error) {
      console.error('Failed to load related piece:', error);
    } finally {
      setLoadingPiece(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter content');
      return;
    }

    setLoading(true);
    try {
      const post = await forumService.createPost({
        title: title.trim(),
        content: content.trim(),
        tags: selectedTags,
        related_piece_id: selectedPiece?.id,
      });
      
      // Upload media files if any
      if (pendingUploads.length > 0) {
        await uploadMediaFiles(post.id);
      }
      
      Alert.alert('Success', 'Post created successfully', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
            // Navigate to the newly created post
            navigation.navigate('PostDetail' as any, { postId: post.id });
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTagSelect = (tagNames: string[]) => {
    setSelectedTags(tagNames);
    setShowTagPicker(false);
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleMediaPicker = async (type: 'image' | 'video') => {
    try {
      let result;
      
      if (type === 'image') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant access to your photo library');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant access to your photo library');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
        });
      }
      
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPendingUploads(prev => [...prev, { uri: asset.uri, type: asset.type || type }]);
      }
    } catch (error) {
      console.error('Media picker error:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const uploadMediaFiles = async (postId: string) => {
    if (pendingUploads.length === 0) return;
    
    setUploadingMedia(true);
    const mediaMarkdown: string[] = [];
    
    try {
      for (const media of pendingUploads) {
        const mimeType = media.type === 'image' ? 'image/jpeg' : 'video/mp4';
        const uploadResult = await forumMediaService.uploadMedia(
          'post',
          postId,
          media.uri,
          mimeType
        );
        
        // Generate markdown for the uploaded media
        mediaMarkdown.push(forumMediaService.generateMediaMarkdown(uploadResult));
      }
      
      // Update post content with media markdown
      if (mediaMarkdown.length > 0) {
        const updatedContent = content + '\n\n' + mediaMarkdown.join('\n');
        await forumService.updatePost(postId, { content: updatedContent });
      }
    } catch (error) {
      console.error('Media upload error:', error);
      Alert.alert('Warning', 'Post created but some media failed to upload');
    } finally {
      setUploadingMedia(false);
    }
  };

  const removePendingUpload = (index: number) => {
    setPendingUploads(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={loading || !title.trim() || !content.trim()}
          >
            <Text style={[
              styles.postButton,
              (!title.trim() || !content.trim() || loading) && styles.postButtonDisabled
            ]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title"
              placeholderTextColor={Colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.contentInput}
              placeholder="What's your question or discussion topic?"
              placeholderTextColor={Colors.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpText}>
                Supports Markdown formatting:{'\n'}
                • **Bold** and *italic* text{'\n'}
                • Images: ![alt text](image-url){'\n'}
                • Videos: [video](video-url){'\n'}
                • Code blocks with ```
              </Text>
            </View>
            
            <View style={styles.mediaToolbar}>
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => handleMediaPicker('image')}
                disabled={uploadingMedia}
              >
                <Ionicons name="image-outline" size={24} color={Colors.primary} />
                <Text style={styles.mediaButtonText}>Image</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => handleMediaPicker('video')}
                disabled={uploadingMedia}
              >
                <Ionicons name="videocam-outline" size={24} color={Colors.primary} />
                <Text style={styles.mediaButtonText}>Video</Text>
              </TouchableOpacity>
            </View>
            
            {pendingUploads.length > 0 && (
              <View style={styles.pendingUploads}>
                <Text style={styles.pendingUploadsTitle}>Attachments ({pendingUploads.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {pendingUploads.map((media, index) => (
                    <View key={index} style={styles.pendingUploadItem}>
                      {media.type === 'image' ? (
                        <Image source={{ uri: media.uri }} style={styles.pendingUploadImage} />
                      ) : (
                        <View style={styles.pendingUploadVideo}>
                          <Ionicons name="videocam" size={24} color={Colors.textSecondary} />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeUploadButton}
                        onPress={() => removePendingUpload(index)}
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.pieceSection}>
            <View style={styles.pieceSectionHeader}>
              <Text style={styles.pieceSectionTitle}>Related Piece (Optional)</Text>
              <TouchableOpacity onPress={() => setShowPiecePicker(true)}>
                <Text style={styles.selectPieceButton}>Select Piece</Text>
              </TouchableOpacity>
            </View>

            {selectedPiece && (
              <View style={styles.selectedPieceContainer}>
                <View style={styles.selectedPiece}>
                  <View style={styles.pieceInfo}>
                    <Text style={styles.pieceName} numberOfLines={1}>
                      {selectedPiece.name}
                    </Text>
                    {selectedPiece.composer && (
                      <Text style={styles.pieceComposer} numberOfLines={1}>
                        {selectedPiece.composer}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setSelectedPiece(null)}>
                    <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.tagSection}>
            <View style={styles.tagSectionHeader}>
              <Text style={styles.tagSectionTitle}>Tags (Optional)</Text>
              <TouchableOpacity onPress={() => setShowTagPicker(true)}>
                <Text style={styles.addTagButton}>Add Tags</Text>
              </TouchableOpacity>
            </View>

            {selectedTags.length > 0 && (
              <View style={styles.selectedTags}>
                {selectedTags.map((tag) => (
                  <TouchableOpacity key={tag} onPress={() => removeTag(tag)}>
                    <View style={styles.tagWithRemove}>
                      <TagChip name={tag} />
                      <Ionicons 
                        name="close-circle" 
                        size={16} 
                        color={Colors.textSecondary} 
                        style={styles.removeTagIcon}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.guidelines}>
            <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
            <Text style={styles.guidelinesText}>
              • Be respectful and constructive{'\n'}
              • Stay on topic{'\n'}
              • No spam or self-promotion{'\n'}
              • Use descriptive titles{'\n'}
              • Search before posting duplicates
            </Text>
          </View>
        </ScrollView>

        {showTagPicker && (
          <TagPicker
            selectedTags={selectedTags}
            onSelect={handleTagSelect}
            onClose={() => setShowTagPicker(false)}
            multiple
          />
        )}

        {showPiecePicker && (
          <PiecePicker
            visible={showPiecePicker}
            onClose={() => setShowPiecePicker(false)}
            onSelectPiece={setSelectedPiece}
            selectedPiece={selectedPiece}
          />
        )}
        
        {uploadingMedia && (
          <View style={styles.uploadingOverlay}>
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.uploadingText}>Uploading media...</Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  postButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  postButtonDisabled: {
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  inputGroup: {
    backgroundColor: Colors.card,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    paddingVertical: 16,
  },
  contentInput: {
    fontSize: 16,
    color: Colors.text,
    minHeight: 200,
    paddingVertical: 16,
    lineHeight: 24,
  },
  helpTextContainer: {
    paddingBottom: 12,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tagSection: {
    backgroundColor: Colors.card,
    padding: 16,
    marginBottom: 8,
  },
  tagSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  addTagButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagWithRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  removeTagIcon: {
    marginLeft: -8,
  },
  pieceSection: {
    backgroundColor: Colors.card,
    padding: 16,
    marginBottom: 8,
  },
  pieceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pieceSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  selectPieceButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  selectedPieceContainer: {
    marginTop: 8,
  },
  selectedPiece: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  pieceInfo: {
    flex: 1,
    marginRight: 8,
  },
  pieceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  pieceComposer: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  guidelines: {
    backgroundColor: Colors.card,
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  mediaToolbar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
  },
  mediaButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  pendingUploads: {
    paddingBottom: 16,
  },
  pendingUploadsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  pendingUploadItem: {
    marginRight: 12,
    position: 'relative',
  },
  pendingUploadImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  pendingUploadVideo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeUploadButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text,
  },
});