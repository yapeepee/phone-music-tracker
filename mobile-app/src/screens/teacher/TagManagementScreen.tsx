import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Tag } from '../../types/practice';
import { tagService, PopularTag } from '../../services/tag.service';
import { TagChip } from '../../components/tags/TagChip';
import { Button } from '../../components/common/Button';
import { useNavigation } from '@react-navigation/native';
import { TeacherNavigatorScreenProps } from '../../navigation/types';

type TagManagementScreenProps = TeacherNavigatorScreenProps<'TagManagement'>;

export const TagManagementScreen: React.FC = () => {
  const navigation = useNavigation<TagManagementScreenProps['navigation']>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showPopular, setShowPopular] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(tags);
    }
  }, [searchQuery, tags]);

  const loadData = async () => {
    try {
      const [tagsData, popularData] = await Promise.all([
        tagService.getTags(),
        tagService.getPopularTags(20),
      ]);
      setTags(tagsData);
      setFilteredTags(tagsData);
      setPopularTags(popularData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load tags');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateTag = () => {
    navigation.navigate('CreateTag');
  };

  const handleEditTag = (tag: Tag) => {
    navigation.navigate('EditTag', { tagId: tag.id });
  };

  const handleDeleteTag = async (tag: Tag) => {
    // First check usage count
    try {
      const { usage_count } = await tagService.getTagUsageCount(tag.id);
      
      if (usage_count > 0) {
        Alert.alert(
          'Cannot Delete',
          `This tag is used in ${usage_count} practice sessions. Remove it from all sessions before deleting.`,
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Delete Tag',
        `Are you sure you want to delete "${tag.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await tagService.deleteTag(tag.id);
                setTags(tags.filter(t => t.id !== tag.id));
                Alert.alert('Success', 'Tag deleted successfully');
              } catch (error) {
                Alert.alert('Error', error.message || 'Failed to delete tag');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to check tag usage');
    }
  };

  const renderTag = ({ item }: { item: Tag }) => {
    const popularTag = popularTags.find(pt => pt.tag.id === item.id);
    const usageCount = popularTag?.usage_count || 0;
    const isCustom = item.owner_teacher_id !== null;

    return (
      <TouchableOpacity
        style={styles.tagItem}
        onPress={() => handleEditTag(item)}
        disabled={!isCustom}
      >
        <View style={styles.tagInfo}>
          <TagChip
            name={item.name}
            color={item.color}
            size="medium"
          />
          <View style={styles.tagMeta}>
            <Text style={styles.usageText}>
              Used {usageCount} {usageCount === 1 ? 'time' : 'times'}
            </Text>
            {isCustom && (
              <Text style={styles.customBadge}>CUSTOM</Text>
            )}
          </View>
        </View>
        
        {isCustom && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => handleEditTag(item)}
              style={styles.actionButton}
            >
              <Ionicons name="pencil" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteTag(item)}
              style={styles.actionButton}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPopularTag = ({ item }: { item: PopularTag }) => (
    <View style={styles.popularTagItem}>
      <TagChip
        name={item.tag.name}
        color={item.tag.color}
        size="small"
      />
      <Text style={styles.popularCount}>{item.usage_count}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tag Management</Text>
        <Button
          title="Create Tag"
          onPress={handleCreateTag}
          size="small"
        />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tags..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, !showPopular && styles.activeToggle]}
          onPress={() => setShowPopular(false)}
        >
          <Text style={[styles.toggleText, !showPopular && styles.activeToggleText]}>
            All Tags ({tags.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, showPopular && styles.activeToggle]}
          onPress={() => setShowPopular(true)}
        >
          <Text style={[styles.toggleText, showPopular && styles.activeToggleText]}>
            Popular Tags
          </Text>
        </TouchableOpacity>
      </View>

      {showPopular ? (
        <FlatList
          key="popular-tags-2-columns"
          data={popularTags}
          keyExtractor={item => item.tag.id}
          renderItem={renderPopularTag}
          contentContainerStyle={styles.popularList}
          numColumns={2}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <FlatList
          key="all-tags-1-column"
          data={filteredTags}
          keyExtractor={item => item.id}
          renderItem={renderTag}
          contentContainerStyle={styles.tagList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No tags found' : 'No tags created yet'}
              </Text>
            </View>
          }
        />
      )}
    </View>
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
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray + '20',
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: Colors.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.gray + '20',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  activeToggle: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagInfo: {
    flex: 1,
  },
  tagMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  usageText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  customBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 12,
  },
  popularList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  popularTagItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: 12,
    margin: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  popularCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});