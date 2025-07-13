import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Colors } from '../../constants/colors';
import { ImageViewer } from './ImageViewer';
import { ForumVideoPlayer } from './ForumVideoPlayer';

interface MarkdownRendererProps {
  content: string;
  style?: any;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  style,
}) => {
  // Regular expressions for media detection
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const videoRegex = /\[video\]\(([^)]+)\)/g;
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;

  // Parse content to detect and replace media
  const parseContent = (text: string) => {
    // First, handle video embeds
    let parsedText = text.replace(videoRegex, (match, url) => {
      return `[VIDEO_EMBED:${url}]`;
    });

    // Handle YouTube links
    parsedText = parsedText.replace(youtubeRegex, (match, videoId) => {
      return `[YOUTUBE_EMBED:${videoId}]`;
    });

    return parsedText;
  };

  const handleLinkPress = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    });
  };

  const renderRules = {
    // Custom image renderer
    image: (node: any, children: any, parent: any, styles: any) => {
      return (
        <ImageViewer
          key={node.key}
          source={{ uri: node.attributes.src }}
          style={markdownStyles.image}
        />
      );
    },
    
    // Custom text renderer to handle video embeds - TEMPORARILY DISABLED
    /*text: (node: any, children: any, parent: any, styles: any) => {
      const text = node.content;
      
      // Check for video embed
      const videoMatch = text.match(/\[VIDEO_EMBED:([^\]]+)\]/);
      if (videoMatch) {
        const videoUrl = videoMatch[1];
        return (
          <ForumVideoPlayer
            key={node.key}
            source={{ uri: videoUrl }}
            style={markdownStyles.video}
          />
        );
      }
      
      // Check for YouTube embed
      const youtubeMatch = text.match(/\[YOUTUBE_EMBED:([^\]]+)\]/);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        return (
          <View key={node.key} style={markdownStyles.youtubeContainer}>
            <ImageViewer
              source={{ uri: thumbnailUrl }}
              style={markdownStyles.youtubeThumbnail}
            />
            <View style={markdownStyles.youtubeOverlay}>
              <Text style={markdownStyles.youtubeText}>
                YouTube video: {videoId}
              </Text>
              <Text style={markdownStyles.youtubeSubtext}>
                Open in YouTube app to watch
              </Text>
            </View>
          </View>
        );
      }
      
      return (
        <Text key={node.key} style={markdownStyles.body}>
          {children}
        </Text>
      );
    },*/
    
    // Custom link renderer
    link: (node: any, children: any, parent: any, styles: any) => {
      return (
        <Text
          key={node.key}
          style={markdownStyles.link}
          onPress={() => handleLinkPress(node.attributes.href)}
        >
          {children}
        </Text>
      );
    },
  };

  // const parsedContent = parseContent(content);

  return (
    <View style={[styles.container, style]}>
      <Markdown
        style={markdownStyles}
        rules={renderRules}
      >
        {content}
      </Markdown>
    </View>
  );
};

const markdownStyles = StyleSheet.create({
  // Container styles
  body: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  
  // Text styles
  paragraph: {
    marginBottom: 10,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
    color: Colors.text,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
    color: Colors.text,
  },
  heading3: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 6,
    color: Colors.text,
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  
  // Code styles
  code_inline: {
    backgroundColor: Colors.surface,
    color: Colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: 'monospace',
  },
  fence: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  
  // List styles
  list_item: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bullet_list: {
    marginVertical: 5,
  },
  ordered_list: {
    marginVertical: 5,
  },
  
  // Link styles
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  
  // Quote styles
  blockquote: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  
  // Media styles
  image: {
    marginVertical: 8,
    borderRadius: 8,
  },
  video: {
    marginVertical: 8,
  },
  youtubeContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  youtubeThumbnail: {
    height: 200,
  },
  youtubeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
  },
  youtubeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  youtubeSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  
  // Table styles
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: Colors.surface,
  },
  tbody: {},
  th: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    fontWeight: 'bold',
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  td: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  
  // Horizontal rule
  hr: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    // Don't use flex: 1 as it can cause content to not show
  },
});